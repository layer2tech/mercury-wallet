import { TorClient } from '../tor_client';
import { HttpClient, GET_ROUTE, POST_ROUTE } from '../http_client';
import { AssertionError } from 'assert';
var fetchUrl = require("fetch").fetchUrl;

jest.setTimeout(30000);

let password = 'tijf5631';

describe.skip('Tor integration', function(){
    test('tor new connection ', async function() {
        const tor = new TorClient('localhost', 9050, password, 9051);
        let result = await tor.confirmNewTorConnection();
    });

    test('tor get json', async function() {
        const tor = new TorClient('localhost', 9050, password, 9051, 'http://api.ipify.org?format=json');
        let result = await tor.get(undefined,undefined);
    });

    test('tor get onion', async function() {
        const tor = new TorClient('localhost', 9050, password, 9051, 'http://zo63hfpdcmonu52pcvflmeo62s47cqdabmibeejm7bhrfxmino3fl5qd.onion');
        let result = await tor.get('info/fee',undefined);
        console.log(result);
    });

    test('tor get onion 2', async function() {
        const tor = new TorClient('localhost', 9050, password, 9051, 'https://beta.mercurywallet.io');
        let result = await tor.get('info/fee',undefined);
        console.log('tor get onion 2: ' + result);
    });

    test('tor post', async function() {
        const tor = new TorClient('localhost', 9050, password, 9051, 'https://httpbin.org');
        let result = await tor.post('post','testbody');
    });
});

describe.skip('Tor', function(){
    test('tor constructor', async function() {
        const tor = new TorClient('localhost', 9050, password, 9051);
    });
});

describe('Tor server', function(){
    test('tor server get', async function(){
        const client = new HttpClient('http://localhost:3001');
        //let result = await client.get('tor',{});
        //console.log(result);

        let result2 = await client.get(GET_ROUTE.FEES,{});
        console.log(JSON.stringify(result2));
    });

    test('tor server get unknown route', async function(){
        const client = new HttpClient('http://localhost:3001');
        //let result = await client.get('tor',{});
        //console.log(result);

        try{
            await client.get('unknown route',{});
            expect().toBe(false);
        } catch (err){
           expect(err.response.status).toBe(404);   
        }
    });

    test('tor server post unknown route', async function(){
        const client = new HttpClient('http://localhost:3001');
        //let result = await client.get('tor',{});
        //console.log(result);

        let transfer_msg1 = {
            shared_key_id: "00000000000000000000000000000000",
            statechain_sig: "00000000000000000000000000000000"
        }
        try{
            let result2 = await client.post('unknown route', transfer_msg1);
            expect().toBe(false);
        } catch(err){
            expect(err.response.status).toBe(404);
        }
    });
    
    test('tor server post bad request', async function(){
        const client = new HttpClient('http://localhost:3001');
        //let result = await client.get('tor',{});
        //console.log(result);

        let transfer_msg1 = {
            shared_key_id: "00000000000000000000000000000000",
            statechain_sig: "00000000000000000000000000000000"
        }
        try{
            let result2 = await client.post(POST_ROUTE.TRANSFER_SENDER, transfer_msg1);
            expect().toBe(false);
        } catch(err){
            expect(err.response.status).toBe(400);
        }
    });
    
});