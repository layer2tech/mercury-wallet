import { HashRouter as Router, Route, Switch } from "react-router-dom";
import React, {useState} from 'react';

import { WelcomePage, CreateWalletInfoPage, CreateWalletWizardPage, HomePage, DepositPage, WithdrawPage, SettingsPage, HelpPage,
SendStatecoinPage, ReceiveStatecoinPage, SwapPage, BackupTxPage, LoadWalletPage, RestoreWalletPage } from '../index'
import { Header } from '../../components'

import './App.css';
import './AppDarkMode.css';

const App = () => {
  // State tell header whether wallet is loaded: home is Home page
  // or not: home is Welcome screen
  const [walletLoaded, setWalletLoaded] = useState(false);

  return (
    <div className="App">
      <Router>
      <Header walletLoaded={walletLoaded} setWalletLoaded={setWalletLoaded} />
      <Switch>
        <Route path="/" exact component={() => <WelcomePage />} />
        <Route path="/create_wallet" exact component={() => <CreateWalletInfoPage />} />
        <Route path="/create_wizard" exact component={() => <CreateWalletWizardPage setWalletLoaded={setWalletLoaded}/>} />
        <Route path="/load_wallet" exact component={() => <LoadWalletPage setWalletLoaded={setWalletLoaded}/>} />
        <Route path="/restore_wallet" exact component={() => <RestoreWalletPage setWalletLoaded={setWalletLoaded}/>} />
        <Route path="/home" exact component={() => <HomePage />} />
        <Route path="/settings" exact component={() => <SettingsPage setWalletLoaded={setWalletLoaded}/>} />
        <Route path="/help" exact component={() => <HelpPage walletLoaded={walletLoaded}/>} />
        <Route path="/deposit" exact component={() => <DepositPage />} />
        <Route path="/withdraw" exact component={() => <WithdrawPage />} />
        <Route path="/swap_statecoin" exact component={() => <SwapPage />} />
        <Route path="/send_statecoin" exact component={() => <SendStatecoinPage />} />
        <Route path="/receive_statecoin" exact component={() => <ReceiveStatecoinPage />} />
        <Route path="/backup_tx" exact component={() => <BackupTxPage />} />
        <Route component={() => <WelcomePage />} />
       </Switch>
     </Router>
    </div>
  );
}

export default App;
