import { StateCoin, STATECOIN_STATUS } from "..";
import { pollUtxo } from "./info_api";
import { StatechainID, SwapPhaseClients, SwapRetryError, SWAP_STATUS, UI_SWAP_STATUS } from "./swap";
import { log } from './swap';

export const swapPhase0 = async (client: SwapPhaseClients, statecoin: StateCoin) => {

    // validation  checks

    // check statecoin is still AWAITING_SWAP
    if (statecoin.status !== STATECOIN_STATUS.AWAITING_SWAP) throw Error("Statecoin status is not in awaiting swap");
    if (statecoin.swap_status !== SWAP_STATUS.Phase0) throw Error("Coin is not yet in this phase of the swap protocol. In phase: " + statecoin.swap_status);

    if (statecoin.statechain_id === null || statecoin.statechain_id === undefined) throw Error("statechain id is invalid");
    let statechain_id: StatechainID = {
        id: statecoin.statechain_id
    };

    // PollUtxo. If swap has begun store SwapId in Statecoin
    try {
        let swap_id = await pollUtxo(client.http_client, statechain_id);
        if (swap_id.id !== null) {
            log.info("Swap Phase0: Swap ID received: ", swap_id)
            statecoin.swap_id = swap_id
            statecoin.swap_status = SWAP_STATUS.Phase1;
            statecoin.ui_swap_status = UI_SWAP_STATUS.Phase1;
        }
    } catch (err: any) {
        throw new SwapRetryError(err)
    }
}