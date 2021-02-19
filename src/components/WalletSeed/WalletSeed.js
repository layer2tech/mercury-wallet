import React from 'react';

import '../WalletSeed/WalletSeed.css'
import copy from '../../images/copy-image.png';

import {Wallet} from "../../wallet";
import * as bitcoin from "bitcoinjs-lib";
import useClipboard from "react-use-clipboard";


const WalletSeed = () => {

    let wallet;
    try {
        wallet = Wallet.load(false)
        console.log("wallet loaded")
    } catch {
        wallet = Wallet.buildFresh(false, bitcoin.networks.testnet);
    }

    let seed = wallet.getMnemonic()
    let keywords = seed.split(" ");
    console.log(JSON.stringify(keywords))
    const inputs = keywords.map((item, index) => (
        <input key={index} type="text" placeholder={index + 1 + ". " + item} disabled/>
    ))
    const [isCopied, setCopied] = useClipboard(JSON.stringify(keywords));

    return (
        <div className="wizard-form inputs">
            <p>
                The list of 24 words below is the recovery seed key for the wallet you are creating.
                <b>Carefully write down and store your seed somewhere safe, as it provides access to your wallet.</b>
            </p>
            <p>
                For best practice, never store it online or on the same computer as the wallet. The seed key is the only
                way to
                recover your wallet if your computer is lost, stolen or stops working. There is no way to recover the
                seed if lost.
            </p>

            <form>
                {inputs}
            </form>

            <div className="copy" onClick={setCopied}>
                <img src={copy} alt="copy-icon"/>
                <span> Copy Seed to Clipboard</span>
            </div>
        </div>
    )
}

export default WalletSeed;
