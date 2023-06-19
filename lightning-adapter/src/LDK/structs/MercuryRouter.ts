import {
  ChannelDetails,
  InFlightHtlcs,
  Result_RouteLightningErrorZ,
  RouteParameters,
  RouterInterface,
} from "lightningdevkit";

class MercuryRouter implements RouterInterface {
  find_route(
    payer: Uint8Array,
    route_params: RouteParameters,
    first_hops: ChannelDetails[],
    inflight_htlcs: InFlightHtlcs
  ): Result_RouteLightningErrorZ {
    throw new Error("Method not implemented.");
  }
  find_route_with_id(
    payer: Uint8Array,
    route_params: RouteParameters,
    first_hops: ChannelDetails[],
    inflight_htlcs: InFlightHtlcs,
    _payment_hash: Uint8Array,
    _payment_id: Uint8Array
  ): Result_RouteLightningErrorZ {
    throw new Error("Method not implemented.");
  }
}

export default MercuryRouter;
