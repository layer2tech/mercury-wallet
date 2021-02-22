import React from 'react';
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import { HomePage, DepositPage, WithdrawPage, SettingsPage, HelpPage,
SendStatecoinPage, ReceiveStatecoinPage, SwapPage, BackupTxPage } from '../index'
import { Header } from '../../components'


import './App.css';
import Welcome from "../Welcome/Welcome";
import CreateWallet from "../CreateNewWallet/CreateWallet";
import CreateWizard from "../CreateWizard/CreateWizard";
import MemoryForm from "../MemoryForm/MemoryForm";

const App = () => {
  return (
    <div className="App">
      <Router>
      <Header />
      <Switch>
        <Route path="/" exact component={() => <Welcome />} />
        <Route path="/create_wallet" exact component={() => <CreateWallet />} />
        <Route path="/create_wizard" exact component={() => <CreateWizard />} />
        <Route path="/memory_form" exact component={() => <MemoryForm />} />
        <Route path="/home" exact component={() => <HomePage />} />
        <Route path="/home/load" exact component={() => <HomePage load={true}/>} />
        <Route path="/settings" exact component={() => <SettingsPage />} />
        <Route path="/help" exact component={() => <HelpPage />} />
        <Route path="/deposit" exact component={() => <DepositPage />} />
        <Route path="/withdraw" exact component={() => <WithdrawPage />} />
        <Route path="/swap_statecoin" exact component={() => <SwapPage />} />
        <Route path="/send_statecoin" exact component={() => <SendStatecoinPage />} />
        <Route path="/receive_statecoin" exact component={() => <ReceiveStatecoinPage />} />
        <Route path="/backup_tx" exact component={() => <BackupTxPage />} />
       </Switch>
     </Router>
    </div>
  );
}

export default App;
