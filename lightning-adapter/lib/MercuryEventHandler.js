import { EventHandler, EventsProvider } from "lightningdevkit";

class MercuryEventhandler extends EventHandler {
  constructor(events) {
    super(events);
  }

  handle_event(event) {
    events.push(event);
  }
}

export default MercuryEventhandler;
