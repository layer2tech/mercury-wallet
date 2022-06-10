
import { SWAP_STATUS, SwapStep } from "./swap_utils";
import { STATECOIN_STATUS } from ".."
import Swap from "./swap"

// Poll swap until phase changes to Phase3/4. In that case all carry out transfer_sender
export function swapPhase3(swap: Swap): SwapStep[] {
    return [
      new SwapStep(
      swap,
    SWAP_STATUS.Phase3, "pollSwapPhase3",
        (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.IN_SWAP },
        (s: Swap) => { return s.statecoin.swap_status === SWAP_STATUS.Phase3 },
        (s: Swap) => {
            if (s.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
            if (s.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
            if (s.statecoin.swap_address === null) throw Error("No swap address found for coin. Swap address should be set in Phase1.");
            if (s.statecoin.swap_receiver_addr === null) throw Error("No receiver address found for coin. Receiver address should be set in Phase1.");
            return true
    },
        (s: Swap) => { return s.pollSwapPhase3 }
  ),
      new SwapStep(
    swap,
    SWAP_STATUS.Phase3, "transferSender",
        (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.IN_SWAP },
        (s: Swap) => { return s.statecoin.swap_status === SWAP_STATUS.Phase3 },
        (s: Swap) => { return true },
        (s: Swap) => { return s.transferSender }
      ),
      new SwapStep(
    swap,
    SWAP_STATUS.Phase3, "transferUpdateMsg",
        (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.IN_SWAP },
        (s: Swap) => { return s.statecoin.swap_status === SWAP_STATUS.Phase3 },
        (s: Swap) => {
                      if (s.statecoin.swap_transfer_msg === null || s.statecoin.swap_transfer_msg === undefined) throw Error("no swap_transfer_msg. Exiting s.");
            return true
    },
        (s: Swap) => { return s.transferUpdateMsg }
  ),
      new SwapStep(
    swap,
    SWAP_STATUS.Phase3, "getTransferMsg3",
        (s: Swap) => { return () => { return true } },
        (s: Swap) => { return () => { return true } },
        (s: Swap) => { 
          return () => {
            if (s.statecoin.swap_transfer_msg === null) throw Error("No swap transfer message for coin.")
            return true
          }
    },
        (s: Swap) => { return s.getTransferMsg3 }
  ),
      new SwapStep(
    swap,
    SWAP_STATUS.Phase3, "makeSwapCommitment",
        (s: Swap) => { return () => { return true } },
        (s: Swap) => { return () => { return true } },
        (s: Swap) => { 
          return () => {
            if (s.statecoin.swap_transfer_msg_3_receiver === null) throw Error("No transfer_msg_3_receiver.")
            return true;
          }
    },
        (s: Swap) => { return s.makeSwapCommitment }
  )
]
}