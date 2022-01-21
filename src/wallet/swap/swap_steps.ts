import { Swap, SwapStep, SWAP_STATUS} from './swap'
import { STATECOIN_STATUS } from '..'

export function get_swap_steps(swap: Swap): SwapStep[] {
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
        ),
        new SwapStep(
          SWAP_STATUS.Phase1, "pollUtxo",
          () => {return swap.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
          () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase1},
          () => {
            if (swap.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
            return true
          },
          swap.pollUtxoPhase1
        ),
        new SwapStep(
          SWAP_STATUS.Phase1, "loadSwapInfo",
          () => {return swap.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
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
        new SwapStep(
          SWAP_STATUS.Phase3, "pollSwapPhase3",
          () => {return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP},
          () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase3},
          () => { 
            if (swap.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
            if (swap.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
            if (swap.statecoin.swap_address === null) throw Error("No swap address found for coin. Swap address should be set in Phase1.");
            if (swap.statecoin.swap_receiver_addr === null) throw Error("No receiver address found for coin. Receiver address should be set in Phase1.");
            return true
          },
          swap.pollSwapPhase3
        ),
        new SwapStep(
          SWAP_STATUS.Phase3, "transferSender",
          () => {return true},
          () => {return true},
          () => { return true },
          swap.transferSender
        ),
        new SwapStep(
          SWAP_STATUS.Phase3, "makeSwapCommitment",
          () => {return true},
          () => {return true},
          () => { 
            if (swap.statecoin.swap_transfer_msg !== null) throw Error("No swap transfer message for coin")
            return true;
          },
          swap.makeSwapCommitment
        ),
        new SwapStep(
          SWAP_STATUS.Phase3, "transferReceiver",
          () => {return true},
          () => {return true},
          () => { 
            if (swap.statecoin.swap_batch_data !== null) throw Error("No swap batch transfer data for coin")
            return true
          },
          swap.transferReceiver
        ),
        new SwapStep(
          SWAP_STATUS.Phase4, "swapPhase4PollSwap",
          () => {return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP},
          () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase4 },
          () => { 
            if (swap.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
            if (swap.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
            if (swap.statecoin.swap_transfer_finalized_data === null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1.");
            return true
          },
          swap.swapPhase4PollSwap
        ),
        new SwapStep(
          SWAP_STATUS.Phase4, "transferReceiverFinalize",
          () => {return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP},
          () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase4 },
          () => { 
            if (swap.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
            if (swap.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
            if (swap.statecoin.swap_transfer_finalized_data === null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1.");
            return true
          },
          swap.transferReceiverFinalize
        ),
      ]
}