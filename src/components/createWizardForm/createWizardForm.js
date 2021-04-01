import React, {useRef, useState } from 'react';
import {useForm} from "react-hook-form";
import eyeIcon from "../../images/eye-icon.svg";
import eyeIconOff from "../../images/eye-icon-off.svg";

import './createWizardForm.css'


const CreateWizardForm = (props) => {
    const {register, errors, watch, handleSubmit} = useForm({mode: 'onChange', reValidateMode: 'onChange',});
    const [showPass, setShowPass] = useState(false);
    const password = useRef({});
    password.current = watch("password", "");

    const toggleShowPass = () => setShowPass(!showPass);

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
                  <input 
                    id="Passphrase" 
                    type={showPass ? 'text' : 'password'} name="password"
                    placeholder="Passphrase (min 8 characters)"
                    onChange={props.setStateWalletPassword}
                    ref={register({
                       minLength: {
                           value: 8,
                           message: "Password must have at least 8 characters"
                       }
                    })}
                    />
                    <span className={'eye-icon'} onClick={toggleShowPass}>
                        {showPass ? <img src={eyeIconOff} /> : <img src={eyeIcon} />}
                    </span>
                </div>
                <div className="error">
                    {errors.password && <p>{errors.password.message}</p>}
                </div>

                <div className="inputs-item">
                  <input id="password_repeat" type={showPass ? 'text': 'password'} name="password_repeat"
                    placeholder="Confirm Passphrase"
                    ref={register({
                       validate: value =>
                           value===password.current || "The passwords do not match"
                    })}/>
                    <span className={'eye-icon'} onClick={toggleShowPass}>
                        {showPass ? <img src={eyeIconOff} /> : <img src={eyeIcon} />}
                    </span>
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
