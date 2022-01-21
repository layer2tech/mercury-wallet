// Logger import.

import { HttpClient, MockHttpClient, StateCoin, Wallet, STATECOIN_STATUS, ACTION, encodeSCEAddress, getTransferBatchStatus } from "..";
import { transferReceiverFinalize } from "../mercury/transfer";
import { pollSwap } from "./info_api";
import { SWAP_STATUS, SwapRetryError, UI_SWAP_STATUS } from "./swap";
import { log } from './swap';

// Poll swap until phase changes to Phase End. In that case complete swap by performing transfer finalize.
export const swapPhase4 = async (
    http_client: HttpClient | MockHttpClient,
    wasm_client: any,
    statecoin: StateCoin,
    wallet: Wallet
) => {
    // check statecoin is IN_SWAP
    if (statecoin.status !== STATECOIN_STATUS.IN_SWAP) throw Error("Coin status is not IN_SWAP. Status: " + statecoin.status);
    if (statecoin.swap_status !== SWAP_STATUS.Phase4) throw Error("Coin is not in this phase of the swap protocol. In phase: " + statecoin.swap_status);
    if (statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
    if (statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
    if (statecoin.swap_transfer_finalized_data === null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1.");

    let phase = null
    try {
        phase = await pollSwap(http_client, statecoin.swap_id);
    } catch (err: any) {
        let rte = new SwapRetryError(err, "Phase4 pollSwap error: ")
        if (!rte.message.includes("No data for identifier")) {
            throw rte
        }
    }
    // If still in previous phase return nothing.

    // If in any other than expected Phase return Error.
    if (phase === SWAP_STATUS.Phase3) {
        throw new SwapRetryError("Client in swap phase 4. Server in phase 3. Awaiting phase 4. Retrying...", "")
    } else if (phase !== SWAP_STATUS.Phase4 && phase !== null) {
        throw new Error("Swap error: swapPhase4: Expected swap phase4 or null. Received: " + phase);
    }
    log.info(`Swap Phase: ${phase} - Coin ${statecoin.shared_key_id} in Swap ${statecoin.swap_id}`);

    // Complete transfer for swap and receive new statecoin  
    try {
        statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8;
        let statecoin_out = await transferReceiverFinalize(http_client, wasm_client, statecoin.swap_transfer_finalized_data);
        // Update coin status and num swap rounds
        statecoin.ui_swap_status = UI_SWAP_STATUS.End;
        statecoin.swap_status = SWAP_STATUS.End;
        statecoin_out.swap_rounds = statecoin.swap_rounds + 1;
        statecoin_out.anon_set = statecoin.anon_set + statecoin.swap_info.swap_token.statechain_ids.length;
        wallet.setIfNewCoin(statecoin_out)
        wallet.statecoins.setCoinSpent(statecoin.shared_key_id, ACTION.SWAP)
        // update in wallet
        statecoin_out.swap_status = null;
        statecoin_out.ui_swap_status = null;
        statecoin_out.swap_auto = statecoin.swap_auto
        statecoin_out.setConfirmed();
        statecoin_out.sc_address = encodeSCEAddress(statecoin_out.proof_key, wallet)
        console.log("got SCE address.")
        if (wallet.statecoins.addCoin(statecoin_out)) {
            wallet.saveStateCoinsList();
            log.info("Swap complete for Coin: " + statecoin.shared_key_id + ". New statechain_id: " + statecoin_out.shared_key_id);
        } else {
            log.info("Error on swap complete for coin: " + statecoin.shared_key_id + " statechain_id: " + statecoin_out.shared_key_id + "Coin duplicate");
        }
        return statecoin_out;
    } catch (err: any) {
        let phase = null
        let batch_status
        try {
            try {
                phase = await pollSwap(http_client, statecoin.swap_id);
            } catch (err: any) {
                let rte = new SwapRetryError(`${err}`, `Phase4 pollSwap error - swap with ID ${statecoin.swap_id.id}: `)
                if (!rte.message.includes("No data for identifier")) {
                    throw rte
                }
            }
            console.log(`phase: ${phase}`)
            if (phase === null) {
                batch_status = await getTransferBatchStatus(http_client, statecoin.swap_id.id);
            }
        } catch (err2: any) {
            if (err2.message.includes('Transfer batch ended. Timeout')) {
                let error = new Error(`swap id: ${statecoin.swap_id.id}, shared key id: ${statecoin.shared_key_id} - swap failed at phase 4/4 
          due to Error: ${err2.message}`);
                throw error
            }
        }

        //Keep retrying - an authentication error may occur at this stage depending on the
        //server state
        console.log(`batch_status: ${batch_status}`)
        if ((batch_status && batch_status?.finalized !== true) ||
            err.message.includes("No data for identifier")) {
            throw new SwapRetryError(
                `statecoin ${statecoin.shared_key_id} waiting for completion of batch transfer in swap ID ${statecoin.swap_id.id}`,
                "Phase4 transferFinalize error: "
            )
        }
        throw new SwapRetryError(err, "Phase4 transferFinalize error: ")
    }
}