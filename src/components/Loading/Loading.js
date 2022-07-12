'use strict';
import React from 'react';

import './Loading.css';

const Loading = (props) => {
    return(
        <p className="loading" id="loading">{props.title ? (`${props.title}`): ("Loading")}</p>
    )
}

export default Loading