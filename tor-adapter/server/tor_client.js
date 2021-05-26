const SocksProxyAgent = require('socks-proxy-agent');
const net = require('net');
const os = require('os');
const rp = require('request-promise');
const { join, dirname } = require('path');
const joinPath = join;
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const fork = require('child_process').fork;
const rootPath = require('electron-root-path').rootPath;
const resourcesPath = joinPath(dirname(rootPath), 'mercury-wallet/resources');
const execPath = joinPath(resourcesPath, getPlatform());
const torrc = joinPath(resourcesPath, 'etc', 'torrc');

function getPlatform() {
        switch (process.platform) {
          case 'aix':
          case 'freebsd':
          case 'linux':
          case 'openbsd':
          case 'android':
            return 'linux';
          case 'darwin':
          case 'sunos':
            return 'mac';
          case 'win32':
            return 'win';
        }
    }

class TorClient {
    /*
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
*/

    constructor(ip, port, controlPassword, controlPort, dataPath){
        
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

    async startTorNode() {
        const execPath = joinPath(dirname(rootPath), 'mercury-wallet/resources', getPlatform());

        const tor_cmd = (getPlatform() === 'win') ? `${joinPath(execPath, 'Tor', 'tor')}`: `${joinPath(execPath, 'tor')}`;
        
        let isTorRunning=true;
        let tor_proc=undefined;

        if (this.isNodeRunning()){
            console.log(`tor is already running on port ${this.torConfig.port}`);
        }
        
        //Get the password hash
        exec(`tor --hash-password ${this.torConfig.controlPassword}`, (_error, stdout, _stderr) => {
            let hashedPassword = stdout;
            console.log(`tor is not running on port ${this.torConfig.port}`);
            console.log("starting tor...");
            this.tor_proc = exec(`tor -f ${torrc} SOCKSPort ${this.torConfig.port} ControlPort ${this.torConfig.controlPort} HashedControlPassword ${hashedPassword} Address 1.1.1.1 DataDirectory ${this.dataPath}`, {
                            detached: false,
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
        console.log(`Checking if tor is running on port ${this.torConfig.port}...`);
        let result
        execSync(`curl --socks5 ${this.torConfig.ip}:${this.torConfig.port} --socks5-hostname ${this.torConfig.ip}:${this.torConfig.port} -s https://check.torproject.org/ | cat | grep -m 1 Congratulations | xargs`, 
            (_error, stdout, _stderr) => {
                    result = (stdout.length > 2);
            }
        );
        return result;
    }

    async stopTorNode(){
        while(this.isNodeRunning()){
            await this.sendSignal('HALT');
            await this.sendSignal('HUP');
            await this.sendSignal('TERM');
            await this.sendSignal('SHUTDOWN');
            await this.sleep(1000);
        }
    }

    async newTorConnection() {
        await this.sendSignal('NEWNYM');
    }

    
    async sendSignal(signal) {
        const controlPassword = this.torConfig.controlPassword;
        
        let commands = [
            'authenticate "' + controlPassword + '"', // authenticate the connection                                                                      
            `signal ${signal}`, // send the signal                                                                                             
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
        
        return 'Tor signal successfully sent';
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
