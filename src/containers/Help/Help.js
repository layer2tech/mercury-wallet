import question from "../../images/question-blue.png";

import React from 'react';
import {Link, withRouter} from "react-router-dom";
import {Tab, Tabs} from "react-bootstrap";
import { useSelector } from 'react-redux'

import { StdButton } from '../../components/'

import './Help.css';


const HelpPage = () => {
  const version = useSelector(state => state.walletData).version;

  return (
    <div className="container">

      <div className="Body help">
          <div className="swap-header">
              <h2 className="WalletAmount">
                  <img src={question} alt="question"/>
                  Help & Support
              </h2>
              <div>
                  <Link className="nav-link" to="/">
                      <StdButton
                          label="Back"
                          className="Body-button transparent"/>
                  </Link>
              </div>
          </div>
          <ul className="list">
              <li><a target="_blank" href="https://docs.mercurywallet.com/" rel="noopener noreferrer">Docs</a></li>
              <li><a target="_blank" href="https://t.me/CommerceBlock" rel="noopener noreferrer">Social</a></li>
              <li><a target="_blank" href="https://github.com/commerceblock/mercury-wallet/issues" rel="noopener noreferrer">Report bugs</a></li>
          </ul>
      </div>
        <div className="Body help-tabs">
            <Tabs defaultActiveKey="About">
                <Tab eventKey="About" title="About">
                    <div className="content">
                        <span className="title">v. {version} </span>
                        <p>About content here ...</p>
                    </div>
                </Tab>
                <Tab eventKey="Privacy Policy" title="Privacy Policy">
                    <div className="content">
                        <span className="title">Title</span>
                        <p>Privacy Policy content here ...</p>
                    </div>


                </Tab>
                <Tab eventKey="Terms of use" title="Terms of use">
                    <div className="content">
                        <span className="title">Title</span>
                        <p>Terms of use content here ...</p>
                    </div>


                </Tab>

            </Tabs>

        </div>
    </div>
  )
}

export default withRouter(HelpPage);
