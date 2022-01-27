import { SWAP_STATUS, Swap, SwapStep } from "./swap";
import { STATECOIN_STATUS } from '..'

export function swapInit(swap: Swap): SwapStep[] {
    return [
      new SwapStep(
        SWAP_STATUS.Init, "checkProofKeyDer",
        () => {return swap.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
        () => { 
          return  (swap.statecoin.swap_status === null || 
              swap.statecoin.swap_status === SWAP_STATUS.Init) 
          },
        () => {return true},
        swap.checkProofKeyDer
      ),
      new SwapStep(
        SWAP_STATUS.Init, "swapRegisterUtxo",
        () => {return swap.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
        () => {return (swap.statecoin.swap_status === null || 
          swap.statecoin.swap_status === SWAP_STATUS.Init) },
        () => {return true},
        swap.swapRegisterUtxo
      ),
    ]
}

