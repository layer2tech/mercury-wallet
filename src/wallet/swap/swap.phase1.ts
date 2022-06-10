import { SwapStepResult, SWAP_STATUS }  from "./swap_utils";
import { log, SwapStep } from './swap_utils';
import { STATECOIN_STATUS } from '..'
import Swap from "./swap"

export function swapPhase1(swap: Swap): SwapStep[] {
    return [
      new SwapStep(
          swap,
            SWAP_STATUS.Phase1, "pollUtxo",
        (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.IN_SWAP } ,
        (s: Swap) => { return s.statecoin.swap_status === SWAP_STATUS.Phase1 } ,
        (s: Swap) => {
          
            if (s.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
            return true
          },
        (s: Swap) => { return s.pollUtxoPhase1 }
          ),
      new SwapStep(
            swap,
            SWAP_STATUS.Phase1, "loadSwapInfo",
        (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.IN_SWAP },
        (s: Swap) => { return s.statecoin.swap_status === SWAP_STATUS.Phase1 },
        (s: Swap) => { return true },
        (s: Swap) => { return s.loadSwapInfo }
          ),
      new SwapStep(
            swap,
            SWAP_STATUS.Phase1, "getBSTData",
        (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.IN_SWAP },
        (s: Swap) => { return s.statecoin.swap_status === SWAP_STATUS.Phase1 },
        (s: Swap) => { return true } ,
        (s: Swap) => { return s.getBSTData }
          ),
    ]
}
