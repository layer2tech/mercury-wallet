import { SocketDescriptor } from "lightningdevkit";

class MercurySocketDescriptor extends SocketDescriptor {
  constructor(socket) {
    super();
    this.socket = socket;
  }

  send_data(data, resume_read) {
    console.log("send_data has fired off successfully. DATA: " + data);
    console.log(data);

    this.socket.onopen = (e) => {
      console.log("websocket connection established! :) ");
      this.socket.send(data);
    };

    this.socket.onerror = (e) => {
      console.log("websocket connection failed: " + e.message);
    };
  }

  disconnect_socket() {
    // not to sure what we are going to do here
  }

  eq() {
    // need too sure what we are going to do here to
  }

  hash() {
    // not too sure what we are going to do here
  }
}
export default MercurySocketDescriptor;