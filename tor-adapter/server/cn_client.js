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
       
        try {
            let url = endpoint;
            if (path){
                url = url + "/" + path.replace(/^\/+/, '');;
            }
            if (params){
                url = url + "/" + (Object.entries(params).length === 0 ? "" : params).replace(/^\/+/, '');;
            }
            
            const config = {
                method: 'get',
                url: url,
                headers: { 'Accept': 'application/json' }
            };
            let res = await axios(config)
            let return_data = res.data
      
            return return_data
      
          } catch (err) {
            throw err;
          }
    }

    async post (path, body, endpoint) {
        try {
            let url = endpoint + "/" + path.replace(/^\/+/, '');;
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
      
            return return_data
      
          } catch (err) {
            throw err;
          }
    }

    async post_plain (path, body, endpoint) {
        try {
            let url = endpoint + "/" + path.replace(/^\/+/, '');;
            const config = {
                method: 'POST',
                url: url,
                headers: {
                  'Content-Type': 'text/plain',
                  'Accept': 'application/json'
                },
                data: body,
            };
            let res = await axios(config)
            let return_data = res.data
      
            return return_data
      
          } catch (err) {
            throw err;
          }
    }

}

module.exports = CNClient;
