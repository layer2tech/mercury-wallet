// Poll swap until phase changes to Phase2. In that case all participants have completed Phase1

import { SWAP_STATUS } from "./swap_utils";
import { SwapStep } from './swap_utils';
import { STATECOIN_STATUS } from '..'
import Swap from "./swap"

export function swapPhase2(swap: Swap): SwapStep[] {
    return [
      new SwapStep(
          swap,
            SWAP_STATUS.Phase2, "pollSwapPhase2", 
        (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.IN_SWAP },
        (s: Swap) => { return s.statecoin.swap_status === SWAP_STATUS.Phase2 },
        (s: Swap) => {
            if (s.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
            if (!s.statecoin.swap_my_bst_data) throw Error("No BST data found for coin. BST data should be set in Phase1.");
            if (s.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.")
            return true
                      },
        (s: Swap) => { return s.pollSwapPhase2 }
          ),
      new SwapStep(
            swap,
            SWAP_STATUS.Phase2, "getBSS",
        (s: Swap) => { return true },
        (s: Swap) => { return true },
        (s: Swap) => { return true },
        (s: Swap) => { return s.getBSS }
          ),
      new SwapStep(
            swap,
            SWAP_STATUS.Phase2, "doSwapSecondMessage",
        (s: Swap) => {
          return () => { return true }
},
        (s: Swap) => {
          return () => { return true }
        },
        (s: Swap) => { return true },
        (s: Swap) => { return s.doSwapSecondMessage }
          ),
    ]
}

