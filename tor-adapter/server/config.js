"use strict";

const HASH_PASSWORD =
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const TOR_CONFIG = {
  ip: "localhost",
  port: 9060,
  controlPassword: HASH_PASSWORD,
  controlPort: 9061,
};

class Config {
  constructor(network) {
    this.network = network;
    
    if (network === "tor") {
      this.proxy = TOR_CONFIG;
    }

    this.update(require("./settings.json"));
  }

  update(config_changes) {
    Object.entries(config_changes).forEach((item) => {
      switch (item[0]) {
        case "tor_proxy":
          if (this.network === "tor") {
            Object.entries(item[1]).forEach((tp_item) => {
              switch (tp_item[0]) {
                case "ip":
                  this.proxy.ip = tp_item[1];
                  break;
                case "port":
                  this.proxy.port = tp_item[1];
                  break;
                case "controlPassword":
                  //Only update the password if specified
                  if (tp_item[1].length > 0) {
                    this.proxy.controlPassword = tp_item[1];
                  }
                  break;
                case "controlPort":
                  this.proxy.controlPort = tp_item[1];
                  break;
                default:
                  throw Error(
                    "Config tor_proxy entry " + tp_item[0] + " does not exist"
                  );
              }
            });
          }
          break;
        case "tor_endpoints":
          if (this.network === "tor") {
            this.state_entity_endpoint =
              item[1].state_entity_endpoint.split(",");
            this.swap_conductor_endpoint =
              item[1].swap_conductor_endpoint.split(",");
          }
          break;

        case "electrum_endpoint":
          this.electrum_endpoint = item[1].split(",");
          console.log("This.electrum_endpoint is now:", this.electrum_endpoint);
          break;
      }
    });
  }

  update_endpoints(config_changes) {
    Object.entries(config_changes).forEach((item) => {
      switch (item[0]) {
        case "state_entity_endpoint":
          this.state_entity_endpoint = item[1].split(",");
          break;
        case "swap_conductor_endpoint":
          this.swap_conductor_endpoint = item[1].split(",");
          break;
        case "electrum_endpoint":
          this.electrum_endpoint = item[1].split(",");
          console.log(
            "updating electrum_endpoint with:",
            this.electrum_endpoint
          );
          break;
      }
    });
  }
}

module.exports = Config;
