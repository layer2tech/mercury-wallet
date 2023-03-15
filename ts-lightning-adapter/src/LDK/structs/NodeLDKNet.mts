import * as ldk from "lightningdevkit";
import * as net from "net";

/**
 * Handles TCP connections using Node.JS's 'net' module given an `ldk.PeerManager`.
 */
export class NodeLDKNet {
  private ping_timer;
  private servers: net.Server[];
  public constructor(public peer_manager: ldk.PeerManager) {
    this.ping_timer = setInterval(function () {
      peer_manager.timer_tick_occurred();
      peer_manager.process_events();
    }, 10_000);
    this.servers = [];
  }

  /**
   * Disconnects all connections and releases all resources for this net handler.
   */
  public stop() {
    clearInterval(this.ping_timer);
    for (const server of this.servers) {
      server.close();
    }
    this.peer_manager.disconnect_all_peers();
  }

  /**
   * Processes any pending events for the PeerManager, sending queued messages.
   * You should call this (or peer_manager.process_events()) any time you take an action which
   * is likely to generate messages to send (eg send a payment, processing payment forwards,
   * etc).
   */
  public process_events() {
    this.peer_manager.process_events();
  }

  private descriptor_count = BigInt(0);
  private get_descriptor(socket: net.Socket): ldk.SocketDescriptor {
    const this_index = this.descriptor_count;
    this.descriptor_count += BigInt(1);

    socket.setNoDelay(true);

    const this_pm = this.peer_manager;
    var sock_write_waiting = false;

    let descriptor = ldk.SocketDescriptor.new_impl({
      send_data(data: Uint8Array, resume_read: boolean): number {
        if (resume_read) socket.resume();

        if (sock_write_waiting) return 0;
        const written = socket.write(data);
        if (!written) sock_write_waiting = true;
        return data.length;
      },
      disconnect_socket(): void {
        socket.destroy();
      },
      eq(other: ldk.SocketDescriptor): boolean {
        return other.hash() == this.hash();
      },
      hash(): bigint {
        return this_index;
      },
    } as ldk.SocketDescriptorInterface);

    socket.on("drain", function () {
      if (sock_write_waiting) {
        if (!this_pm.write_buffer_space_avail(descriptor).is_ok()) {
          descriptor.disconnect_socket();
        }
      }
    });

    socket.on("data", function (data) {
      const res = this_pm.read_event(descriptor, data);
      if (!res.is_ok()) descriptor.disconnect_socket();
      else if ((res as ldk.Result_boolPeerHandleErrorZ_OK).res) socket.pause();
      this_pm.process_events();
    });

    socket.on("close", function () {
      this_pm.socket_disconnected(descriptor);
    });
    socket.on("error", function () {
      this_pm.socket_disconnected(descriptor);
    });

    return descriptor;
  }

  private static v4_addr_from_ip(ip: string, port: number): ldk.NetAddress {
    const sockaddr = ip.split(".").map(parseFloat);
    return ldk.NetAddress.constructor_ipv4(new Uint8Array(sockaddr), port);
  }
  private static v6_addr_from_ip(ip: string, port: number): ldk.NetAddress {
    const sockaddr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const halves = ip.split("::"); // either one or two elements
    if (halves[0]) {
      const first_half = halves[0].split(":");
      for (var idx = 0; idx < first_half.length; idx++) {
        const v = parseInt(first_half[idx] || "0", 16);
        sockaddr[idx * 2] = v >> 8;
        sockaddr[idx * 2 + 1] = v & 0xff;
      }
    }
    if (halves.length == 2) {
      if (halves[1]) {
        const second_half = halves[1].split(":");
        for (var idx = 0; idx < second_half.length; idx++) {
          const v = parseInt(
            second_half[second_half.length - idx - 1] || "0",
            16
          );
          sockaddr[14 - idx * 2] = v >> 8;
          sockaddr[15 - idx * 2] = v & 0xff;
        }
      }
    }

    return ldk.NetAddress.constructor_ipv6(new Uint8Array(sockaddr), port);
  }

  private static get_addr_from_socket(
    socket: net.Socket
  ): ldk.Option_NetAddressZ {
    const addr = socket.remoteAddress;
    if (addr === undefined) return ldk.Option_NetAddressZ.constructor_none();
    if (net.isIPv4(addr) && socket.remotePort) {
      return ldk.Option_NetAddressZ.constructor_some(
        NodeLDKNet.v4_addr_from_ip(addr, socket.remotePort)
      );
    }
    if (net.isIPv6(addr) && socket.remotePort) {
      return ldk.Option_NetAddressZ.constructor_some(
        NodeLDKNet.v6_addr_from_ip(addr, socket.remotePort)
      );
    }
    return ldk.Option_NetAddressZ.constructor_none();
  }

  /**
   * Binds a listener on the given host and port, accepting incoming connections.
   */
  public async bind_listener(host: string, port: number) {
    const this_handler = this;
    const server = net.createServer(function (incoming_sock: net.Socket) {
      const descriptor = this_handler.get_descriptor(incoming_sock);
      const res = this_handler.peer_manager.new_inbound_connection(
        descriptor,
        NodeLDKNet.get_addr_from_socket(incoming_sock)
      );
      if (!res.is_ok()) descriptor.disconnect_socket();
    });
    const servers_list = this.servers;
    return new Promise<void>((resolve, reject) => {
      server.on("error", function () {
        reject();
        server.close();
      });
      server.on("listening", function () {
        servers_list.push(server);
        resolve();
      });
      server.listen(port, host);
    });
  }

  /**
   * Establishes an outgoing connection to the given peer at the given host and port.
   *
   * Note that the peer will not appear in the PeerManager peers list until the socket has
   * connected and the initial handshake completes.
   */
  async connect_peer(host: string, port: number, peer_node_id: Uint8Array) {
    const this_handler = this;
    const sock = new net.Socket();
    const res = new Promise<void>((resolve, reject) => {
      sock.on("connect", function () {
        resolve();
      });
      sock.on("error", function () {
        reject();
      });
    });
    sock.connect(port, host, function () {
      const descriptor = this_handler.get_descriptor(sock);
      const res = this_handler.peer_manager.new_outbound_connection(
        peer_node_id,
        descriptor,
        NodeLDKNet.get_addr_from_socket(sock)
      );
      if (!res.is_ok()) descriptor.disconnect_socket();
      else {
        const bytes = (res as ldk.Result_CVec_u8ZPeerHandleErrorZ_OK).res;
        const send_res = descriptor.send_data(bytes, true);
        console.assert(send_res == bytes.length);
      }
    });
    return res;
  }
}
