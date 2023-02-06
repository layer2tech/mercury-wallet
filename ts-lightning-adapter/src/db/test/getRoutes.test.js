const axios = require('axios');
const db = require('./db-mock.js');

const closeConnections = jest.fn();

const ENDPOINT = "http://127.0.0.1:3003"

jest.mock('./db-mock.js', () => ({
  get: jest.fn(),
}));

describe('GET /getWalletId/:name', () => {
  test('It should return the wallet id for a given name', async () => {
    // db.get.mockImplementationOnce((_, params, cb) => cb(null, { id: 1 }));

    const response = await axios.get(`${ENDPOINT}/getWalletId/Mainnet Wallet 1`);
    console.log(response)
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ wallet_id: 1 });
    // expect(db.get).toHaveBeenCalledWith('SELECT id FROM wallets WHERE name = ?', ['test-wallet'], expect.any(Function));
  });

  // test('It should return a 404 error if the wallet is not found', async () => {
  //   db.get.mockImplementationOnce((_, params, cb) => cb(null, undefined));

  //   const response = await axios.get('/getWalletId/nonexistent-wallet');
  //   expect(response.statusCode).toBe(404);
  //   expect(response.body).toEqual({ error: 'Wallet not found' });
  //   expect(db.get).toHaveBeenCalledWith('SELECT id FROM wallets WHERE name = ?', ['nonexistent-wallet'], expect.any(Function));
  // });

  // test('It should return a 500 error if there is a database error', async () => {
  //   db.get.mockImplementationOnce((_, params, cb) => cb(new Error('Database error')));

  //   const response = await axios.get('/getWalletId/test-wallet');
  //   expect(response.statusCode).toBe(500);
  //   expect(response.body).toEqual({ error: 'Database error' });
  //   expect(db.get).toHaveBeenCalledWith('SELECT id FROM wallets WHERE name = ?', ['test-wallet'], expect.any(Function));
  // });
});

// describe('GET /closeConnections', () => {
//   test('It should call the closeConnections function', async () => {
//     const response = await axios.get(`${ENDPOINT}/closeConnections`);
//     expect(response.statusCode).toBe(200);
//     expect(closeConnections).toHaveBeenCalled();
//   });
// });
