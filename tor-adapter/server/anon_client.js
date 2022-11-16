'use strict';
const SocksProxyAgent = require('socks-proxy-agent');
const net = require('net');
const rp = require('request-promise');
const exec = require('child_process').exec;
const execFile = require('child_process').execFile;
const defaultShell = require('default-shell');
const TorControl = require('tor-control');
const Promise = require('bluebird');
const { v4: uuidv4 } = require('uuid');


class AnonClient {

    constructor(network,ip, port, controlPassword, controlPort, dataPath, geoIpFile, geoIpV6File, logger){
        this.network = network

        this.geoIpFile = geoIpFile;
        this.geoIpV6File = geoIpV6File;
        this.process = undefined;
        this.logger = logger
        

        this.config = {
            ip: ip,
            port: port,
            controlPassword: controlPassword,
            controlPort: controlPort,
        };

        this.dataPath = dataPath;

        this.newSocksAuthentication();

        this.control = new TorControl({
            password: this.config.controlPassword,
            persistent: true,
            port: this.config.controlPort,
            host: this.config.ip
        });
    }

    log(level, message) {
        if (this.logger !== undefined) {
            this.logger.log(level, message)
        }
    }

    set(config){
        let newConfig = { ...this.config}
        Object.entries(config).forEach((tp_item) => {
            switch(tp_item[0]){
              case "ip":
                  newConfig.ip = tp_item[1];
                  break;
              case "port":
                  newConfig.port = tp_item[1];
                  break;
              case "controlPassword":
                  newConfig.controlPassword = tp_item[1];
                  break;
              case "controlPort":
                  newConfig.controlPort = tp_item[1];
                  break;
              default: 
                throw Error(`Config ${this.network}_proxy entry `+tp_item[0]+" does not exist")
          }
        });
        this.log('info',`${this.network} set() - setting config to ${JSON.stringify(newConfig)}`)
        this.config = newConfig;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async startNode(start_cmd, torrc, network) {
        this.log('info',`${network}: AnonClient.startNode...`)

        let terminalPasswordArg

        if(start_cmd.slice(-18).includes('win')){
            // Check if windows to add arg differently
            terminalPasswordArg = [ `%hash-password=${this.config.controlPassword}` ]
        } else {
            terminalPasswordArg = [`--hash-password`,`${this.config.controlPassword}`]
        }

        //Get the Geo Args if required
        let geo_args =[];
        
        if (this.geoIpFile !== undefined) {
            geo_args.push("GeoIPFile");
            geo_args.push(`${this.geoIpFile}`);
        }         
        if (this.geoIpV6File !== undefined) {
            geo_args.push("GeoIPv6File");
            geo_args.push(`${this.geoIpV6File}`);
        }       

        let netConfigArgs


        
        execFile(start_cmd, terminalPasswordArg.concat(geo_args), (_error, stdout, _stderr) => {
            if(stdout.includes('[warn]') || stdout.includes('[notice]')){
                stdout = stdout.replace('\r','');
                stdout = stdout.split('\n')[1]
            }
            
            let hashedPassword = stdout.replace(/\n*$/, "");
            
            // Sets config when launching network
            if(network === "tor"){
                netConfigArgs = ["-f", `${torrc}`, "SOCKSPort", `${this.config.port}`,
                ,"HashedControlPassword", `${hashedPassword}`,
                "ControlPort",`${this.config.controlPort}`, "DataDir", `"${this.dataPath}"`]
            } else {
                netConfigArgs = [`--socksproxy.port=${this.config.port}`,
                "--http.enabled=false",
                "--i2pcontrol.enabled=true",
                `--i2pcontrol.password=${this.config.controlPassword}`,
                `--i2pcontrol.port=${this.config.controlPort}`,    
                `--datadir=${this.dataPath}`]
            }

            /* *
            * ToDo: Check Hash password is in proper use for Tor
            *  - the hash in netConfigArgs has been removed
            * */

            this.process = execFile(start_cmd, 
                netConfigArgs, {
                    detached: false,
                    shell: defaultShell,
                    stdio: 'ignore',
                },  (error) => {
                    if(error){
                        throw error;
                    };
                });
                this.process.stdout.on("data", function (data) {
                    const message = `${network} stdout: ` + data.toString()
                    console.log(message);  
                });
                
                this.process.stderr.on("data", function (data) {
                    const message = `${network} stderr: ` + data.toString()
                    console.error(message);
                });
                this.log('info',`${ network } Client.startNode - started ${ network } node with pid ${this.process.pid}`)
            });
                                    
    

    }

    async stopTorNode() {
        const message = `terminating ${this.network} node process with SIGTERM signal`
        console.log(message)
        this.log('info',message)
        this.term_proc()
        try {
            //check if still running
            this.signal_proc(0)
            //if still running wait, check again and send the kill signal
            const message1 = `${this.network} node process still running - waiting 1 second...`
            console.log(message1)
            this.log('info',message1)
            await new Promise(resolve => setTimeout(resolve, 1000))
            this.signal_proc(0)
            const message2 = `${this.network} node process still running - waiting 1 second...`
            this.log('info',message2)
            console.log(message2)
            await new Promise(resolve => setTimeout(resolve, 1000))
            this.signal_proc(0)
            const message3 = `${this.network} node process still running - sending kill signal...`
            this.log('info',message3)
            console.log(message3)
            this.kill_proc()
        } catch (err) {
            this.log('info',err.toString())
            console.log(err.toString())
            return
        }
        throw new Error(`Unable to shut down tor node with process id ${this.process.pid}\n`)
    }

    signal_proc(signal) {
        this.log('info',"TorClient.signal_proc()")
        this.log('debug',"TorClient.signal_proc() - debug")
        const pid = this?.process?.pid
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

    async confirmNewTorCircuit() {
        const maxNTries = 3;
        for (let nTries = 0; nTries < maxNTries; nTries++) {
            let ipOld = await this.getip();
            this.newSocksAuthentication();
            let ipNew = await this.getip();
            if (ipNew !== ipOld) {
                return tc_result;
            }
        }
        throw Error("Failed to get new TOR circuit and exit IP after " + maxNTries + " attempts");
    }

    //Generate a new socks authentication with a random user ID
    newSocksAuthentication() {
        this.log('debug', "TorClient.newSocksAuthentication()...");
        const userId = uuidv4();
        this.hostname = `socks://${userId}:@${this.config.ip}:${this.config.port}`;
      
        let agent = new SocksProxyAgent(this.hostname);
        this.proxyConfig = {
            agent: agent,
            headers: {
                'User-Agent': 'Request-Promise'
            }
        };

    }


    async confirmNewSocksAuthentication() {
        const maxNTries=3;
        for(let nTries = 0; nTries < maxNTries; nTries++){
            let ipOld = await this.getip();
            console.log( 'ipOld: ' ,ipOld )
            this.newSocksAuthentication();
            let ipNew = await this.getip();
            console.log( 'ipNew: ' ,ipNew )
            if(ipNew !== ipOld){
                return;
            }
        }
        throw Error("Failed to get new Tor exit IP after " + maxNTries + " attempts");
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

module.exports = AnonClient;


    // anonIPC(commands) {
    //     this.log('debug',`AnonClient.${this.network}IPC - sending commands to tor control port: ${JSON.stringify(commands)}`)
    //     return new Promise(function (resolve, reject, ip, controlPort) {
    //         ip = this.config.ip;
    //         controlPort = this.config.controlPort;
    //         let socket = net.connect({
    //             host: ip || '127.0.0.1',
    //             port: controlPort || 9051,
    //         }, function() {
    //             let commandString = commands.join( '\n' ) + '\n';
    //             socket.write(commandString);
    //         });
    
    //         socket.on('error', function ( err ) {
    //             console.log('error: ' + err);
    //             reject(err);
    //         });
    
    //         let data = '';
    //         socket.on( 'data', function ( chunk ) {
    //             data += chunk.toString();
    //         });
    
    //         socket.on( 'end', function () {
    //             resolve(data);
    //         });
    //     });
    // }



    // async newTorCircuit() {
    //     this.log('debug',"TorClient.newTorCircuit()...")
    //     let retval;
    //     await this.control.signalNewnym(function (err, status) {
    //         if(err){
    //             let err_out = new Error( 'Error communicating with Tor ControlPort\n' + err )
    //             throw err_out;
    //         }
    //     });        
    //     await this.sleep(6000);
    //     retval = `TorClient.newTorCircuit() - tor signal "newnym" successfully sent`;
    //     this.log('debug',retval)
    //     return retval;
    // }

    // async isNodeRunning() {
    //     let result=false
    //     await exec(`curl --socks5 ${this.config.ip}:${this.config.port} --socks5-hostname ${this.config.ip}:${this.config.port} -s https://check.torproject.org/ | cat | grep -m 1 Congratulations | xargs`, 
    //         (_error, stdout, _stderr) => {
    //             console.log(stdout);
    //             result = (stdout.length > 2);                
    //         }
    //     );
    //     this.log('info',`TorClient.isNodeRunning(): ${result}`)
    //     return result;
    // }