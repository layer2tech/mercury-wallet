import React from 'react';
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import { HomePage, DepositPage, WithdrawPage, SettingsPage, HelpPage,
SendStatecoinPage, ReceiveStatecoinPage, SwapPage, BackupTxPage } from '../index'
import { Header } from '../../components'


import './App.css';

const App = () => {
  return (
    <div className="App">
      <Router>
       <Header />
       <Switch>
         <Route path="/" exact component={() => <HomePage />} />
         <Route path="/settings" exact component={() => <SettingsPage />} />
         <Route path="/help" exact component={() => <HelpPage />} />
         <Route path="/deposit" exact component={() => <DepositPage />} />
         <Route path="/withdraw" exact component={() => <WithdrawPage />} />
         <Route path="/swap_statecoin" exact component={() => <SwapPage />} />
         <Route path="/send_statecoin" exact component={() => <SendStatecoinPage />} />
         <Route path="/receive_statecoin" exact component={() => <ReceiveStatecoinPage />} />
         <Route path="/backup_tx" exact component={() => <BackupTxPage />} />
         <Route component={() => <HomePage />} />
       </Switch>
     </Router>
    </div>
  );
}

export default App;
