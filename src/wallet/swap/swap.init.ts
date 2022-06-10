import { SWAP_STATUS, SwapStep } from "./swap_utils";
import Swap from "./swap";
import { STATECOIN_STATUS } from '..'

export function swapInit(swap: Swap): SwapStep[] {
  return [
    new SwapStep(
      swap,
      SWAP_STATUS.Init, "checkProofKeyDer",
      (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP },
      (s: Swap) => {
          return (s.statecoin.swap_status === null ||
            s.statecoin.swap_status === SWAP_STATUS.Init)
      },
      (s: Swap) => { return true },
      (s: Swap) => { return s.checkProofKeyDer }
    ),
    new SwapStep(
      swap,
      SWAP_STATUS.Init, "swapRegisterUtxo",
      (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP } ,
      (s: Swap) => {
                  return (s.statecoin.swap_status === null ||
          s.statecoin.swap_status === SWAP_STATUS.Init)
  
      },
      (s: Swap) => { return true },
        (s: Swap) => { return s.swapRegisterUtxo }
      ),
    ]
}

