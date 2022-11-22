import { ConfirmationTarget, FeeEstimator } from "lightningdevkit";

var feerate_fast = 7500; // estimate fee rate in BTC/kB
var feerate_medium = 7500; // estimate fee rate in BTC/kB
var feerate_slow = 7500; // estimate fee rate in BTC/kB

class MercuryFeeEstimator extends FeeEstimator {
  get_sat_per_1000_weight(conf_target) {
    switch (conf_target) {
      case ConfirmationTarget.LDKConfirmationTarget_Background:
        // insert code to retireve a background feerate
        return feerate_slow;

      case ConfirmationTarget.LDKConfirmationTarget_Normal:
        // <insert code to retrieve a normal (i.e. within ~6 blocks) feerate>
        return feerate_medium;

      case ConfirmationTarget.LDKConfirmationTarget_HighPriority:
        // <insert code to retrieve a high-priority feerate>
        return feerate_fast;

      default:
        return 253;
    }
  }
}

export default MercuryFeeEstimator;
