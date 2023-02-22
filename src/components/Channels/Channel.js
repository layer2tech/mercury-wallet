import React from "react";
import { useSelector } from 'react-redux';
import { ProgressBar } from "react-bootstrap";
import lightningLogo from '../../images/lightning_logo.png';
import '../coins/coins.css';
import './Channel.css';
import { CopiedButton } from '../';
import copy_img from "../../images/icon2.png";
import { CHANNEL_STATUS } from "../../wallet/channel";

const Channel = (props) => {

    const selectChannel = (channel_id) => {
        props.setSelectedChannel(channel_id);
    }

    const isSelected = (channel_id) => {
        let selected = false;
        if (props.selectedChannels === undefined) {
          selected = props.selectedChannel === channel_id;
        } else {
          props.selectedChannels.forEach((selectedChannel) => {
            if (selectedChannel === channel_id) {
              selected = true;
            }
          });
        }
        return selected;
      };
    
    const copyAddressToClipboard = (event, address) => {
      event.stopPropagation()
      navigator.clipboard.writeText(address);
    }

    return(
        <div>
            <div 
                className={`coin-item ${isSelected(props.channel_data.id) ? "selected" : ""}`}
                onClick={() => {
                    selectChannel(props.channel_data.id);
                }}
                >


                <div className = "CoinPanel">


                    <div className="CoinAmount-block">
                        <img src={lightningLogo} alt="icon" className="privacy" />
                        <span className="sub">
                                <b className = "CoinAmount" > {props.channel_data.amount} Sats</b>
                                    <div className="scoreAmount">
                                        Node Alias
                                    </div>
                        </span>
                    </div>

                    {(props.channel_data.status === CHANNEL_STATUS.INITIALISED) ?
                      <div className="progress_bar" >
                          <div className="deposit-scan-main-item">
                            <>
                              <CopiedButton handleCopy={(event) => copyAddressToClipboard(event, props.channel_data.funding.addr)} >
                                <img type="button" src={copy_img} alt="icon" />
                              </CopiedButton>
                              <span className="long">
                                <b>{props.channel_data.peer_pubkey}</b>
                              </span>
                            </>
                          </div>
                          <div className="sub">
                              <ProgressBar>                     
                              <ProgressBar 
                                  striped variant={ 'success' }
                                  now={50}
                                  key={1} />
                              </ProgressBar>
                          </div>
                      </div>
                    : <></>}



                    <b className="CoinFundingTxid">
                        <img src={lightningLogo} className="sc-address-icon" alt="icon" />
                        {props.channel_data.id}
                    </b>

                </div>
            </div>
        </div>
    )
}

export default React.memo(Channel, (prevProps, nextProps) => {
    if (
      prevProps.channel_data !== nextProps.channel_data ||
      prevProps.selectedChannel !== nextProps.selectedChannel ||
      prevProps.selectedChannels !== nextProps.selectedChannels ||
      prevProps.render !== nextProps.render
    ) {
      return false;
      // will rerender if these props change
    } else {
      return true;
      // will not rerender
    }
  });