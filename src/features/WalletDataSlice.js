import { createSlice } from '@reduxjs/toolkit'
import { Wallet, Statecoin, verifySmtProof } from '../wallet'

const initialState = {
  wallet: Wallet.buildMock()
}

const WalletSlice = createSlice({
  name: 'walletData',
  initialState,
  reducers: {

  }
})

export const { disp, getActivityLog } = WalletSlice.actions
export default WalletSlice.reducer
