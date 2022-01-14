import { makeTesterStatecoin } from './test_data.js'
import { swapPhase0, SWAP_STATUS } from "../swap/swap";
import { STATECOIN_STATUS } from '../statecoin'
import { SwapRetryError } from '../swap/swap'

// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

describe('swapPhase0 test 1 - incorrect initial statecoin phase', () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase1;
  //////////////////////////////////////////////////

  it('should throw coin is in wrong swap protocol', async () => {
    const input = () => {
      return swapPhase0(http_mock, statecoin);
    }
    const output = 'Coin is not yet in this phase of the swap protocol. In phase: Phase1';
    await expect(input()).rejects.toThrowError(output);
  });
})

describe('swapPhase0 test 2 - correct initial statecoin phase', () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase0;
  let swap_id = "12345";
  // swapPhase0 calls post to: swap/poll/utxo
  // which takes an id as parameter (the swap_id)
  // mockReturnValueOnce({...}) means: the first time give null to post 
  // the second time give swap id to post
  http_mock.post = jest.fn().mockReset()
    .mockReturnValueOnce({ id: null })    // return once null => swap has not started
    .mockReturnValueOnce({ id: swap_id }) // return once an id => swap has begun
  //////////////////////////////////////////////////


  it('should have swap_status Phase0, swap_id null', async () => {
    // swap not yet begun
    await swapPhase0(http_mock, statecoin)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase0)
    expect(statecoin.swap_id).toBe(null)
  })

  it('should have swap_status Phase1, swap_id not null', async () => {
    // swap begun
    await swapPhase0(http_mock, statecoin)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase1)
    expect(statecoin.swap_id).not.toBe(null)
    expect(statecoin.swap_id.id).toBe(swap_id)
  })
})

describe('swapPhase0 test 3 - coin is not awaiting swap', () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = null;
  //////////////////////////////////////////////////

  it('should throw coin not in awaiting swap', async () => {
    const input = () => {
      return swapPhase0(http_mock, statecoin);
    }
    const output = 'Statecoin status is not in awaiting swap';
    await expect(input()).rejects.toThrowError(output);
  })
})

describe('swapPhase0 test 4 - poll with no swap_id', () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase0;
  //////////////////////////////////////////////////

  it('should throw SwapRetryError', async () => {
    const input = () => {
      return swapPhase0(http_mock, statecoin);
    }
    await expect(input()).rejects.toThrow(SwapRetryError);
  })
})

describe('swapPhase0 test 5 - incorrect statechain_id', () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase0;
  statecoin.statechain_id = null;
  //////////////////////////////////////////////////

  it('should throw error incorrect statechain_id', async () => {
    const input = () => {
      return swapPhase0(http_mock, statecoin);
    }
    const output = 'statechain id is invalid';
    await expect(input()).rejects.toThrow(output);
  })
})