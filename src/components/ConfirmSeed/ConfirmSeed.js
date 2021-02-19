import React from 'react';
import './ConfirmSeed.css'
import {Link} from "react-router-dom";
import {Wallet} from "../../wallet";
import * as bitcoin from "bitcoinjs-lib";


const ConfirmSeed = () => {

    let wallet;
    try {
        wallet = Wallet.load(false)
        console.log("wallet loaded")
    } catch {
        wallet = Wallet.buildFresh(false, bitcoin.networks.testnet);
    }

    let seed = wallet.getMnemonic()

    let keywords = seed.split(" ");
    keywords[5] = "";
    keywords[2] = "";
    keywords[6] = "";
    const inputs = keywords.map((item, index) => (
        <input key={index} type="text" placeholder={index + 1 + ". " + item} disabled={item === '' ? "" : "disabled"}/>
    ))

    return (
        <div className="wizard-form-confirm">
            <p>Click below or type in the missing words to confirm your seed key.</p>

            <form>
                {inputs}
            </form>
            <Link to="/home" className="confirm">
                Confirm
            </Link>
        </div>
    )
}

export default ConfirmSeed;
