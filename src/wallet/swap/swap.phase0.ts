import { StateCoin } from "..";
import { pollUtxo } from "./info_api";
import { StatechainID, SwapPhaseClients, SwapRetryError, SWAP_STATUS, UI_SWAP_STATUS, validateStatecoinState } from "./swap";
import { log } from './swap';

export const swapPhase0 = async (client: SwapPhaseClients, statecoin: StateCoin) => {

    validateStatecoinState(statecoin, SWAP_STATUS.Phase0);

    // setup json post object
    let statechain_id: StatechainID = {
        id: statecoin.statechain_id
    };

    // PollUtxo. If swap has begun store SwapId in Statecoin
    try {
        let swap_id = await pollUtxo(client.http_client, statechain_id);
        if (swap_id.id !== null) {
            log.info("Swap Phase0: Swap ID received: ", swap_id)
            updateStateCoinToPhase1(statecoin, swap_id);
        }
    } catch (err: any) {
        throw new SwapRetryError(err)
    }
}

const updateStateCoinToPhase1 = async (statecoin: StateCoin, swap_id: any) => {
    statecoin.swap_id = swap_id
    statecoin.swap_status = SWAP_STATUS.Phase1;
    statecoin.ui_swap_status = UI_SWAP_STATUS.Phase1;
}