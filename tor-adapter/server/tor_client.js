const SocksProxyAgent = require('socks-proxy-agent');
const net = require('net');
const os = require('os');
const rp = require('request-promise');
const { join, dirname } = require('path');
const joinPath = join;
const exec = require('child_process').exec;
const execFile = require('child_process').execFile;
const execSync = require('child_process').execSync;
const fork = require('child_process').fork;
const defaultShell = require('default-shell');


class TorClient {

    constructor(ip, port, controlPassword, controlPort, dataPath, geoIpFile, geoIpV6File){
        
        this.geoIpFile = geoIpFile;
        this.geoIpV6File = geoIpV6File;
        this.tor_proc=undefined;

        this.torConfig={
            ip: ip,
            port: port,
            controlPassword: controlPassword,
            controlPort: controlPort,
        };

        this.dataPath = dataPath;

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
        return new Promise(function (resolve, reject, ip, controlPort) {
            ip = this.torConfig.ip;
            controlPort = this.torConfig.controlPort;
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

    async startTorNode(tor_cmd, torrc) {
        //Get the password hash
         let geo_args =[];
               
            if (this.geoIpFile !== undefined) {
                geo_args.push("GeoIPFile");
                geo_args.push(`${this.geoIpFile}`);
            }         
            if (this.geoIpV6File !== undefined) {
                geo_args.push("GeoIPv6File");
                geo_args.push(`${this.geoIpV6File}`);
            }       
                  
        execFile(tor_cmd, ["--hash-password", `${this.torConfig.controlPassword}`].concat(geo_args), (_error, stdout, _stderr) => {
            let hashedPassword = stdout.replace(/\n*$/, "");
            this.tor_proc = execFile(tor_cmd, 
                    ["-f", `${torrc}`, "SOCKSPort", `${this.torConfig.port}`,
                        "HashedControlPassword", `${hashedPassword}`,
                        "ControlPort",`${this.torConfig.controlPort}`,    
                        "DataDir", `"${this.dataPath}"`], {
                            detached: false,
                            shell: defaultShell,
                            stdio: 'ignore',
                            },  (error) => {
                                if(error){
                                    throw error;
                                };
                            });
           
            this.tor_proc.stdout.on("data", function(data) {
                console.log("tor stdout: " + data.toString());  
            });
         
            this.tor_proc.stderr.on("data", function(data) {
                console.log("tor stderr: " + data.toString());
            });
        });
    }

    async isNodeRunning() {
        let result=false
        await exec(`curl --socks5 ${this.torConfig.ip}:${this.torConfig.port} --socks5-hostname ${this.torConfig.ip}:${this.torConfig.port} -s https://check.torproject.org/ | cat | grep -m 1 Congratulations | xargs`, 
            (_error, stdout, _stderr) => {
                console.log(stdout);
                result = (stdout.length > 2);                
            }
        ); 
        return result;
    }

    async stopTorNode(){
        console.log("stop tor node");
        while(true){
            console.log("sending shutdown signal")
            //await exec(`(echo authenticate '"${this.torConfig.controlPassword}"'; echo signal shutdown; echo quit) | nc ${this.torConfig.ip} ${this.torConfig.controlPort}`);
            //console.log("sent shutdown signal")
            //console.log("shutdown");
            //await this.sendSignal('HALT');
            //await this.sendSignal('TERM');
            await this.sendSignal('SHUTDOWN');
            console.log(await this.isNodeRunning());
            if(await this.isNodeRunning() == false){  
                console.log("shutdown complete");
                break;
            }            
            await this.sleep(1000);
        }
    }

    async newTorConnection() {
        await this.sendSignal('NEWNYM');
        await this.sleep(6000);
    }

    
    async sendSignal(signal) {
        let data = '';
        await exec(`(echo authenticate '"${this.torConfig.controlPassword}"'; echo signal ${signal}; echo quit) | nc ${this.torConfig.ip} ${this.torConfig.controlPort}`,
        (_error, stdout, _stderr) => {
            data = stdout;
        });
        
        let lines = data.split( os.EOL ).slice( 0, -1 );
        
        let success = lines.every( function ( val, ind, arr ) {
            // each response from the ControlPort should start with 250 (OK STATUS)                                                                         
            return val.length <= 0 || val.indexOf( '250' ) >= 0
        });
     
        if ( !success ) {
            let err = new Error( 'Error communicating with Tor ControlPort\n' + data )
            throw err;
        }
        
        return `Tor signal "${signal}" successfully sent`;
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

    async get (path, params, endpoint) {
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

    async post(path, body, endpoint) {
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
