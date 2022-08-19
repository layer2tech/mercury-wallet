'use strict';
import { useState, useEffect } from 'react';
import { HashRouter as Router, Route, Switch } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { WelcomePage, CreateWalletInfoPage, CreateWalletWizardPage, HomePage, DepositPage, WithdrawPage, SettingsPage, HelpPage,
SendStatecoinPage, ReceiveStatecoinPage, SwapPage, BackupTxPage, LoadWalletPage, RestoreWalletPage } from '../index'
import { getWalletName, setWalletLoaded } from '../../features/WalletDataSlice';
import { Header } from '../../components'


import './App.css';
import './AppDarkMode.css';

const App = () => {
  // State tell header whether wallet is loaded: home is Home page
  // or not: home is Welcome screen
  const walletLoaded = useSelector(state => state.walletData).walletLoaded
  const dispatch = useDispatch();
  const [online, setOnline] = useState(navigator.onLine);

  const { dark_mode } = useSelector(state => state.themeData);

  let walletName;

  if(walletLoaded){

    walletName = getWalletName();

  }

  const version = require("../../../package.json").version;

  async function darkMode() {
    if (dark_mode === '1') {
      if (window.darkMode !== undefined) {
        await window.darkMode.on()
      }
      document.body.classList.add('dark-mode');
    } else {
      if (window.darkMode !== undefined) {
        await window.darkMode.off()
      }
      document.body.classList.remove('dark-mode');
    }
  }

  if (typeof window.addEventListener !== "function") {
      console.log("no window.addEventListener");
      document.body.ononline = () => setOnline(true);
      document.body.onoffline = () => setOnline(false);
  }

  if (typeof window.addEventListener === "function") {
    console.log("adding online/offline event listeners")
    window.addEventListener("online", () => setOnline(true), false);
    window.addEventListener("offline", () => setOnline(false), false);
  }

  const handleWalletLoad = (isLoaded) => {
    dispatch(setWalletLoaded({loaded: isLoaded}))
  }

  useEffect(() => {

    darkMode()

  }, [dark_mode]);

  return (
    <div className={`App ${dark_mode === '1' ? 'dark-mode': ''}`}>
      {walletLoaded ? <title>Mercury Wallet {version} - {walletName} </title> : <title>Mercury Wallet {version}</title>}
      <Router>
      <Header walletLoaded={walletLoaded} setWalletLoaded={handleWalletLoad} online = {online} />
      <Switch>
        <Route path="/" exact component={() => <WelcomePage />} />
        <Route path="/create_wallet" exact component={() => <CreateWalletInfoPage />} />
        <Route path="/create_wizard" exact component={() => <CreateWalletWizardPage setWalletLoaded={handleWalletLoad}/>} />
        <Route path="/load_wallet" exact component={() => <LoadWalletPage setWalletLoaded={handleWalletLoad}/>} />
        <Route path="/restore_wallet" exact component={() => <RestoreWalletPage setWalletLoaded={handleWalletLoad}/>} />
        <Route path="/home" exact component={() => <HomePage online = {online}/>} />
        <Route path="/settings" exact component={() => <SettingsPage setWalletLoaded={handleWalletLoad}/>} />
        <Route path="/help" exact component={() => <HelpPage walletLoaded={walletLoaded}/>} />
        <Route path="/deposit" exact component={() => <DepositPage />} />
        <Route path="/withdraw" exact component={() => <WithdrawPage />} />
        <Route path="/swap_statecoin" exact component={() => <SwapPage />} />
        <Route path="/send_statecoin" exact component={() => <SendStatecoinPage />} />
        { walletLoaded === false ? (null):(<Route path="/receive_statecoin" exact component={() => <ReceiveStatecoinPage />} />)}
        <Route path="/backup_tx" exact component={() => <BackupTxPage />} />
        <Route component={() => <WelcomePage />} />
       </Switch>
     </Router>
    </div>
  );
}

export default App;
