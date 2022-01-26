import { SWAP_STATUS, Swap, SwapStep } from "./swap";
import { STATECOIN_STATUS } from '..'

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

