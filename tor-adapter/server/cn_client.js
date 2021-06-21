const axios = require('axios').default;

class CNClient {

    constructor(){
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async startTorNode(tor_cmd, torrc) {
    };
      
    async isNodeRunning() {
        true
    }

    async stopTorNode(){
    }

    async newTorConnection() {
        await this.sleep(6000);
        return `Tor signal "newnym" successfully sent`;  
    }

    async confirmNewTorConnection() {
        this.newTorConnection()
    }

    async getip() {
        "mock"
    }

    async get (path, params, endpoint) {
        console.log(`get: ${path} ${[params]} ${endpoint}`);
        try {
            const url = endpoint + "/" + path + "/" + (Object.entries(params).length === 0 ? "" : params);
            const config = {
                method: 'get',
                url: url,
                headers: { 'Accept': 'application/json' }
            };
            let res = await axios(config)
            let return_data = res.data
            checkForServerError(return_data)
      
            return return_data
      
          } catch (err) {
            throw err;
          }
    }

    async post (path, body, endpoint) {
        try {
            let url = endpoint + "/" + path;
            const config = {
                method: 'post',
                url: url,
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json'
                },
                data: body,
            };
            let res = await axios(config)
            let return_data = res.data
            checkForServerError(return_data)
      
            return return_data
      
          } catch (err) {
            throw err;
          }
    }

}

module.exports = CNClient;
