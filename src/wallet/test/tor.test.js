import { Tor } from '../tor';

jest.setTimeout(30000);

describe.skip('Tor integration', function(){
    const tor = new Tor('localhost', 9050, 'password', 9051);
    test('tor-rp', async function() {
        await tor.confirmNewTorConnection();
    });
});

describe('Tor', function(){
    test('tor constructor', async function() {
        const tor = new Tor('localhost', 9050, 'password', 9051);
    });
});