'use strict';
import walletIcon from '../../images/walletIcon.png';
import statechainIcon from '../../images/statechainIcon.png';
import lightningLogo from '../../images/lightning_logo.png'
import minusIcon from '../../images/minus.svg'
import pluseIcon from '../../images/pluseIcon.png';
import swapIcon from '../../images/swap-icon.png';
import arrowUp from '../../images/arrow-up.png';
import arrowDown from '../../images/arrow-down.png';

import './panelControl.css';
import '../index.css';
import RouterButton from '../buttons/RouterButton/RouterButton';
import MainHeader from '../MainHeader/MainHeader';
import { WALLET_MODE } from '../../features/WalletDataSlice';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';

const PanelControl = () => {

  const { walletMode } = useSelector((state) => state.walletData)
  
  const [data, setData] = useState( PANEL_CONTROL_BTC );

  
  useEffect(()=> {
    if(walletMode === WALLET_MODE.STATECHAIN){
      if(data !== PANEL_CONTROL_BTC){
        setData(PANEL_CONTROL_BTC)
      }
    } else{
      if(data !== PANEL_CONTROL_LN){
        setData(PANEL_CONTROL_LN)
      }
    }
  }, [walletMode, data])
  

  return (
    <div className="Body panelControl">
      <MainHeader 
        mainUnit = {data.MainHeader.mainUnit}
        icon = {data.MainHeader.icon}/>

      <div className="ButtonsPanel">
        <div className="ActionGroupLeft">
          {
            data.ActionGroupLeft.map(item => {
              return(
                <RouterButton 
                  route = {item.route}
                  label = {item.label}
                  icon = {item.icon}
                  class = {item.class}
                  tooltip = {item.tooltip}/>
              )
            })
          }

        </div>
        <div className="ActionGroupRight">
        {
            data.ActionGroupRight.map(item => {
              
              return(
                <>
                <RouterButton 
                  route = {item.route}
                  label = {item.label}
                  icon = {item.icon}
                  class = {item.class}
                  tooltip = {item.tooltip}/>
                </>
              )
            })
          }
        </div>
      </div>
    </div>
  );
}


const PANEL_CONTROL_BTC = {
  MainHeader: {
    mainUnit: "BTC",
    icon: statechainIcon
  },
  ActionGroupLeft: [
    {
      route: "/deposit",
      label: "Deposit",
      icon: pluseIcon,
      class: "Body-button blue",
      tooltip: "Deposit BTC"
    },{
      route: "/withdraw",
      label: "Withdraw",
      icon: minusIcon,
      class: "Body-button blue",
      tooltip: "Withdraw BTC"
    }
  ],
  ActionGroupRight: [
    {
      route: "/swap_statecoin",
      label: "Swap",
      icon: swapIcon,
      class: "Body-button blue",
      tooltip: "Swap Statecoins"
    },{
      route: "/send_statecoin",
      label: "Send",
      icon: arrowUp,
      class: "Body-button blue",
      tooltip: "Send Statecoins"
    },{
      route: "/receive_statecoin",
      label: "Receive",
      icon: arrowDown,
      class: "Body-button blue",
      tooltip: "Receive Statecoins"
    }
  ]
}

const PANEL_CONTROL_LN = {
  MainHeader: {
    mainUnit: "sats",
    icon: lightningLogo
  },
  ActionGroupLeft: [
    {
      route: "/deposit_ln",
      label: "Deposit",
      icon: pluseIcon,
      class: "Body-button blue",
      tooltip: "Open channel"
    },{
      route: "/withdraw_ln",
      label: "Withdraw",
      icon: minusIcon,
      class: "Body-button blue",
      tooltip: "Close channel"
    }
  ],
  ActionGroupRight: [{
      route: "/send_ln",
      label: "Send",
      icon: arrowUp,
      class: "Body-button blue",
      tooltip: "Send sats"
    },{
      route: "/receive_ln",
      label: "Receive",
      icon: arrowDown,
      class: "Body-button blue",
      tooltip: "Receive sats"
    }
  ]
}

export default PanelControl;
