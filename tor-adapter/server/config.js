'use strict';

const HASH_PASSWORD = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + 
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

const TOR_CONFIG = {
    ip: "localhost",
    port: 9060,
    controlPassword: HASH_PASSWORD,
    controlPort: 9061
}

const I2P_CONFIG = {
    ip: 'localhost',
    port: 4445,
    //Default randomly generated control password
    controlPassword:HASH_PASSWORD,
    controlPort: 7650
}

class Config{
    
    constructor( network ) {
        this.network = network

        // Set PORT Config for Tor or I2P
        if( network === 'tor' ){
            
            this.proxy = TOR_CONFIG

        } else {

            this.proxy = I2P_CONFIG

        }
  
        this.update(require("./settings.json"));
    }

    update(config_changes){
        Object.entries(config_changes).forEach((item) => {
            switch(item[0]) {
                case "tor_proxy":
                    if(this.network === "tor"){
                        Object.entries(item[1]).forEach((tp_item) => {
                            switch(tp_item[0]){
                                case "ip":
                                    this.proxy.ip = tp_item[1];
                                    break;
                                case "port":
                                    this.proxy.port = tp_item[1];
                                    break;
                                case "controlPassword":
                                    //Only update the password if specified
                                    if (tp_item[1].length > 0){ 
                                        this.proxy.controlPassword = tp_item[1];
                                    } 
                                    break;
                                case "controlPort":
                                    this.proxy.controlPort = tp_item[1];
                                    break;
                                default: 
                                  throw Error("Config tor_proxy entry "+tp_item[0]+" does not exist")
                            }
                          });
                        }
                        break;
                case "i2p_proxy":
                    if(this.network === "i2p"){
                        Object.entries(item[1]).forEach((tp_item) => {
                            switch(tp_item[0]){
                                case "ip":
                                    this.proxy.ip = tp_item[1];
                                    break;
                                case "port":
                                    this.proxy.port = tp_item[1];
                                    break;
                                case "controlPassword":
                                    //Only update the password if specified
                                    if (tp_item[1].length > 0){ 
                                        this.proxy.controlPassword = tp_item[1];
                                    } 
                                    break;
                                case "controlPort":
                                    this.proxy.controlPort = tp_item[1];
                                    break;
                                default: 
                                  throw Error("Config i2p_proxy entry "+tp_item[0]+" does not exist")
                            }
                          });
                        }
                        break;

                case "i2p_endpoints":
                    if(this.network === "i2p"){
                        this.state_entity_endpoint = item[1].state_entity_endpoint.split(',');
                        this.swap_conductor_endpoint = item[1].swap_conductor_endpoint.split(',');
                    }
                    break;
                case "tor_endpoints":
                    if(this.network === "tor"){
                        this.state_entity_endpoint = item[1].state_entity_endpoint.split(',');
                        this.swap_conductor_endpoint = item[1].swap_conductor_endpoint.split(',');
                    }
                    break;

                case "electrum_endpoint":
                    this.electrum_endpoint = item[1].split(',');
                    break;
            }
        })
    };

    update_endpoints(config_changes){
        Object.entries(config_changes).forEach( (item) => {  
            switch(item[0]) {
                case "state_entity_endpoint":
                    this.state_entity_endpoint = item[1].split(',');
                    break;
                case "swap_conductor_endpoint":
                    this.swap_conductor_endpoint = item[1].split(',');
                    break;
                case "electrum_endpoint":
                    this.electrum_endpoint = item[1].split(',');
                    break;
            }
        })
    }
}

module.exports = Config;
