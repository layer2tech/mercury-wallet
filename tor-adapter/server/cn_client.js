const HttpClient = require('../wallet/http_client').HttpClient;

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
        let client = new HttpClient(endpoint,false);
        await client.get(path, params)
    }

    async post (path, body, endpoint) {
        let client = new HttpClient(endpoint,false);
        await client.get(path, body)
    }

}

module.exports = TorClient;
