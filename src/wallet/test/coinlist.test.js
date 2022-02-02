// import React from 'react';
// import { configureStore } from '@reduxjs/toolkit';
// import { CoinsList } from '../../components';
// import Coin from '../../components/coins/Coin/Coin'
// import reducers from '../../reducers';
// // import { getWallet } from './mock_swap.test'
// import { render } from './test-utils';
// import { Wallet } from '..';
// let bitcoin = require('bitcoinjs-lib');

// // client side's mock
// let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// // // server side's mock
// let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

// let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock)

// jest.mock( '../wallet', () => {
// 	return jest.fn().mockImplementation(() => {
// 		return {
// 			wallet
// 		};
// 	});
// })

// describe('CoinList renders', function () {
//     // client side's mock
//     let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
//     // // server side's mock
//     let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

//     let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock)



//     test('CoinList and Coin render', function (){
//         let store = configureStore({ reducer: reducers, })

//         let selectedCoins = []
//         const setSelectedCoin = () => null 
//         const setSelectedCoins = () => null 
        
//         const { TestCoins } = render(store, (<CoinsList
//             displayDetailsOnClick={true}
//             selectedCoins={selectedCoins}
//             setSelectedCoins={setSelectedCoins}
//             setSelectedCoin={setSelectedCoin}
//             showCoinStatus={true}
//             largeScreen
//             isMainPage={true} />))
        
//         expect(1).toBe(1)
//     })
// })