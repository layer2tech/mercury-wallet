import React from 'react'

import { 
  SendIcon, 
  InMempoolIcon,
  AwaitingConfirmIcon,
  InSwapIcon,
  AwaitingSwapIcon,
  AwaitingTransactionIcon
} from './statusIcons';

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
    title: 'Awaiting Confirmations (1/3)'
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

const CoinStatus = (props) => {
  const randomStatus = Math.floor(Math.random() * (Object.keys(COIN_STATUS).length - 1));
  let status = Object.keys(COIN_STATUS)[randomStatus];

  const handleCopyTransferCode = (e) => {
    e.preventDefault();
    e.stopPropagation();
    alert('handle copy transfer code');
  }

  const getStatusIcon = () => {
    return TYPE_STATUS_INFO[status]?.icon;
  };

  const getStatusDetails = () => {
    return (
      <div className="coin-status-details"> 
        {props.isDetails ? 'Details' : null}
        <span className="coin-status-title">{TYPE_STATUS_INFO[status]?.title}</span>
        {status === COIN_STATUS.midTransfer && (
          <div 
            className="coin-status-copy-code"
            onClick={handleCopyTransferCode}
          >
            Copy Transfer Code
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="coin-status">
      {getStatusIcon()}
      {getStatusDetails()}
    </div>
  )
}

export default CoinStatus;
