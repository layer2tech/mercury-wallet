import { SWAP_STATUS }  from "./swap_utils";
import { log, SwapStep } from './swap_utils';
import { STATECOIN_STATUS } from '..'
import Swap from "./swap"

export function swapPhase1(swap: Swap): SwapStep[] {
    return [
        new SwapStep(
            SWAP_STATUS.Phase1, "pollUtxo",
            () => {return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP},
            () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase1},
            () => {
              if (swap.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
              return true
            },
            swap.pollUtxoPhase1
          ),
          new SwapStep(
            SWAP_STATUS.Phase1, "loadSwapInfo",
            () => {return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP},
            () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase1},
            () => {return true},
            swap.loadSwapInfo
          ),
          new SwapStep(
            SWAP_STATUS.Phase1, "getBSTData",
            () => {return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP},
            () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase1},
            () => {return true},
            swap.getBSTData
          ),
    ]
}
