import React from 'react';
import { StdButton } from '../../components/'
import './Help.css';

import {Link, withRouter} from "react-router-dom";
import question from "../../images/question-blue.png";
import {Tab, Tabs} from "react-bootstrap";



const HelpPage = () => {
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
              <li><a href="#">Docs</a></li>
              <li><a href="#">Social</a></li>
              <li><a href="#">Report bugs</a></li>
          </ul>
      </div>
        <div className="Body help-tabs">
            <Tabs defaultActiveKey="About">
                <Tab eventKey="About" title="About">
                    <div className="content">
                        <span className="title">Title</span>
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
