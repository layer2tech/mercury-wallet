import React from 'react';
import { HomePage, SettingsPage, AboutPage } from '../index'
import Header from '../../components/header'

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import './App.css';

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <Router>
         <Header />
         <Switch>
           <Route path="/" exact component={() => <HomePage />} />
           <Route path="/settings" exact component={() => <SettingsPage />} />
           <Route path="/about" exact component={() => <AboutPage />} />
         </Switch>
       </Router>
      </div>
    );
  }
}

export default App;
