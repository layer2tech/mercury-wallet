const argsHasTestnet =  () => {
    let found  = false;
    window.require('electron').remote.process.argv.forEach((arg) =>  {
        if(arg.includes('testnet')){
            found = true;
        }     
    });
    return found;
}

class Config{
    
    constructor() {
        this.tor_proxy = {
            ip: 'localhost',
            port: 9060,
            //Default randomly generated control password
            controlPassword: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) +
                                Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            controlPort: 9061
        }
        
        // if testnet was not passed
        //if(!argsHasTestnet()){
        //    this.update(require("./settings.json"));
        //}else{
        //    this.update(require('./testnet_settings.json'));
        //}
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
                                //Only update the password if specified
                                if (tp_item[1].length > 0){ 
                                    this.tor_proxy.controlPassword = tp_item[1];
                                } 
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
                case "electrum_endpoint":
                    this.electrum_endpoint = item[1];
                    break;
            }
        })
    };

    update_endpoints(config_changes){
        Object.entries(config_changes).forEach( (item) => {  
            switch(item[0]) {
                case "state_entity_endpoint":
                    this.state_entity_endpoint = item[1];
                    break;
                case "swap_conductor_endpoint":
                    this.swap_conductor_endpoint = item[1];
                    break;
                case "electrum_endpoint":
                    this.electrum_endpoint = item[1];
                    break;
            }
        })
    }
}

module.exports = Config;
