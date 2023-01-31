import { ConfirmationTarget, FeeEstimator, FeeEstimatorInterface } from "lightningdevkit";

var feerate_fast = 253; // estimate fee rate in BTC/kB
var feerate_medium = 253; // estimate fee rate in BTC/kB
var feerate_slow = 253; // estimate fee rate in BTC/kB

class MercuryFeeEstimator implements FeeEstimatorInterface{
    get_est_sat_per_1000_weight(confirmation_target: ConfirmationTarget): number {
        switch (confirmation_target) {
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
