const SocksProxyAgent = require('socks-proxy-agent');
const net = require('net');
const os = require('os');
const rp = require('request-promise');

class TorClient {
    torConfig = {
        ip: 'localhost',
        port: 9050,
        controlPort: 9051,
        controlPassword: 'password'
    }
    proxyConfig = {
        agent: '',
        headers: {'':''}

    }

    constructor(ip, port, controlPassword, controlPort){
        
        this.torConfig={
            ip: ip,
            port: port,
            controlPassword: controlPassword,
            controlPort: controlPort,
        };

        this.proxyConfig={
            agent: new SocksProxyAgent('socks://' + ip + ':' + port),
            headers: {
                'User-Agent': 'Request-Promise'
            }
        };
    }

    set(torConfig){
        let newTorConfig = { ...this.torConfig}
        Object.entries(torConfig).forEach((tp_item) => {
            switch(tp_item[0]){
              case "ip":
                  newTorConfig.ip = tp_item[1];
                  break;
              case "port":
                  newTorConfig.port = tp_item[1];
                  break;
              case "controlPassword":
                  newTorConfig.controlPassword = tp_item[1];
                  break;
              case "controlPort":
                  newTorConfig.controlPort = tp_item[1];
                  break;
              default: 
                throw Error("Config tor_proxy entry "+tp_item[0]+" does not exist")
          }
        });
        this.torConfig = newTorConfig;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    torIPC(commands)  {
        let ip = this.torConfig.ip;
        let controlPort = this.torConfig.controlPort;

        return new Promise(function (resolve, reject, ip, controlPort) {
            let socket = net.connect({
                host: ip || '127.0.0.1',
                port: controlPort || 9051,
            }, function() {
                let commandString = commands.join( '\n' ) + '\n';
                socket.write(commandString);
                //resolve(commandString);                                                                                                                           
            });
    
            socket.on('error', function ( err ) {
                console.log('error: ' + err);
                reject(err);
            });
    
            let data = '';
            socket.on( 'data', function ( chunk ) {
                data += chunk.toString();
            });
    
            socket.on( 'end', function () {
                resolve(data);
            });
        });
    }


    async newTorConnection() {
        const controlPassword = this.torConfig.controlPassword;
    
        let commands = [
            'authenticate "' + controlPassword + '"', // authenticate the connection                                                                      
            'signal newnym', // send the signal (renew Tor session)                                                                                                 
            'quit' // close the connection                                                                                                                          
        ];
        
        let data = '';
        data = await this.torIPC(commands);
        
        let lines = data.split( os.EOL ).slice( 0, -1 );
        
        let success = lines.every( function ( val, ind, arr ) {
            // each response from the ControlPort should start with 250 (OK STATUS)                                                                         
            return val.length <= 0 || val.indexOf( '250' ) >= 0
        });
     
        if ( !success ) {
            let err = new Error( 'Error communicating with Tor ControlPort\n' + data )
            throw err;
        }
        
        await this.sleep(6000);
        
        return 'Tor session successfully renewed!!';
    }
    
    async confirmNewTorConnection() {
        const maxNTries=3;
        for(let nTries = 0; nTries < maxNTries; nTries++){
            let ipOld = await this.getip();
            let tc_result = await this.newTorConnection();
            let ipNew = await this.getip();
            if(ipNew != ipOld){
                return tc_result;
            }
        }
        throw "Failed to get new TOR circuit and exit IP after " + maxNTries + " attempts";
    }

    async getip() {
        let rp_options = {
            uri: 'http://api.ipify.org',
            agent: this.proxyConfig.agent,
            headers: this.proxyConfig.headers
        }
        try {
            return await rp(rp_options)
        } catch(err) {
            console.log(err)
        }
    }

    get = async (path, params, endpoint) => {
        let url = endpoint;
        if (path){
            url = url + "/" + path.replace(/^\/+/, '');;
        }
        if (params){
            url = url + "/" + (Object.entries(params).length === 0 ? "" : params).replace(/^\/+/, '');;
        }

        let rp_options = {
            url: url,
            agent: this.proxyConfig.agent,
            headers: { 
                'method': 'GET',
                'User-Agent': 'Request-Promise',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
            },
            json: true,
        }


        let result = await rp(rp_options);
        return result;
    }

    post = async (path, body, endpoint) => {
        let url = endpoint + "/" + path.replace(/^\/+/, '');;
        const rp_options = {
            method: 'POST',
            url: url,
            agent: this.proxyConfig.agent,
            headers: {
              'User-Agent': 'Request-Promise',
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
            },
            body: body,
            json: true,
        };

        let result = await rp(rp_options);
        return result;
    }
}

module.exports = TorClient;
