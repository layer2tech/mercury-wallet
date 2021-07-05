import React from 'react';

let QRCode = require('qrcode.react');

//Generates a BTC QR code from a p address and an amount passed through as props

const QRCodeGenerator = (props) => {

    const makeQRCodeString = (address, amount) => "bitcoin:"+address+"?amount="+amount;

    return(
        <QRCode value={makeQRCodeString(props.address, props.amount)}
        level='H'
      />
    )
}

export default QRCodeGenerator;