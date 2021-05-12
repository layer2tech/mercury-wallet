import { HttpClient, GET_ROUTE, POST_ROUTE } from '../http_client';

jest.setTimeout(30000);

let tor_config = {
    tor_proxy: {
        ip: 'localhost',
        port: 9050,
        controlPassword: 'password',
        controlPort: 9051
    },
    state_entity_endpoint: "",
    swap_conductor_endpoint: ""
}

async function set_config(client, config) {
    await client.post('tor_settings', config)
}

describe.skip('Tor server integration', function(){
    test('tor server get', async function(){
        const client = new HttpClient('http://localhost:3001');
        await set_config(client, tor_config);
        
        let result2 = await client.get(GET_ROUTE.FEES,{});
        console.log(result2);
    });

    test('tor server get unknown route', async function(){
        const client = new HttpClient('http://localhost:3001');
        await set_config(client, tor_config);
        
        try{
            await client.get('unknown route',{});
            expect().toBe(false);
        } catch (err){
           expect(err.response.status).toBe(400);   
        }
    });

    test('tor server post unknown route', async function(){
        const client = new HttpClient('http://localhost:3001');
        await set_config(client, tor_config);
        
        let transfer_msg1 = {
            shared_key_id: "00000000000000000000000000000000",
            statechain_sig: "00000000000000000000000000000000"
        }
        try{
            let result2 = await client.post('unknown route', transfer_msg1);
            expect().toBe(false);
        } catch(err){
            expect(err.response.status).toBe(400);
        }
    });
    
    test('tor server unprocessable request', async function(){
        const client = new HttpClient('http://localhost:3001');
        await set_config(client, tor_config);
        
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

    test('tor server post success', async function(){
        const client = new HttpClient('http://localhost:3001');
        await set_config(client, tor_config);
        
        let deposit_msg1 = {
            auth: "authstr",
            proof_key: String("029e95d1c597bd15eed0cd5fc15db25368202fc538a3a94a0b44753595f3aa4fc7")
        };

        try{
            let result = await client.post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);
            console.log(result);
        } catch(err){
            expect().toBe(false);
        }
    });
    
    
});

describe.skip('Tor server', function(){
 
    test('set/get tor config', async function(){
        const client = new HttpClient('http://localhost:3001');

        let tor_config = {
            tor_proxy : {
                ip: 'testipdfgvbcdgt',
                port: 10000,
                controlPassword: 'testPassworddfghbvfdc',
                controlPort: 10020
            }
        }
        try {
            await set_config(client, tor_config);
        } catch(err) {
            console.log(err);
            expect().toBe(false);
        }
        
        let tor_config_resp = await client.get('tor_settings',{});
        console.log(JSON.stringify(tor_config_resp));
        expect(tor_config_resp.tor_proxy).toEqual(tor_config.tor_proxy);
    });

    test('new tor id', async function(){
        const client = new HttpClient('http://localhost:3001');
        await set_config(client, tor_config);
        
        let result = await client.get('newid',{});
        console.log(JSON.stringify(result));
    });

});

