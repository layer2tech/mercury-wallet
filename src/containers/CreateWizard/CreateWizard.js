import React from 'react';
import {Link, withRouter} from "react-router-dom";
import './CreateWizard.css'

import MultiStep from "react-multistep";
import CreateWizardForm from "../../components/CreateWizardForm/CreateWizardForm";
import WalletSeed from "../../components/WalletSeed/WalletSeed";
import ConfirmSeed from "../../components/ConfirmSeed/ConfirmSeed";

const steps = [
    {component: <CreateWizardForm/>},
    {component: <WalletSeed/>},
    {component: <ConfirmSeed/>}
];


const CreateWizard = () => {
    return (
        <div className="container wizard">
            <MultiStep steps={steps}/>
        </div>
    )
}

export default withRouter(CreateWizard);
