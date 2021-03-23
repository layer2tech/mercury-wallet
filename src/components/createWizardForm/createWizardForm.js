import React, {useRef} from 'react';
import {useForm} from "react-hook-form";

import './createWizardForm.css'

const CreateWizardForm = (props) => {
    const {register, errors, watch, handleSubmit} = useForm({mode: 'onChange', reValidateMode: 'onChange',});
    const password = useRef({});
    password.current = watch("password", "");

    function onSubmit(data) {
        props.onSubmit()
    }

    return (
        <div className="wizard-form">
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="inputs-item">
                  <input id="Name" type="text" name="Wallet Name" placeholder="Wallet Name"
                    value={props.wizardState.wallet_name}
                    onChange={props.setStateWalletName}
                    required/>
                </div>
                <div className="inputs-item">
                    <p>Enter a password for your wallet. Leave blank for no password.</p>
                </div>

                <div className="inputs-item">
                  <input id="Passphrase" type="password" name="password"
                    placeholder="Passphrase (min 8 characters)"
                    onChange={props.setStateWalletPassword}
                    ref={register({
                       minLength: {
                           value: 8,
                           message: "Password must have at least 8 characters"
                       }
                    })}
                    />

                </div>
                <div className="error">
                    {errors.password && <p>{errors.password.message}</p>}
                </div>

                <div className="inputs-item">
                  <input id="password_repeat"type="password" name="password_repeat"
                    placeholder="Confirm Passphrase"
                    ref={register({
                       validate: value =>
                           value===password.current || "The passwords do not match"
                    })}/>

                </div>
                <div className="error">
                    {errors.password_repeat && <p>{errors.password_repeat.message}</p>}
                </div>


                <div className="inputs-item checkbox">
                    <input id="terms" type="checkbox" name="terms"
                           required/>
                    <label htmlFor="terms">I have read and agree to the Terms of Use</label>
                </div>
                <button type="submit" className="btn btn-primary">Next</button>
            </form>
        </div>
    )
}

export default CreateWizardForm;
