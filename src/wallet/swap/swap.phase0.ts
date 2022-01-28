import { SWAP_STATUS, SwapStep } from "./swap_utils";
import { STATECOIN_STATUS } from '..'
import Swap from "./swap"

export function swapPhase0(swap: Swap): SwapStep[] {
    return [
        new SwapStep(
            SWAP_STATUS.Phase0, "pollUtxo",
            () => {return swap.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
            () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase0},
            () => {
              if (swap.statecoin.statechain_id === null || 
                swap.statecoin.statechain_id === undefined) throw Error("statechain id is invalid");
              return true
            },
            swap.pollUtxo
          )
    ]
}

