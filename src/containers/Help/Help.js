'use strict';
import question from "../../images/question-blue.png";

import React from 'react';
import {Link, withRouter} from "react-router-dom";
import {Tab, Tabs} from "react-bootstrap";

import { StdButton } from '../../components/'

import './Help.css';
import TermsConditions from "../../components/TermsConditions/TermsConditions";
import { useSelector } from "react-redux";


const HelpPage = (props) => {
  const walletLoaded = useSelector(state => state.walletData).walletLoaded
  const version = require("../../../package.json").version;
  
  return (
    <div className="container">
      <div className="Body help">
          <div className="swap-header">
              <h2 className="main-header">
                  <img src={question} alt="question"/>
                  Help & Support
              </h2>
              <div>
                  <Link className="nav-link" to={walletLoaded ? "/home" : "/"}>
                      <StdButton
                          label="Back"
                          className="Body-button transparent"/>
                  </Link>
              </div>
          </div>
          <ul className="list">
              <li><a target="_blank" href="https://docs.mercurywallet.com/" rel="noopener noreferrer">Docs</a></li>
              <li><a target="_blank" href="https://twitter.com/mercury_wallet" rel="noopener noreferrer">Social</a></li>
              <li><a target="_blank" href="https://github.com/commerceblock/mercury-wallet/issues" rel="noopener noreferrer">Report bugs</a></li>
          </ul>
      </div>
        <div className="Body help-tabs">
            <Tabs defaultActiveKey="About">
                <Tab eventKey="About" title="About">
                    <div className="content">
                        <span className="title">{version} </span>
                        <h6><b>Mercury wallet</b> is a cross-platform GUI for the Mercury protocol written in node.js using Electron.</h6>

                        <p>Mercury is an implementation of a layer-2 statechain protocol that enables off-chain transfer and settlement of Bitcoin outputs that remain under the full custody of the owner at all times, while benefitting from instant and negligible cost transactions. The ability to perform this transfer without requiring the confirmation (mining) of on-chain transactions has advantages in a variety of different applications. The Mercury Wallet operates with the Mercury protocol to enable users to keep secure custody of their Bitcoin while benefitting from fast, secure and private off-chain transactions. </p>

                        <p>The essential function of the Mercury system is that it enables ownership (and control) of a Bitcoin output (a <b>statecoin</b>) to be transferred between two parties (who don't need to trust each other) via the Mercury server without an on-chain transaction. The Mercury server only needs to be trusted to operate the protocol (and crucially not store any information about previous key shares) and then the transfer of ownership is completely secure, even if the Mercury server was to later get compromised or hacked. At any time the server can prove that they have the key share for the current owner (and only to the current owner). A statecoin owner also possesses a proof that their ownership is unique via a statechain - immutable and unique sequences of verifiable ownership transfer. The current owner signs a statechain transaction with an owner key to transfer ownership to a new owner (i.e. a new owner key). This means that any theft of a coin can be independently and conclusively proven.</p>

                        <p>A central feature of the Mercury wallet is the ability to perform atomic swaps of equal value statecoins in blinded groups facilitated by a so-called 'conductor' that cannot learn who swapped coins with who. This protocol employs a blind signature scheme to prevent any party from being able to reconstruct the coin history, providing Mercury users with a very powerful privacy tool. Due to the design of the Mercury protocol, all of these swaps occur off-chain, meaning they can happen very quickly and for zero additional transaction fees, leading to much bigger anonymity sets than is possible with a single on-chain coinjoin.</p>
                    </div>
                </Tab>
                <Tab eventKey="Privacy Policy" title="Privacy Policy">
                    <div className="content">
                        <span className="title">Privacy policy</span>
                        <p>Mercury Wallet has developed this Privacy Statement to explain how it collects, stores, uses and protects personally identifiable information when users visit its website and use its services. This Privacy Statement does not apply to third-party websites or services which Mercury Wallet does not own or control including websites or services with advertisements or URL links hosted on the Mercury Wallet sites.</p>
                        <p>Please contact the Mercury Wallet team (main@mercurywallet.com) if you have any questions about its privacy practices that are not addressed in this Privacy Statement.</p>
                        <p>Please note: Layer Two Limited provides written user support only. Mercury does not offer phone support and will never call, e-mail or get in touch in any form with users to offer any wallet recovery services. Users are advised to be safe and guard their wallet information and funds. If you see any signs of abuse in this regard, please contact our Legal Team (main@mercurywallet.com)</p>
                        <h6>Definitions</h6>
                        <p>“Device data” is information that is automatically collected from any device used to access the Mercury Wallet website. This information may include, but is not limited to, the device type; the device’s network connections; the device’s name; the device’s IP address, and information about the device’s web browsers and internet connection being used to access the Mercury Wallet website. </p>
                        <p>“Layer Two Limited” is a limited liability, International Business Company registered in the Republic of Seychelles. References to Layer Two Limited include references to its holding subsidiaries, affiliates and business enterprises.</p>
                        <p>“Mercury Wallet” means Mercury Wallet, its subsidiaries and affiliates as owned and operated by Layer Two Limited.</p>
                        <p>“Personally Identifiable Information”, “personal data” or “personal information” has the meaning provided in the EU General Data Protection Regulation of 2018 and includes any information about a specific person which is directly associated with an individual and can be used for the purpose of identifying that individual such as name, mailing address, email address, IP address and telephone number.</p>
                        <p>“Processing” of personal data means any operation or set of operations performed on personal data, whether or not by automated means, such as collection, recording, organisation, structuring, storage, adaption, retrieval, consultation, erasure, or destruction of Personally Identifiable Information.</p>
                        <p>“Services” means any products, services, content features, technologies or functions and all related services offered by Mercury Wallet.</p>
                        <p>“Technical Usage Data” means information collected from a site visitor’s computer, phone, or any other device used to access the Mercury Wallet website. Technical Usage Data tells Mercury Wallet about how the visitor has used the website, such as the search terms and page views on the website and the way that the website is used by the visitor. This includes information about the user’s IP address, statistics regarding how pages are loaded or viewed, the websites visited before coming to the website and other usage and browsing information collected through cookies.</p>
                        <h6>Collection of Personal Identifiable Information</h6>
                        <p>The Mercury Wallet protocol does not require the indication of any Personally Identifiable Information. All transactions using Mercury Wallet are confidential and anonymous.</p>
                        <p>Mercury Wallet does not collect, store or use Personally Identifiable Information except as provided by the user voluntarily in the following situations:</p>
                        <ul>
                            <li>Users may voluntarily provide their email addresses for the purposes of customer support. These email addresses are only used solely for the purpose of resolving the user’s questions.</li>
                            <li>Users may voluntarily enrol or opt-in for notifications regarding potential technical problems or other information.</li>
                        </ul>
                        <p>Mercury Wallet will process this Personally Identifiable Information as necessary to offer and fulfil the customer support requested.</p>
                        <p>At any time a user may “opt out” of the receipt of email communications related to technical information or customer support through emailing main@mercurywallet.com</p>
                        <p>In all such cases, Personally Identifiable Information provided by the user is permanently erased one hundred (100) days after the resolution of the customer service query or the purpose for which it was provided to Mercury Wallet. Mercury Wallet does not retain any Personally Identifiable Information from interactions with users relating to their technical questions and issues.</p>
                        <p>Mercury Wallet cannot link User Wallets with Personally Identifiable Information including but not limited to names and IP addresses. Therefore, a user’s Personally Identifiable Information is not able to be accessed by the staff of Mercury Wallet, its subsidiaries or holding company. </p>
                        <h6>Third Party Sharing, links and social media plug-ins</h6>
                        <p>Mercury Wallet will not transfer any Personally Identifiable Information to any third parties.</p>
                        <p>The Mercury Wallet website may contain links to third-party websites, services or social media plugins not affiliated with, endorsed by, or under the control of Mercury Wallet. Mercury Wallet will not be liable for any losses or damage caused to the user as a result of the use of these third-party websites, services or social media platforms. Mercury Wallet is not responsible for the contents, accuracy, or availability of these websites or their links, advertisements or offerings. </p>
                        <p>Layer Two Limited makes no representations or warranties about the policies of third party websites that are linked to Mercury Wallet or any of its services. Layer Two Limited recommends that the user read the privacy policies posted by those third party websites.</p>
                        <h6>Cookies and Technical Usage Data</h6>
                        <p>A cookie is a small piece of data stored on a user’s computer or mobile device which allows a website to track actions and preferences over time. </p>
                        <p>The Mercury Wallet app does not use cookies. The Mercury Wallet website may use cookies and other tracking technologies when a visitor visits the website to log user statistics and website traffic. Mercury Wallet will use this information to improve the services delivered to users, to track and diagnose performance problems and to administer the website and perform analytics. A User can control the use of cookies at the individual browser level, but disabling cookies, may limit the use of certain features or functions on our website or service.</p>
                        <h6>Changes to the policy</h6>
                        <p>Layer Two Limited reserves the right to change this policy from time to time by publication of the revised policy on the Mercury Wallet website.</p>
                    </div>
                </Tab>
                <Tab eventKey="Terms of use" title="Terms of use">
                    <TermsConditions />
                </Tab>
            </Tabs>

        </div>
    </div>
  )
}

export default withRouter(HelpPage);
