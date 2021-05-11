const DEFAULT_STATE_ENTITY_ENPOINT = "https://fakeapi.mercurywallet.io";

class Config{
    tor_proxy
    state_entity_endpoint
    swap_conductor_endpoint

    constructor() {
        this.tor_proxy = {
            ip: 'localhost',
            port: 9050,
            controlPassword: 'password',
            controlPort: 9051
        }

        this.update(require("../../src/settings.json"))
    }

    update(config_changes){
        Object.entries(config_changes).forEach((item) => {
            switch(item[0]) {
                case "tor_proxy":
                    Object.entries(item[1]).forEach((tp_item) => {
                        switch(tp_item[0]){
                            case "ip":
                                this.tor_proxy.ip = tp_item[1];
                                break;
                            case "port":
                                this.tor_proxy.port = tp_item[1];
                                break;
                            case "controlPassword":
                                this.tor_proxy.controlPassword = tp_item[1];
                                break;
                            case "controlPort":
                                this.tor_proxy.controlPort = tp_item[1];
                                break;
                            default: 
                              throw Error("Config tor_proxy entry "+tp_item[0]+" does not exist")
                        }
                      });
                      break;
                case "state_entity_endpoint":
                    this.state_entity_endpoint = item[1];
                    break;
                case "swap_conductor_endpoint":
                    this.swap_conductor_endpoint = item[1];
                    break;
            }
        })
    };
}

module.exports = Config;