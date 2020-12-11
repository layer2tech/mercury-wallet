import React from 'react';
import { HomePage, SettingsPage, DepositePage } from '../index'
import { Header } from '../../components'

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import './App.css';
import SwapPage from "../Swap/Swap";
import WithdrawPage from "../Withdraw/Withdraw";
import SendStatecoinPage from "../Send_Statecoins/SendStatecoins";
import ReceiveStatecoinPage from "../Receive_Statecoins/ReceiveStatecoins";
import HelpPage from "../Help/Help";

const App = () => {
  return (
    <div className="App">
      <Router>
       <Header />
       <Switch>
         <Route path="/" exact component={() => <HomePage />} />
         <Route path="/settings" exact component={() => <SettingsPage />} />
         <Route path="/help" exact component={() => <HelpPage />} />
         <Route path="/deposit" exact component={() => <DepositePage />} />
         <Route path="/withdraw" exact component={() => <WithdrawPage />} />
         <Route path="/swap_statecoin" exact component={() => <SwapPage />} />
         <Route path="/send_statecoin" exact component={() => <SendStatecoinPage />} />
         <Route path="/receive_statecoin" exact component={() => <ReceiveStatecoinPage />} />
         <Route component={() => <HomePage />} />
       </Switch>
     </Router>
    </div>
  );
}

export default App;
