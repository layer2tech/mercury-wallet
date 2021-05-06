import { HttpClient, GET_ROUTE, POST_ROUTE } from '../http_client';

jest.setTimeout(30000);

describe.skip('Tor server', function(){
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