import request from 'supertest';
import express from 'express';
import router from '../src/routes/channelRoutes';

jest.mock('../src/LDK/init/importLDK', () => {
  return {
    getLDKClient: jest.fn(() => {
      return {
        getChannels: jest.fn(() => {
          return [{
            get_channel_id: jest.fn(() => 'abc123'),
            get_funding_txo: jest.fn(() => 'txo456'),
            get_channel_type: jest.fn(() => 'public'),          
          }];
        }),
        getActiveChannels: jest.fn(() => {
          return [];
        })
      };
    }),
  };
});

jest.mock('../src/LDK/utils/ldk-utils', () => {
  return {
    createNewChannel : jest.fn(() => {
      return Promise.resolve({ status: 201, message: 'Channel saved and created successfully' });
    })
  }
});

describe('Channel Routes', () => {
  let app: any;
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(router);
  });

  it('GET /LDKChannels', async () => {
    const response = await request(app).get('/LDKChannels');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ channelId: 'abc123', fundingTxo: 'txo456', channelType: 'public' });
  });

  it('GET /activeChannels', async () => {
    const response = await request(app).get('/activeChannels');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expect.any(Array));
  });

  it("GET /loadChannels should return channels for the given wallet_id", async () => {
    const response = await request(app).get('/loadChannels/1');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expect.any(Array));
  });

  it("GET /loadChannels should return 404 with no chanel found", async () => {
    const response = await request(app).get('/loadChannels/invalid');
    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "Channel not found" });
  });

  it('GET /loadChannels/walletName should return 200 and the list of channels for a given wallet name', async () => {
    const response = await request(app).get('/loadChannels/walletName/Mainnet Wallet 1');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expect.any(Array));
  });

  it('GET /loadChannels/walletName should return 404 if the wallet with the given name does not exist', async () => {
    const response = await request(app).get('/loadChannels/walletName/nonexistentWallet')
    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: 'Wallet not found' });
  });

  it('POST /createChannel should return 200 and the created channel details on success', async () => {
    const response = await request(app)
      .post('/createChannel')
      .send({
        pubkey: 'abc123',
        name: 'Test Channel',
        amount: '100000',
        push_msat: '1000',
        config_id: '1',
        wallet_name: 'Mainnet Wallet 1',
        peer_id: '2'
      })
    expect(response.statusCode).toBe(201);
    expect(response.body).toBeTruthy();
  });

  it('PUT /updateChannel should update a channel by id', async () => {
    const response = await request(app)
      .put('/updateChannel/1')
      .send({
        name: 'Test Channel',
        amount: 100,
        push_msat: 10,
        config_id: 1,
        wallet_id: 1
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Channel updated successfully' });
  });

  it('DELETE /deleteChannel should delete a channel with a given id', async () => {
    const response = await request(app)
      .delete('/deleteChannel/1')
      .expect(200);

    expect(response.body).toEqual({ message: 'Data deleted successfully' });
  });
});
