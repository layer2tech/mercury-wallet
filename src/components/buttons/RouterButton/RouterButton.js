'use strict';
import React  from "react";
import { Link } from "react-router-dom";
import StdButton from '../standardButton';
import '../RouterButton/RouterButton.css';

function RouterButton({route: route, label: label, icon: icon, class: classes, tooltip: tooltip = undefined }){
    return(
        <div className={`router-button ${label}`}>
            <Link to={route}>
                <StdButton
                    label={label} icon={icon}
                    className={classes}/>
                {tooltip ? (
                    <span className = "tooltip" >
                        <div>{tooltip}</div>
                    </span>
                ) : (null)}
            </Link>
        </div>
    )
}

export default RouterButton;