import React from 'react'

const TorCircuitNode = (props) => {
    const styleObj = {
        fontSize: 11,
        color: "#4a54f1",
    }

    return (
        <li className = { props.class } > { props.name } { props.ip ? <div style = { styleObj } > { props.ip } </div> : ''}</li>
    )
}

export default TorCircuitNode
