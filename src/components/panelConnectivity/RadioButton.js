'use strict';
import React from 'react';

const RadioButton = (props) => {
    return (
    <div className={`connection-title Connection${props.connection}`}>
        <label>
            <input
                readOnly
                type="radio"
                checked={props.checked || false}
            />
            {props.condition ?("Connected"):("Connecting") } to {props.connection}
            <span className="checkmark"></span>
        </label>
    </div>
    )
}

export default RadioButton;