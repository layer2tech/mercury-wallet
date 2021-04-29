import { Tor } from '../tor';

jest.setTimeout(30000);

describe.skip('Tor integration', function(){
    test('tor new connection ', async function() {
        const tor = new Tor('localhost', 9050, 'password', 9051);
        let result = await tor.confirmNewTorConnection();
    });

    test('tor get json', async function() {
        const tor = new Tor('localhost', 9050, 'password', 9051, 'http://api.ipify.org?format=json');
        let result = await tor.get(undefined,undefined);
    });

    test('tor post', async function() {
        const tor = new Tor('localhost', 9050, 'password', 9051, 'https://httpbin.org');
        let result = await tor.post('post','testbody');
    });
});

describe('Tor', function(){
    test('tor constructor', async function() {
        const tor = new Tor('localhost', 9050, 'password', 9051);
    });
});