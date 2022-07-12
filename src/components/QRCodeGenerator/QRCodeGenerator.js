import React from 'react';
import './qrcode.css'
let QRCode = require('qrcode.react');

//Generates a BTC QR code from a p address and an amount passed through as props

const QRCodeGenerator = (props) => {

  const makeQRCodeString = (address, amount) => "bitcoin:"+address+"?amount="+amount;
  
  return(
    <div className='qr-code'>
      <QRCode value={makeQRCodeString(props.address, props.amount)}
      level='H'
    />
    </div>
  )
}

export default QRCodeGenerator;