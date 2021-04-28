import { Tor } from '../tor';

jest.setTimeout(30000);

const tor = new Tor('localhost', 9050, 'lawrence', 9051);

test('tor-rp', async function() {
    await tor.confirmNewTorConnection();
});