import { Swap, SwapStep } from './swap'
import { swapInit } from './swap.init';
import { swapPhase0 } from './swap.phase0';
import { swapPhase1 } from './swap.phase1';
import { swapPhase2 } from './swap.phase2';
import { swapPhase3 } from './swap.phase3';
import { swapPhase4 } from './swap.phase4';

export function get_swap_steps(swap: Swap): SwapStep[] {
    return swapInit(swap).concat(
      swapPhase0(swap),
      swapPhase1(swap),
      swapPhase2(swap),
      swapPhase3(swap),
      swapPhase4(swap)    
    )
  }