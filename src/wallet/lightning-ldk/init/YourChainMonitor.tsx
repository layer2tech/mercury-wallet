import { BroadcasterInterface, ChainMonitor, FeeEstimator, Filter, Logger, LoggerInterface, Persist, Persister } from "lightningdevkit";

class YourChainMonitor extends ChainMonitor {
    init_chain_monitor(
        filter: Filter, 
        tx_broadcaster: BroadcasterInterface,
        logger: Logger,
        fee_estimator: FeeEstimator,
        persister: Persist
    ) {
        return ChainMonitor.constructor_new(filter, tx_broadcaster, logger, fee_estimator, persister);
    }
}

export default YourChainMonitor;