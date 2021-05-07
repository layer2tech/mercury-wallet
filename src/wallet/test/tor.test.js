import { HttpClient, GET_ROUTE, POST_ROUTE } from '../http_client';

jest.setTimeout(30000);

describe('Tor server', function(){
    test('tor server get', async function(){
        const client = new HttpClient('http://localhost:3001');
        
        let result2 = await client.get(GET_ROUTE.FEES,{});
    });

    test('tor server get unknown route', async function(){
        const client = new HttpClient('http://localhost:3001');
        
        try{
            await client.get('unknown route',{});
            expect().toBe(false);
        } catch (err){
           expect(err.response.status).toBe(404);   
        }
    });

    test('tor server post unknown route', async function(){
        const client = new HttpClient('http://localhost:3001');
        
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
    
    test('tor server unprocessable request', async function(){
        const client = new HttpClient('http://localhost:3001');
        
        let transfer_msg1 = {
            shared_key_id: "00000000000000000000000000000000",
            statechain_sig: "00000000000000000000000000000000"
        }
        try{
            let result2 = await client.post(POST_ROUTE.TRANSFER_SENDER, transfer_msg1);
            expect().toBe(false);
        } catch(err){
            expect(err.response.status).toBe(422);
        }
    });

    test('tor server post success', async function(){
        const client = new HttpClient('http://localhost:3001');
        
        let deposit_msg1 = {
            auth: "authstr",
            proof_key: String("029e95d1c597bd15eed0cd5fc15db25368202fc538a3a94a0b44753595f3aa4fc7")
        };

        try{
            let result = await client.post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);
        } catch(err){
            expect().toBe(false);
        }
    });
    
});