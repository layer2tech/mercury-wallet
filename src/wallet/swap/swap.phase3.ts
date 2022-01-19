// Poll swap until phase changes to Phase3/4. In that case all carry out transfer_sender

import { BIP32Interface } from "bip32";
import { Network } from "bitcoinjs-lib";
import { HttpClient, MockHttpClient, ElectrumClient, ElectrsClient, EPSClient, MockElectrumClient, StateCoin, Wallet, STATECOIN_STATUS } from "..";
import { delay } from "../mercury/info_api";
import { transferSender } from "../mercury/transfer";
import { pollSwap } from "./info_api";
import { SWAP_STATUS, SwapRetryError, UI_SWAP_STATUS, make_swap_commitment, do_transfer_receiver } from "./swap";
import { log } from './swap';

// and transfer_receiver
export const swapPhase3 = async (
    http_client: HttpClient | MockHttpClient,
    electrum_client: ElectrumClient | ElectrsClient | EPSClient | MockElectrumClient,
    wasm_client: any,
    statecoin: StateCoin,
    network: Network,
    proof_key_der: BIP32Interface,
    new_proof_key_der: BIP32Interface,
    req_confirmations: number,
    block_height: number | null,
    wallet: Wallet
) => {
    // check statecoin is IN_SWAP
    if (statecoin.status !== STATECOIN_STATUS.IN_SWAP) throw Error("Coin status is not IN_SWAP. Status: " + statecoin.status);

    if (statecoin.swap_status !== SWAP_STATUS.Phase3) throw Error("Coin is not in this phase of the swap protocol. In phase: " + statecoin.swap_status);
    if (statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
    if (statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
    if (statecoin.swap_address === null) throw Error("No swap address found for coin. Swap address should be set in Phase1.");
    if (statecoin.swap_receiver_addr === null) throw Error("No receiver address found for coin. Receiver address should be set in Phase1.");

    let phase
    try {
        phase = await pollSwap(http_client, statecoin.swap_id);
    } catch (err: any) {
        throw new SwapRetryError(err)
    }

    // We expect Phase4 here but should be Phase3. Server must slighlty deviate from protocol specification.

    // If still in previous phase return nothing.
    // If in any other than expected Phase return Error.
    if (phase === SWAP_STATUS.Phase2 || phase === SWAP_STATUS.Phase3) {
        return
    }
    else if (phase == null) {
        throw new Error("Swap halted at phase 3");
    }
    else if (phase !== SWAP_STATUS.Phase4) {
        throw new Error("Swap error: swapPhase3: Expected swap phase4. Received: " + phase);
    }


    try {
        // if this part has not yet been called, call it.
        if (statecoin.swap_transfer_msg === null) {
            statecoin.swap_transfer_msg = await transferSender(http_client, wasm_client, network, statecoin, proof_key_der, statecoin.swap_receiver_addr.proof_key, true, wallet);
            statecoin.ui_swap_status = UI_SWAP_STATUS.Phase6;
            wallet.saveStateCoinsList()
            await delay(1);
        }
        if (statecoin.swap_batch_data === null) {
            statecoin.swap_batch_data = make_swap_commitment(statecoin, statecoin.swap_info, wasm_client);
            wallet.saveStateCoinsList()
        }

        if (statecoin.swap_transfer_msg === null || statecoin.swap_batch_data === null) {
            console.log("do not yet have swap_transfer_msg or swap_batch_data - retrying...")
            return;
        }

        // Otherwise continue with attempt to comlete transfer_receiver
        let transfer_finalized_data = await do_transfer_receiver(
            http_client,
            electrum_client,
            network,
            statecoin.swap_id.id,
            statecoin.swap_batch_data.commitment,
            statecoin.swap_info.swap_token.statechain_ids,
            statecoin.swap_address,
            new_proof_key_der,
            req_confirmations,
            block_height,
            statecoin.value
        );
        statecoin.ui_swap_status = UI_SWAP_STATUS.Phase7;

        if (transfer_finalized_data !== null) {
            // Update coin status
            statecoin.swap_transfer_finalized_data = transfer_finalized_data;
            statecoin.swap_status = SWAP_STATUS.Phase4;
            wallet.saveStateCoinsList()
            log.info("Swap Phase4: Coin " + statecoin.shared_key_id + " in Swap ", statecoin.swap_id, ".");
        }
    } catch (err: any) {
        throw new SwapRetryError(err)
    }
}
