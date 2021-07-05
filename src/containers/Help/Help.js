import question from "../../images/question-blue.png";

import React from 'react';
import {Link, withRouter} from "react-router-dom";
import {Tab, Tabs} from "react-bootstrap";

import { StdButton } from '../../components/'

import './Help.css';
import TermsConditions from "../../components/TermsConditions/TermsConditions";


const HelpPage = (props) => {
  const version = require("../../../package.json").version;
  return (
    <div className="container">
      <div className="Body help">
          <div className="swap-header">
              <h2 className="WalletAmount">
                  <img src={question} alt="question"/>
                  Help & Support
              </h2>
              <div>
                  <Link className="nav-link" to={props.walletLoaded ? "/home" : "/"}>
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
                        <p>This policy describes the ways Mercury collects, stores, uses and protects personal information. The purpose of this policy is to ensure that Mercury complies with applicable data protection laws and regulations, and ensures that users are provided privacy protection.
    Data protection laws are generally relevant in case any processing of personal data is concerned. The terms used within the scope of this data protection declaration are defined in and by the General Data Protection Regulation of the European Union. As such, the wide definition of "processing" of personal data means any operation or set of operations performed on personal data.</p>
                        <h6>Personally Identifiable Information</h6>
                        <p>“Personally identifiable information” (“personal information”) is any information that can be directly associated with a specific person and can be used to identify that person. A prime example of identifiable information is a person’s name.</p>

                        <h6>Handling Information</h6>
                        <p>    The Mercury protocol and wallet are designed to be used without indication of any personal data. For this reason we do not have any kind of data collecting solutions built into our products. There may only be one personal data processing in our Service, for customer support in case of technical problems: visitors may indicate their email addresses voluntarily to get notifications in case of any potential technical problems or other inquiries. These e-mail addresses are solely used to answer users’ questions and are erased after 100 days. In this case, the processing of the data is based on a freely given consent to Article 6 (1) (a) of the GDPR and is aimed at the effective handling of the complaint.
    We use GitHub as the main platform for users’ technical questions and issues, and we do not retain any data that can be subsequently identified / associated with the user.
    We expressly declare that we do not manage or store any other personally identifiable information.
    By visiting the Website and using our Services, You agree with this policy, in accordance with Section 1.2 of the Terms and Conditions</p>
                        <h6>All User Information is Confidential</h6>
                        <p>Because we cannot link user wallets and personal information (such as names and IP address) provided under the Service, Your personal information is safe and cannot be accessed by our staff or third parties.
    Mercury will protect processed data in the customer Service process adequately against unauthorized access (of third parties) in accordance with the provisions of the legal framework of Seychelles. We will only process data which are essential to provide our Services. Data will not be used or stored by other means than set out in this document and are made accessible only to a restricted and necessary number of persons. We do not transfer any personal data to third parties.</p>
                        <h6>Use of Cookies</h6>
                        <p>A cookie is a small piece of data that a website asks Your browser to store on Your computer or mobile device. The cookie allows the website to “remember” Your actions or preferences over time.
    We expressly declare that we do not use cookies.</p>
                        <h6>External links, Social media plugins</h6>
                        <p>In so far as the Website contains external links, we hereby indicate that these third-party websites are not subject to the influence and control of Mercury. We disclaim all liability for losses or obligations related to the use of these third-party websites. We are not responsible for the contents, availability, correctness, or accuracy of these websites, nor for their offerings, links, or advertisements.
    For the social media sites’ Privacy Policy please visit their own websites and research their corresponding policies.</p>
                        <h6>Changes to this policy</h6>
                        <p>We may amend this policy at any time by posting a revised version on our website. The revised version will be effective at the time we post it. In addition, if the revised version includes any substantial changes to the manner in which Your personal information will be processed, we will provide You with 30 days prior notice by posting notification of the change on the “Privacy Policy” area of our website.</p>
                        <h6>Contact details regarding this declaration</h6>
                        <p>In case You have any questions concerning Mercury's Privacy Policy or if You would like to exercise Your right of information, rectification or deletion, please send us a written request outlining Your desire to: legal@mercurywallet.com.</p>


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
