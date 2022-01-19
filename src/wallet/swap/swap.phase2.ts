// Poll swap until phase changes to Phase2. In that case all participants have completed Phase1

import { HttpClient, MockHttpClient, StateCoin, STATECOIN_STATUS } from "..";
import { delay } from "../mercury/info_api";
import { pollSwap } from "./info_api";
import { SWAP_STATUS, SwapRetryError, get_blinded_spend_signature, UI_SWAP_STATUS, second_message } from "./swap";
import { log } from './swap';

// and swap second message can be performed.
export const swapPhase2 = async (
    http_client: HttpClient | MockHttpClient,
    wasm_client: any,
    statecoin: StateCoin,
) => {
    // check statecoin is IN_SWAP
    if (statecoin.status !== STATECOIN_STATUS.IN_SWAP) throw Error("Coin status is not IN_SWAP. Status: " + statecoin.status);
    if (statecoin.swap_status !== SWAP_STATUS.Phase2) throw Error("Coin is not in this phase of the swap protocol. In phase: " + statecoin.swap_status);
    if (statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
    if (statecoin.swap_my_bst_data === null) throw Error("No BST data found for coin. BST data should be set in Phase1.");
    if (statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.")
    // Poll swap until phase changes to Phase2.
    let phase: string
    try {
        phase = await pollSwap(http_client, statecoin.swap_id);
    } catch (err: any) {
        throw new SwapRetryError(err)
    }

    // If still in previous phase return nothing.
    // If in any other than expected Phase return Error.
    if (phase === SWAP_STATUS.Phase1) {
        return
    } else if (phase == null) {
        throw new Error("Swap halted at phase 1");
    } else if (phase !== SWAP_STATUS.Phase2) {
        throw new Error("Swap error: Expected swap phase2. Received: " + phase);
    }
    log.info("Swap Phase2: Coin " + statecoin.shared_key_id + " in Swap ", statecoin.swap_id, ".");

    let bss
    try {
        bss = await get_blinded_spend_signature(http_client, statecoin.swap_id.id, statecoin.statechain_id);
        statecoin.ui_swap_status = UI_SWAP_STATUS.Phase3;
    } catch (err: any) {
        throw new SwapRetryError(err)
    }

    try {
        await http_client.new_tor_id();
        statecoin.ui_swap_status = UI_SWAP_STATUS.Phase4;
    } catch (err: any) {
        throw new SwapRetryError(err, "Error getting new TOR id: ")
    }

    await delay(1);

    try {
        let receiver_addr = await second_message(http_client, wasm_client, statecoin.swap_id.id, statecoin.swap_my_bst_data, bss);
        statecoin.ui_swap_status = UI_SWAP_STATUS.Phase5;
        // Update coin with receiver_addr and update status
        statecoin.swap_receiver_addr = receiver_addr;
        statecoin.swap_status = SWAP_STATUS.Phase3;
        log.info("Swap Phase3: Coin " + statecoin.shared_key_id + " in Swap ", statecoin.swap_id, ".");
    } catch (err: any) {
        throw new SwapRetryError(err)
    }
}
