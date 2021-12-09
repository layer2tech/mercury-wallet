/* 
    TODO - see if you can optimize the useEffect call
    clean up the render method
    see why relay nodes and onion addresses render before the circuit nodes
    put real onion address for the onion address

    CHECK - why clicking new circuit is not always instant -> async
*/

import React,  {useEffect, useState} from 'react'
import {useDispatch} from 'react-redux';
import { callGetNewTorId, callGetTorcircuitInfo, callUpdateTorCircuit } from '../../../features/WalletDataSlice';
import './torCircuit.css'
import TorCircuitNode from './TorCircuitNode'
import {callGetConfig} from '../../../features/WalletDataSlice'
import {defaultWalletConfig} from '../../../containers/Settings/Settings'


const TorCircuit = (props) => {

    const dispatch = useDispatch();

    const [torLoaded, setTorLoaded] = useState(false);
    const [torcircuitData, setTorcircuitData] = useState([]);

    let current_config;
    try {
      current_config = callGetConfig();
    } catch {
      current_config = defaultWalletConfig()
    }

    const getTorCircuitInfo = () => {
        dispatch(callUpdateTorCircuit());
        let torcircuit_data = callGetTorcircuitInfo();
        console.log('useEffect: ', torcircuit_data);
        let torcircuit_array = torcircuit_data ? torcircuit_data : [];
        if(torcircuitData !== []){
            setTorcircuitData(torcircuit_array);
            setTorLoaded(true);
        }
    }

    useEffect(() => {
        // every 3 seconds check tor circuit info - TODO check if can optimize this
        const interval = setInterval(() => {
            getTorCircuitInfo();
        }, 3000);
        return () => clearInterval(interval);
    }, [dispatch]);

    const newCircuit = () => {
        // call /newId or new_tor_id()
        //dispatch(callGetNewTorId());
        dispatch(callGetNewTorId()).then(() => {
            getTorCircuitInfo();
        });
    }

    return (
        <div class="dropdown">
            <TorIcon/>
            <div class="dropdown-content">
                { torLoaded ? ( 
                <div>
                    <ul>
                        <TorCircuitNode className='passed' name='Mercury Wallet'></TorCircuitNode>
                        {torcircuitData.map((circuit, index) => (
                            <TorCircuitNode className='passed' name={circuit.country} ip={circuit.ip}></TorCircuitNode>
                        ))}
                        <TorCircuitNode className='passed' name='Relay'></TorCircuitNode>
                        <TorCircuitNode className='passed' name='Relay'></TorCircuitNode>
                        <TorCircuitNode className='passed' name='Relay'></TorCircuitNode>
                        {/* <TorCircuitNode className='current' name={current_config.state_entity_endpoint}></TorCircuitNode> */}
                        {<TorCircuitNode className='current' name='Onion Address'></TorCircuitNode>}
                    </ul>
                    <button class='Body-button' onClick={newCircuit}>New circuit</button>
                </div>) :  
                (<div>
                    <p>Couldn't establish connection to tor</p>
                </div> )
                }
            </div>
        </div>
    )
}

export const TorIcon = () => (
    <svg fill="#ffffff" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 100 100" width="30px" height="30px"><path d="M 50 19.779297 C 33.321237 19.779297 19.779297 33.321249 19.779297 50 C 19.779297 66.678751 33.321237 80.220703 50 80.220703 C 66.678764 80.220703 80.220703 66.678752 80.220703 50 C 80.220703 33.321248 66.678764 19.779297 50 19.779297 z M 50 21.779297 C 65.597884 21.779297 78.220703 34.402127 78.220703 50 C 78.220703 65.597873 65.597884 78.220703 50 78.220703 C 34.402116 78.220703 21.779297 65.597873 21.779297 50 C 21.779297 34.402127 34.402116 21.779297 50 21.779297 z M 50 25.5 A 0.50005 0.50005 0 0 0 49.5 26 L 49.5 31 L 49.5 41 L 49.5 58 L 49.5 64 L 49.5 69 L 49.5 74 A 0.50005 0.50005 0 0 0 50 74.5 C 58.958967 74.5 66.80007 69.688456 71.072266 62.505859 A 0.50009517 0.50009517 0 1 0 70.212891 61.994141 C 66.197552 68.744899 58.884163 73.252466 50.5 73.433594 L 50.5 69.488281 C 61.031582 69.221658 69.5 60.595404 69.5 50 C 69.5 46.236515 68.431509 42.71684 66.582031 39.736328 A 0.50005 0.50005 0 1 0 65.732422 40.263672 C 67.486945 43.09116 68.5 46.425485 68.5 50 C 68.5 60.051467 60.485615 68.178233 50.5 68.449219 L 50.5 64.480469 C 53.330803 64.383888 55.961674 63.485559 58.15625 61.990234 A 0.50005 0.50005 0 1 0 57.59375 61.164062 C 55.563546 62.547388 53.118771 63.324703 50.5 63.423828 L 50.5 58.476562 C 55.494834 58.228679 59.5 54.319473 59.5 49.5 C 59.5 48.1241 59.173127 46.818911 58.589844 45.652344 A 0.50005 0.50005 0 1 0 57.695312 46.097656 C 58.212029 47.131089 58.5 48.2819 58.5 49.5 C 58.5 53.741809 54.966652 57.147601 50.5 57.404297 L 50.5 41.574219 C 52.122302 41.666169 53.638791 42.126298 54.886719 42.953125 A 0.50005 0.50005 0 1 0 55.4375 42.119141 C 54.024173 41.182726 52.328145 40.607769 50.5 40.517578 L 50.5 36.550781 C 57.724232 36.819292 63.5 42.709527 63.5 50 C 63.5 52.977166 62.538132 55.723329 60.908203 57.955078 A 0.50005 0.50005 0 1 0 61.714844 58.544922 C 63.464915 56.148671 64.5 53.192834 64.5 50 C 64.5 42.166477 58.269258 35.791404 50.5 35.525391 L 50.5 31.546875 C 55.020366 31.669299 59.143152 33.370341 62.292969 36.173828 A 0.50005 0.50005 0 1 0 62.957031 35.427734 C 59.630023 32.466538 55.273261 30.644822 50.5 30.523438 L 50.5 26.550781 C 63.247818 26.823168 73.5 37.186504 73.5 50 C 73.5 53.258151 72.837994 56.360045 71.640625 59.179688 A 0.50005 0.50005 0 1 0 72.560547 59.570312 C 73.809178 56.629956 74.5 53.393849 74.5 50 C 74.5 36.474788 63.525212 25.5 50 25.5 z"/></svg>);
  
export default TorCircuit
