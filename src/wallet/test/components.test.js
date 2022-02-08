import React from 'react';
import reducers from '../../reducers';
import TestComponent, { render } from './test-utils';
import { fireEvent, screen } from '@testing-library/dom';
import SwapStatus from '../../components/coins/SwapStatus/SwapStatus'
import { configureStore } from '@reduxjs/toolkit';

describe('SwapStatus', function(){
    let store = configureStore({ reducer: reducers, })
    
    test('Error Messaging', function(){
        render(store, 
            <SwapStatus 
                swap_error = {{msg: "not found in swap"}} />)
                
        expect(screen.getAllByText(/awaiting timeout/i)).toBeTruthy()
        
        render(store, 
            <SwapStatus 
            swap_error = {{msg: "In punishment list: Seconds remaining: 90"}} />)
            
        expect(screen.getAllByText(/1 mins/i)).toBeTruthy()
    })
    test('throw unexpected values in props', function (){
        render(store, <SwapStatus swap_error = {12345} />)
        render(store, <SwapStatus swap_error = {true} />)
        
        
        
    })

})