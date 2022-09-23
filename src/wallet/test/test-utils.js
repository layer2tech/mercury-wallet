import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';


import { isWalletLoaded, walletFromJson } from '../../features/WalletDataSlice';
import { MOCK_WALLET_PASSWORD } from '../wallet';

import Semaphore from 'semaphore-async-await';

export const semaphore = new Semaphore(1);

function render(
    mockStore,
    ui,
    {
        preloadedState,
        store = mockStore,
        ...renderOptions
    } = {}
) {
    function Wrapper({children}) {
        return <Provider store={store}><Router>{children}</Router></Provider>
    }
    return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}
// edit preloaded state to test different state variables


const TestComponent = ({wallet_json ,dispatchUsed = false, fn, args = [], password = MOCK_WALLET_PASSWORD}) => {
    semaphore.acquire();
    /*

    Mock Component for Testing function that manipulates redux state

    Instructions:

        1) Pass the wallet_json file to be loaded to state
        2) Pass the function to be tested as 'fn'
        3) The arguments of the function should be passed in order in a list (excluding dispatch)
        4a) If dispatch is used, ensure it is the first argument of the function used in 2) as fn
        b) Pass dispatchUsed = true

    */

    const dispatch = useDispatch()
    
    

    const fireEvent = async () => {
        if (!isWalletLoaded()) {
            await walletFromJson(wallet_json, password)
        }
        semaphore.release();
        if(dispatchUsed){
            fn(dispatch,...args)
        }
        else{
            fn(...args)
        }
    }

    return(
        <div className = {'function-tester'} onClick={() => fireEvent()}>FireFunction</div>
    )
}

export default TestComponent
// re-export everything
export * from '@testing-library/react'
// override render method
export { render }
