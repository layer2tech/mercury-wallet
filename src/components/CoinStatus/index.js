import React, { useState } from 'react'
import { 
  SendIcon, 
  InMempoolIcon,
  AwaitingConfirmIcon,
  InSwapIcon,
  AwaitingSwapIcon,
  AwaitingTransactionIcon
} from './statusIcons';
import { CopiedButton } from '../../components';

import './coinStatus.css';

const COIN_STATUS = {
  midTransfer: 'midTransfer',
  awaitingTransaction: 'awaitingTransaction',
  inMempool: 'inMempool',
  awaitingConfirm: 'awaitingConfirm',
  inSwap: 'inSwap',
  awaitingSwap: 'awaitingSwap'
};

const TYPE_STATUS_INFO = {
  midTransfer: {
    icon: <SendIcon />,
    title: 'Send Pending'
  },
  inMempool: {
    icon: <InMempoolIcon />,
    title: 'Transaction in Mempool'
  },
  awaitingConfirm: {
    icon: <AwaitingConfirmIcon />,
    title: 'Awaiting Confirmations'
  },
  inSwap: {
    icon: <InSwapIcon />,
    title: 'In Swap'
  },
  awaitingSwap: {
    icon: <AwaitingSwapIcon />,
    title: 'Awaiting Swap'
  },
  awaitingTransaction: {
    icon: <AwaitingTransactionIcon />,
    title: 'Awaiting Transaction'
  }
};

const COPIED_MESSAGE = 'Transfer Code was copied to Clipboard. Send it to the Receiver of the Transaction';
const COPIED_MESSAGE_DELAYS = 3000;
const COPIED_MESSAGE_STYLE = {
  top: 45,
  left: 0,
  width: '80%',
};

const CoinStatus = (props) => {
  const [cancelConfirm, setCancelConfirm] = useState(false);
  let status = COIN_STATUS.midTransfer;//Object.keys(COIN_STATUS)[props.data.coinStatusIndex];

  const handleCopyTransferCode = (e) => {
    if(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    navigator.clipboard.writeText('Will update real code later');
  };

  const handleCancelTransfer = (e) => {
    alert('handle cancel transfer!');
    setCancelConfirm(false);
  }

  const getStatusIcon = () => {
    return TYPE_STATUS_INFO[status]?.icon;
  };

  const getStatusDetails = () => {
    if(props.isDetails) {
      return (
        <div className="coin-status-details"> 
          <span className="coin-status-title">{TYPE_STATUS_INFO[status]?.title}</span>
          {status === COIN_STATUS.midTransfer && (
            <>
              <span 
                className="coin-mid-cancel" 
                onClick={() => setCancelConfirm(true)}
              >Cancel</span>
              {cancelConfirm && (
                <div className="coin-mid-cancel-confirm">
                  <span>Do you really want to cancel this transaction?? More details message will update later!</span>
                  <div className="coin-mid-transfer-btns">
                    <button type="button" onClick={() => setCancelConfirm(false)}>Cancel</button>
                    <button type="button" className="btn-confirm" onClick={handleCancelTransfer}>Confirm</button>
                  </div>
                </div>
              )}
              <div className="coin-status-description">
                <CopiedButton 
                  handleCopy={handleCopyTransferCode} 
                  message={COPIED_MESSAGE}
                  delay={COPIED_MESSAGE_DELAYS}
                  style={COPIED_MESSAGE_STYLE}
                >
                  <div>
                    <span 
                      className="coin-status-copy-code"
                      // onClick={handleCopyTransferCode}
                    >Click to Copy Transfer Code</span> to clipboard and send it to the Receiver.
                  </div>
                </CopiedButton>
              </div>
            </>
          )}
          {status === COIN_STATUS.awaitingConfirm && (
            <div className="coin-status-description">
              1 out of 3 confirmed, {` `}
              <span className="coin-status-copy-code">
                view on block explorer
              </span>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="coin-status-details"> 
        <span className="coin-status-title">{TYPE_STATUS_INFO[status]?.title}</span>
        {status === COIN_STATUS.midTransfer && (
          <CopiedButton
            handleCopy={handleCopyTransferCode} 
            message={COPIED_MESSAGE}
            delay={COPIED_MESSAGE_DELAYS}
            style={{
              ...COPIED_MESSAGE_STYLE,
              left: 'initial',
              right: 0,
              width: 250,
              top: 55
            }}
          >
            <div className="coin-status-copy-code">
              Copy Transfer Code
            </div>
          </CopiedButton>
        )}
      </div>
    );
  };

  return (
    <div className={`coin-status ${props.isDetails ? 'coin-status-modal' : ''}`}>
      {getStatusIcon()}
      {getStatusDetails()}
    </div>
  )
}

export default CoinStatus;
