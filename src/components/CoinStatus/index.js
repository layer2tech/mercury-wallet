import { STATECOIN_STATUS } from '../../wallet/statecoin';
import React, { useState } from 'react'
import {
  InTransferIcon,
  InMempoolIcon,
  UnconfirmedConfirmIcon,
  InSwapIcon,
  AwaitingSwapIcon,
  InitialisedIcon,
  SwapLimitIcon,
  ExpiredIcon
} from './statusIcons';
import { CopiedButton } from '../../components';
import { encodeMessage } from '../../wallet/util';
import Spinner from 'react-bootstrap/Spinner';
import './coinStatus.css';

const STATECOIN_STATUS_INFO = {
  [STATECOIN_STATUS.IN_TRANSFER]: {
    icon: <InTransferIcon />,
    title: 'Transferred'
  },
  [STATECOIN_STATUS.IN_MEMPOOL]: {
    icon: <InMempoolIcon />,
    title: 'In Mempool'
  },
  [STATECOIN_STATUS.UNCONFIRMED]: {
    icon: <UnconfirmedConfirmIcon />,
    title: 'Awaiting Confirmations'
  },
  [STATECOIN_STATUS.SWAPLIMIT]:{
    icon: <SwapLimitIcon />,
    title: 'Expiring Soon'
  },
  [STATECOIN_STATUS.EXPIRED]:{
    icon: <ExpiredIcon />,
    title: 'Expired'
  },
  [STATECOIN_STATUS.IN_SWAP]: {
    icon: <InSwapIcon />,
    title: 'In Swap'
  },
  [STATECOIN_STATUS.AWAITING_SWAP]: {
    icon: <AwaitingSwapIcon />,
    title: 'Awaiting Swap'
  },
  [STATECOIN_STATUS.INITIALISED]: {
    icon: <InitialisedIcon />,
    title: 'Awaiting BTC Deposit'
  },
  [STATECOIN_STATUS.DELETED]:{
    icon: <Spinner animation="border" variant="danger" size="sm"/>,
    title: 'Deleting...'
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
  const status = props?.data?.status;

  const handleCopyTransferCode = (e) => {
    if(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    navigator.clipboard.writeText(encodeMessage(props?.data?.transfer_msg));
  };

  const handleCancelTransfer = (e) => {
    setCancelConfirm(false);
  }

  const getStatusIcon = () => {
    return STATECOIN_STATUS_INFO[status]?.icon;
  };

  const getStatusDetails = () => {
    if(props.isDetails) {
      return (
        <div className="coin-status-details">
          <span className="coin-status-title">{STATECOIN_STATUS_INFO[status]?.title}</span>
          {status === STATECOIN_STATUS.IN_TRANSFER && (
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
          {status === STATECOIN_STATUS.UNCONFIRMED && (
            <div className="coin-status-description">
              {props?.data?.expiry_data.confirmations < 0 ? '--' : `${props?.data?.expiry_data.confirmations} out of 3 confirmations`} 
              {/* <span className="coin-status-copy-code">
                view on block explorer
              </span> */}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="coin-status-details">
        <span className="coin-status-title">{STATECOIN_STATUS_INFO[status]?.title}</span>
        {status === STATECOIN_STATUS.IN_TRANSFER && (
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
              Copy Code
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
