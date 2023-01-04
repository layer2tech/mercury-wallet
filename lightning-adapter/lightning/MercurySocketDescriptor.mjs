import { SocketDescriptor } from "lightningdevkit";

class MercurySocketDescriptor extends SocketDescriptor {
  constructor(socket) {
    super();
    this.socket = socket;
  }

  send_data(data, resume_read) {
    console.log("send_data has fired off successfully. DATA: " + data);
    console.log(data);
    // this.socket.send(data);

    // this.socket.onopen = (e) => {
    //   console.log("websocket connection established! :) ");
    //   this.socket.send(data);
    // };
    this.socket.addEventListener('open', () => {
      console.log('Connection open.');
      this.socket.send('Hello, server!');
    })

    // this.socket.onerror = (e) => {
    //   console.log('ERROR: ', e)
    //   console.log("websocket connection failed: " + e.message);
    // };

    this.socket.addEventListener('message', (event) => {
      // The data is stored inside the event.data
      console.log('Message: ', event.data);
    });

    this.socket.addEventListener('close', () => {
      console.log('Connection closed.');
    });
  }

  disconnect_socket() {
    // not too sure what we are going to do here
  }

  eq() {
    // need too sure what we are going to do here to
  }

  hash() {
    // not too sure what we are going to do here
  }
}
export default MercurySocketDescriptor;