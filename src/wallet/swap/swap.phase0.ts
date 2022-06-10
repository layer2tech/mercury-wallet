import { SWAP_STATUS, SwapStep } from "./swap_utils";
import { STATECOIN_STATUS } from '..'
import Swap from "./swap"

export function swapPhase0(swap: Swap): SwapStep[] {
    return [
      new SwapStep(
          swap,
            SWAP_STATUS.Phase0, "pollUtxo",
        (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP },
        (s: Swap) => { return s.statecoin.swap_status === SWAP_STATUS.Phase0 },
        (s: Swap) => {
            if (s.statecoin.statechain_id === null ||
              s.statecoin.statechain_id === undefined) throw Error("statechain id is invalid");
            return true          
          },
        (s: Swap) => { return s.pollUtxoPhase0 }
          )
    ]
}

