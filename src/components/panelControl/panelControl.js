import React from 'react';
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'

import { addCoin, removeCoin } from '../../features/CoinDataSlice'
import { disp, getActivityLog } from '../../features/WalletDataSlice'
import { deposit, getRoot, getFeeInfo, getSmtProof, getStateChain } from '../../wallet'
import { Wallet, Statecoin, verifySmtProof, ACTION } from '../../wallet'
import { keyGen } from '../../wallet/mercury/ecdsa'
import walletIcon from '../../images/walletIcon.png';
import walletIconSmall from '../../images/walletIconsmallIcon.png';
import pluseIcon from '../../images/pluseIcon.png';
import swapIcon from '../../images/swap-icon.png';
import arrowUp from '../../images/arrow-up.png';
import arrowDown from '../../images/arrow-down.png';

import StdButton from '../buttons/standardButton';

import './panelControl.css';
import '../index.css';
import { Link } from "react-router-dom";
import settings from "../../images/settings-icon.png";

const PanelControl = () => {
  const dispatch = useDispatch()
  const totalAmount = useSelector(state => state.coinData.total_amount)
  const wallet = useSelector(state => state.walletData).wallet

  const createButtonAction = async () => {
    wallet.deposit()
    // let shared_key_id = "861d2223-7d84-44f1-ba3e-4cd7dd418560"
    // let secret_key = "ff2f08aab2bf90f1ce47cf2859ceb0d6453efeca232e17e4be545cb60f4d977d";
    // // // let proof_key = "02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f";
    // // // let value = 10;
    // let protocol = "Deposit";
    //
    // let [id, statecoin] = await keyGen(wallet.http_client, wasm, shared_key_id, secret_key, protocol);

    wallet.addStatecoin("861d2223-7d84-44f1-ba3e-4cd7dd418560", dummy_master_key, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", ACTION.DEPOSIT)

    let proof_key = "02c69dad87250b032fe4052240eaf5b8a5dc160b1a144ecbcd55e39cf4b9b49bfd"
    let funding_txid = "64ec6bc7f794343a0c3651c0578f25df5134322b959ece99795dccfffe8a87e9"
  }


  return (
    <div className="Body">
      <h2 className="WalletAmount">
          <img src={walletIcon} alt="walletIcon"/>
          {totalAmount} BTC
      </h2>
        <div className="no-wallet">
            <span>No Statecoins in Wallet</span>
        </div>
      <div className="ButtonsPanel">
        <div className="ActionGroupLeft">


                <Link className="nav-link" to="/deposit">
                    <StdButton
                        label="Deposit"  icon={pluseIcon}
                        onClick={createButtonAction}
                        className="Body-button blue"/>
                </Link>



          <Link className="nav-link" to="/swap_statecoin">

            <StdButton
                label="Swap" icon={swapIcon}

                className="Body-button blue"/>
          </Link>

          <Link className="nav-link" to="/withdraw">
            <StdButton
                label="Withdraw" icon={walletIconSmall}
                className="Body-button yellow"/>
          </Link>


        </div>
        <div className="ActionGroupRight">

          <Link className="nav-link" to="/send_statecoin">
            <StdButton
                label="Send" icon={arrowUp}

                className="Body-button "/>
          </Link>
          <Link className="nav-link" to="/receive_statecoin">
            <StdButton
                label="Receive" icon={arrowDown}

                className="Body-button"/>
          </Link>


        </div>
      </div>
    </div>
  );
}

export default PanelControl;


const dummy_master_key = {public:{q:{x:"47dc67d37acf9952b2a39f84639fc698d98c3c6c9fb90fdc8b100087df75bf32",y:"374935604c8496b2eb5ff3b4f1b6833de019f9653be293f5b6e70f6758fe1eb6"},p2:{x:"5220bc6ebcc83d0a1e4482ab1f2194cb69648100e8be78acde47ca56b996bd9e",y:"8dfbb36ef76f2197598738329ffab7d3b3a06d80467db8e739c6b165abc20231"},p1:{x:"bada7f0efb10f35b920ff92f9c609f5715f2703e2c67bd0e362227290c8f1be9",y:"46ce24197d468c50001e6c2aa6de8d9374bb37322d1daf0120215fb0c97a455a"},paillier_pub:{n:"17945609950524790912898455372365672530127324710681445199839926830591356778719067270420287946423159715031144719332460119432440626547108597346324742121422771391048313578132842769475549255962811836466188142112842892181394110210275612137463998279698990558525870802338582395718737206590148296218224470557801430185913136432965780247483964177331993320926193963209106016417593344434547509486359823213494287461975253216400052041379785732818522252026238822226613139610817120254150810552690978166222643873509971549146120614258860562230109277986562141851289117781348025934400257491855067454202293309100635821977638589797710978933"},c_key:"36d7dde4b796a7034fc6cfd75d341b223012720b52a35a37cd8229839fe9ed1f1f1fe7cbcdbc0fa59adbb757bd60a5b7e3067bc49c1395a24f70228cc327d7346b639d4e81bd3cfd39698c58e900f99c3110d6a3d769f75c8f59e7f5ad57009eadb8c6e6c4830c1082ddd84e28a70a83645354056c90ab709325fc6246d505134d4006ef6fec80645493483413d309cb84d5b5f34e28ab6af3316e517e556df963134c09810f754c58b85cf079e0131498f004108733a5f6e6a242c549284cf2df4aede022d03b854c6601210b450bdb1f73591b3f880852f0e9a3a943e1d1fdb8d5c5b839d0906de255316569b703aca913114067736dae93ea721ddd0b26e33cf5b0af67cee46d6a3281d17082a08ab53688734667c641d71e8f69b25ca1e6e0ebf59aa46c0e0a3266d6d1fba8e9f25837a28a40ae553c59fe39072723daa2e8078e889fd342ef656295d8615531159b393367b760590a1325a547dc1eff118bc3655912ac0b3c589e9d7fbc6d244d5860dfb8a5a136bf7b665711bf4e75fe42eb28a168d1ddd5ecf77165a3d4db72fda355c0dc748b0c6c2eada407dba5c1a6c797385e23c050622418be8f3cd393e6acd8a7ea5bd3306aafae75f4def94386f62564fce7a66dc5d99c197d161c7c0d3eea898ca3c5e9fbd7ceb1e3f7f2cb375181cf98f7608d08ed96ef1f98af3d5e2d769ae4211e7d20415677eddd1051"},private:{x2:"34c0b428488ddc6b28e05cee37e7c4533007f0861e06a2b77e71d3f133ddb81b"},chain_code:"0"}
