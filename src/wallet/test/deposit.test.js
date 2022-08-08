import { tokenInit, tokenVerify } from "../mercury/deposit"
import { TOKEN_INIT, TOKEN_VERIFY } from "../mocks/mock_http_client";

// server side's mock

describe('Deposit', function(){
    
    let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
    test('Token Init: Successful Call', async function(){

        http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(TOKEN_INIT);

        let tokenAmount = 500;

        let token = await tokenInit(http_mock, tokenAmount);


        expect(token.btc).toBe(TOKEN_INIT.btc_payment_address);
        expect(token.ln).toBe(TOKEN_INIT.lightning_invoice);
        expect(token.id).toBe(TOKEN_INIT.token_id)
        
    })
    
    test('Token Init: Failed Call', async function(){
        http_mock.get = jest.fn().mockReset()
        .mockImplementation(() => {
            throw new Error('Server Error')
        });
        let tokenAmount = 500;

        await expect(tokenInit(http_mock, tokenAmount))
            .rejects.toThrowError(Error('Server Error'));
        
    })

    test('Token Verify: Successful Call', async function(){

        http_mock.get = jest.fn().mockReset()
            .mockReturnValueOnce(TOKEN_VERIFY);
        
        let verify = await tokenVerify(http_mock, TOKEN_INIT.token_id);

        expect(verify).toBe(TOKEN_VERIFY)

    })

    test('Token Verify: Server Error', async function(){
    
        http_mock.get = jest.fn().mockReset()
            .mockImplementation(() => {
                throw new Error('Server Error')
            });
        
        await expect(tokenVerify(http_mock, TOKEN_INIT.token_id))
            .rejects.toThrowError(Error('Server Error'))
    })
})