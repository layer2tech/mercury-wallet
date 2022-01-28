// Poll swap until phase changes to Phase2. In that case all participants have completed Phase1

import { SWAP_STATUS } from "./swap_utils";
import { SwapStep } from './swap_utils';
import { STATECOIN_STATUS } from '..'
import Swap from "./swap"

export function swapPhase2(swap: Swap): SwapStep[] {
    return [
        new SwapStep(
            SWAP_STATUS.Phase2, "pollSwapPhase2", 
            () => {return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP},
            () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase2},
            () => {
              if (swap.statecoin.swap_id===null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
              if (!swap.statecoin.swap_my_bst_data) throw Error("No BST data found for coin. BST data should be set in Phase1.");
              if (swap.statecoin.swap_info===null) throw Error("No swap info found for coin. Swap info should be set in Phase1.")
              return true
            },
            swap.pollSwapPhase2
          ),
          new SwapStep(
            SWAP_STATUS.Phase2, "getBSS",
            () => {return true},
            () => {return true},
            () => {return true},
            swap.getBSS
          ),
          new SwapStep(
            SWAP_STATUS.Phase2, "getNewTorID",
            () => {return true},
            () => {return true},
            () => {return true},
            swap.getNewTorID
          ),
          new SwapStep(
            SWAP_STATUS.Phase2, "doSwapSecondMessage",
            () => {return true},
            () => {return true},
            () => {return true},
            swap.doSwapSecondMessage
          ),
    ]
}

