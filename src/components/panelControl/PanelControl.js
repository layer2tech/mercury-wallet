'use strict';
import statechainIcon from '../../assets/images/statechainIcon.png';
import lightningLogo from '../../assets/images/lightning_logo.png'
import minusIcon from '../../assets/images/minus.svg'
import pluseIcon from '../../assets/images/pluseIcon.png';
import swapIcon from '../../assets/images/swap-icon.png';
import arrowUp from '../../assets/images/arrow-up.png';
import arrowDown from '../../assets/images/arrow-down.png';

import './PanelControl.css';
import '../index.css';
import RouterButton from '../Buttons/RouterButton/RouterButton';
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
        <div className="ActionGroupLeft" key="ActionGroupLeft">
          {
            data.ActionGroupLeft.map(item => {
              return(
                <RouterButton 
                  key = {item.label}
                  route = {item.route}
                  label = {item.label}
                  icon = {item.icon}
                  class = {item.class}
                  tooltip = {item.tooltip}/>
              )
            })
          }

        </div>
        <div className="ActionGroupRight" key="ActionGroupRight">
        {
            data.ActionGroupRight.map(item => {
              
              return(
                <div key = {item.label}>
                  <RouterButton
                    route = {item.route}
                    label = {item.label}
                    icon = {item.icon}
                    class = {item.class}
                    tooltip = {item.tooltip}/>
                </div>
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
      label: "Open Channel",
      icon: pluseIcon,
      class: "Body-button blue",
      tooltip: "Open channel"
    },{
      route: "/withdraw_ln",
      label: "Close Channel",
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
