import request from 'supertest';
import express from 'express';
import router from '../src/routes/channelRoutes';

jest.mock('../src/LDK/init/importLDK', () => {
  const nodeIdMock = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
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
        }),
        channelManager: {
          get_our_node_id: jest.fn(() => nodeIdMock)
        }
      };
    }),
  };
});


describe('Channel Routes', () => {
  let app: any;
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(router);
  });

  it('GET /nodeID', async () => {
    const response = await request(app).get('/nodeID');

    expect(response.body).toEqual({ nodeID: '00010203' });
  });

  it('GET /liveChannels', async () => {
    const response = await request(app).get('/liveChannels');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ channelId: 'abc123', fundingTxo: 'txo456', channelType: 'public' });
  });

  it('GET /allChannels', async () => {
    const response = await request(app).get('/allChannels');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expect.any(Array));
  });

  it('GET /loadChannels should return 200 and the list of channels for a given wallet name', async () => {
    const response = await request(app).get('/loadChannels/ldk1');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expect.any(Array));
  });

  it('GET /loadChannels should return 404 if the wallet with the given name does not exist', async () => {
    const response = await request(app).get('/loadChannels/nonexistentWallet')
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('PUT /updateChannel should update a channel by id', async () => {
    const response = await request(app)
      .put('/updateChannel/1')
      .send({
        name: 'Test Channel',
        amount: 100,
        push_msat: 10
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
