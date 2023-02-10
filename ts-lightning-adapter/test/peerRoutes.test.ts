import request from 'supertest';
import express from 'express';
import router from '../src/routes/peerRoutes';

jest.mock('../src/LDK/init/importLDK', () => {
  return {
    getLDKClient: jest.fn().mockImplementation(() => {
      return {
        createPeerAndChannel: jest.fn().mockImplementation(() => {})
      };
    })
  };
});

jest.mock('../src/LDK/utils/ldk-utils', () => {
  return {
    createNewPeer : jest.fn(() => {
      return Promise.resolve({ status: 200, message: 'Peer created' });
    })
  }
});

describe('Peer Routes', () => {

  let app: any;
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(router);
  });

  it('POST /connectToPeer', async () => {
    const res = await request(app)
      .post('/connectToPeer')
      .send({
        amount: '100000',
        pubkey: '028a822f5b0e4400d4a230dc619d13cc10f75ec6c277b495124d5bcb3ccbdaac54',
        host: '127.0.0.1',
        port: '9735',
        channel_name: 'test_channel',
        push_msat: '10',
        wallet_name: 'Mainnet Wallet 1',
        config_id: '1'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "Connected to peer, Channel created" });
  });

  it('POST /newPeer', async () => {

    const response = await request(app)
      .post('/newPeer')
      .send({ 
        host: '127.0.0.1',
        port: '9735',
        pubkey: '028a822f5b0e4400d4a230dc619d13cc10f75ec6c277b495124d5bcb3ccbdaac54'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 200, message: 'Peer created' });
  });
  
  it('GET /getPeer returns a peer if found', async () => {
    const response = await request(app).get('/getPeer/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("node");
    expect(response.body).toHaveProperty("host");
    expect(response.body).toHaveProperty("port");
    expect(response.body).toHaveProperty("pubkey");
  });

  it('GET /getPeer returns 404 if peer is not found', async () => {
    const response = await request(app).get('/getPeer/not-found');

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: 'Peer not found' });
  });
});