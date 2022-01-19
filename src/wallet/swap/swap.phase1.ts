import { BIP32Interface } from "bip32";
import { HttpClient, MockHttpClient, StateCoin, STATECOIN_STATUS } from "..";
import { StateChainSig } from "../util";
import { pollUtxo, getSwapInfo } from "./info_api";
import { SWAP_STATUS, StatechainID, SwapRetryError, first_message, UI_SWAP_STATUS, SwapPhaseClients, validateStatecoinState } from "./swap";
import { log } from './swap';

let types = require("../types")
let typeforce = require('typeforce');



// Poll Conductor awaiting swap info. When it is available carry out phase1 tasks:
// Return an SCE-Address and produce a signature over the swap_token with the
//  proof key that currently owns the state chain they are transferring in the swap.
export const swapPhase1 = async (
    client: SwapPhaseClients,
    statecoin: StateCoin,
    proof_key_der: BIP32Interface,
    new_proof_key_der: BIP32Interface,
) => {

    validateStatecoinState(statecoin, SWAP_STATUS.Phase1);

    //Check swap id again to confirm that the coin is still awaiting swap
    //according to the server
    let statechain_id: StatechainID = {
        id: statecoin.statechain_id
    };
    let swap_id;
    try {
        swap_id = await pollUtxo(client.http_client, statechain_id);
    } catch (err: any) {
        throw new SwapRetryError(err)
    }

    statecoin.swap_id = swap_id
    if (statecoin.swap_id == null || statecoin.swap_id.id == null) {
        throw new Error("In swap phase 1 - no swap ID found");
    }

    let swap_info
    try {
        swap_info = await getSwapInfo(client.http_client, statecoin.swap_id);
    } catch (err: any) {
        throw new SwapRetryError(err)
    }

    // Drop out of function if swap info not yet available
    if (swap_info === null) {
        return
    }
    log.info("Swap Phase1: Swap ", statecoin.swap_id, " swap info received. Setting coin to IN_SWAP.");

    typeforce(types.SwapInfo, swap_info);
    statecoin.swap_info = swap_info;

    // set coin to STATECHAIN_STATUS.IN_SWAP
    statecoin.setInSwap();

    let address = {
        "tx_backup_addr": null,
        "proof_key": new_proof_key_der.publicKey.toString("hex"),
    };
    typeforce(types.SCEAddress, address);

    let transfer_batch_sig = StateChainSig.new_transfer_batch_sig(proof_key_der, statecoin.swap_id.id, statecoin.statechain_id);
    try {
        let my_bst_data = await first_message(
            client.http_client,
            client.wasm_client,
            swap_info,
            statecoin.statechain_id,
            transfer_batch_sig,
            address,
            proof_key_der
        );

        // Update coin with address, bst data and update status
        statecoin.swap_address = address;
        statecoin.swap_my_bst_data = my_bst_data;
        statecoin.swap_status = SWAP_STATUS.Phase2;
        statecoin.ui_swap_status = UI_SWAP_STATUS.Phase2;
    } catch (err: any) {
        throw new SwapRetryError(err)
    }
}