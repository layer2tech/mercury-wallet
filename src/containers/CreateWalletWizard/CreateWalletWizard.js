import React from 'react';
import {Link, withRouter} from "react-router-dom";

import MultiStep from "react-multistep";
import { CreateWizardForm, ConfirmSeed, DisplaySeed } from "../../components";

import './CreateWalletWizard.css'

let bip39 = require('bip39');

const mnemonic = bip39.generateMnemonic();
const rands = [Math.floor(Math.random()*11),Math.floor(Math.random()*11),Math.floor(Math.random()*11)]

const steps = [
    {component: <CreateWizardForm />},
    {component: <DisplaySeed mnemonic={mnemonic}/>},
    {component: <ConfirmSeed mnemonic={mnemonic} rands={rands}/>}
];


const CreateWizardPage = () => {
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

export default withRouter(CreateWizardPage);
