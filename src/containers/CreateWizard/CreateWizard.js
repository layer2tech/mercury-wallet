import React from 'react';
import {Link, withRouter} from "react-router-dom";
import './CreateWizard.css'

import MultiStep from "react-multistep";
import CreateWizardForm from "../../components/CreateWizardForm/CreateWizardForm";
import WalletSeed from "../../components/WalletSeed/WalletSeed";
import ConfirmSeed from "../../components/ConfirmSeed/ConfirmSeed";

let bip39 = require('bip39');

const mnemonic = bip39.generateMnemonic();
const rands = [Math.floor(Math.random()*11),Math.floor(Math.random()*11),Math.floor(Math.random()*11)]

const steps = [
    {component: <CreateWizardForm />},
    {component: <WalletSeed mnemonic={mnemonic}/>},
    {component: <ConfirmSeed mnemonic={mnemonic} rands={rands}/>}
];


const CreateWizard = () => {
    return (
        <div className="container wizard">
            <MultiStep steps={steps}/>
            <div className="btns">
              <Link to="/" >
                go back
              </Link>
            </div>
        </div>
    )
}

export default withRouter(CreateWizard);
