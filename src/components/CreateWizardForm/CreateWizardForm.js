import React, {useRef} from 'react';
import './CreateWizardForm.css'
import {useForm} from "react-hook-form";


const CreateWizardForm = () => {
    const {register, errors, handleSubmit, watch} = useForm({mode: 'onChange', reValidateMode: 'onChange',});
    const password = useRef({});
    password.current = watch("password", "");


    return (
        <div className="wizard-form">
            <form>

                <div className="inputs-item">
                    <input id="Name" type="text" name="Wallet Name" placeholder="Wallet Name"
                           required/>

                </div>
                <div className="inputs-item">
                    <p>Details on what the passphrase is used for, what makes for a secure passphrase.</p>
                </div>

                <div className="inputs-item">
                    <input id="Passphrase" type="password" name="password" required
                           placeholder="Passphrase (min 8 characters)"
                           ref={register({
                               required: "You must specify a password",
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
                    <input id="password_repeat" type="password" name="password_repeat" placeholder="Confirm Passphrase"
                           required
                           ref={register({
                               validate: value =>
                                   value === password.current || "The passwords do not match"
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


            </form>


        </div>
    )
}

export default CreateWizardForm;
