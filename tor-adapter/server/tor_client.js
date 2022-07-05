'use strict';
const SocksProxyAgent = require('socks-proxy-agent');
const net = require('net');
const rp = require('request-promise');
const exec = require('child_process').exec;
const execFile = require('child_process').execFile;
const defaultShell = require('default-shell');
const TorControl = require('tor-control');
const Promise = require('bluebird');

class TorClient {

    constructor(ip, port, controlPassword, controlPort, dataPath, geoIpFile, geoIpV6File, logger){
        
        this.geoIpFile = geoIpFile;
        this.geoIpV6File = geoIpV6File;
        this.tor_proc = undefined;
        this.logger = logger
        

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

        this.control = new TorControl({
            password: this.torConfig.controlPassword,
            persistent: true,
            port: this.torConfig.controlPort,
            host: this.torConfig.ip
        });
    }

    log(level, message) {
        if (this.logger !== undefined) {
            this.logger.log(level, message)
        }
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
        this.log('info',`TorClient.set() - setting config to ${JSON.stringify(newTorConfig)}`)
        this.torConfig = newTorConfig;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    torIPC(commands) {
        this.log('debug',`TorClient.torIPC - sending commands to tor control port: ${JSON.stringify(commands)}`)
        return new Promise(function (resolve, reject, ip, controlPort) {
            ip = this.torConfig.ip;
            controlPort = this.torConfig.controlPort;
            let socket = net.connect({
                host: ip || '127.0.0.1',
                port: controlPort || 9051,
            }, function() {
                let commandString = commands.join( '\n' ) + '\n';
                socket.write(commandString);
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
        this.log('info',`TorClient.startTorNode...`)
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
           
            this.tor_proc.stdout.on("data", function (data) {
                const message = "tor stdout: " + data.toString()
                console.log(message);  
            });
         
            this.tor_proc.stderr.on("data", function (data) {
                const message = "tor stderr: " + data.toString()
                console.error(message);
            });
            this.log('info',`TorClient.startTorNode - started tor node with pid ${this.tor_proc.pid}`)
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
        this.log('info',`TorClient.isNodeRunning(): ${result}`)
        return result;
    }

    async stopTorNode() {
        const message = `terminating tor node process with SIGTERM signal`
        console.log(message)
        this.log('info',message)
        this.term_proc()
        try {
            //check if still running
            this.signal_proc(0)
            //if still running wait, check again and send the kill signal
            const message1 = "tor node process still running - waiting 1 second..."
            console.log(message1)
            this.log('info',message1)
            await new Promise(resolve => setTimeout(resolve, 1000))
            this.signal_proc(0)
            const message2 = "tor node process still running - waiting 1 second..."
            this.log('info',message2)
            console.log(message2)
            await new Promise(resolve => setTimeout(resolve, 1000))
            this.signal_proc(0)
            const message3 = "tor node process still running - sending kill signal..."
            this.log('info',message3)
            console.log(message3)
            this.kill_proc()
        } catch (err) {
            this.log('info',err.toString())
            console.log(err.toString())
            return
        }
        throw new Error(`Unable to shut down tor node with process id ${this.tor_proc.pid}\n`)
    }

    signal_proc(signal) {
        this.log('info',"TorClient.signal_proc()")
        this.log('debug',"TorClient.signal_proc() - debug")
        const pid = this?.tor_proc?.pid
        this.log('info',`TorClient.signal_proc() - pid: ${pid}`)
        if(pid){
            process.kill(pid, signal)
        }
    }

    term_proc() {
        this.log('info',"TorClient.term_proc()")
        this.log('debug',"TorClient.term_proc() - debug")
        this.signal_proc("SIGTERM")
    }

    int_proc() {
        this.signal_proc("SIGINT")
    }

    kill_proc() {
        this.signal_proc("SIGKILL")
    }

    async exists_proc() {
        try {
            this.signal_proc(0)
            return true
        } catch(err){
            return false
        }
    }


    async newTorConnection() {
        this.log('debug',"TorClient.newTorConnection()...")
        let retval;
        await this.control.signalNewnym(function (err, status) {
            if(err){
                let err_out = new Error( 'Error communicating with Tor ControlPort\n' + err )
                throw err_out;
            }
        });        
        await this.sleep(6000);
        retval = `TorClient.newTorConnection() - tor signal "newnym" successfully sent`;
        this.log('debug',retval)
        return retval;
    }

    
    async confirmNewTorConnection() {
        const maxNTries=3;
        for(let nTries = 0; nTries < maxNTries; nTries++){
            let ipOld = await this.getip();
            let tc_result = await this.newTorConnection();
            let ipNew = await this.getip();
            if(ipNew !== ipOld){
                return tc_result;
            }
        }
        throw Error("Failed to get new TOR circuit and exit IP after " + maxNTries + " attempts");
    }

    async getip() {
        let rp_options = {
            uri: 'http://api.ipify.org',
            agent: this.proxyConfig.agent,
            headers: this.proxyConfig.headers
        }
        try {
            return await rp(rp_options)
        } catch (err) {
            const error = new Error(`TorClient.getip() - ${err.toString()}`)
            console.log(error.toString())
            this.log('error', error.toString())
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

        this.log('debug',`get url ${url}...`)
        let result = await rp(rp_options);
        this.log('debug',`finished get.`)
        return result;
    }

    async post(path, body, endpoint) {
        let url = endpoint + "/" + path.replace(/^\/+/, '');
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

        this.log('debug',`post url ${url}...`)
        let result = await rp(rp_options);
        this.log('debug',`finished post.`)
        return result;
    }

    async post_plain(path, body, endpoint) {
        let url = endpoint + "/" + path.replace(/^\/+/, '');
        const rp_options = {
            method: 'POST',
            url: url,
            agent: this.proxyConfig.agent,
            headers: {
              'Content-Type': 'text/plain',
            },
	        body: body,
            json: false,
        };

        let result = await rp(rp_options);
        return result;
    }
}

module.exports = TorClient;
