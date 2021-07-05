import React from 'react';

import {Tab} from 'react-bootstrap';

const TermsConditions = () => {
    return(
    <div className="content">
        <span className="title">Summary</span>
        <p>The Mercury team is committed to be fully transparent to its users, from its source code to the legal aspects of its services. </p>
        <p>The most important parts of the document below is summarized in the following points:</p>
        <ul>
            <li>The wallet and service is open-source under the GNU General Public License.</li>
            <li>The service is provided on a non-custodial basis. Safekeeping of keys is the sole responsibility of the user. </li>
            <li>Users are responsible for the timely broadcast of timelocked backup transactions. Both the server and wallet perform this function automatically, but cannot be held responsible for failures. </li>
            <li>The user is solely responsible to act according to their local laws and regulations.</li>
            <li>We do not store any personally identifiable information. </li>
            <li>A percentage fee is only charged by Mercury upon withdrawal from the service. </li>
            <li>We only provide written support, and NEVER ask for recovery words, passwords or similar security critical information.</li>
        </ul>

        <p>The services are provided between remote parties and therefore these terms and conditions cannot be individually negotiated with clients. This document will help each of our clients to understand exactly the terms and conditions under which we can provide our services. We recommend you to first learn the basics of Bitcoin before starting to use our services.</p>
        <p>PLEASE READ THE BELOW TERMS AND CONDITIONS CAREFULLY. BY CLICKING AGREE, OR BY ACCESSING OR DOWNLOADING OUR SOFTWARE (AS DEFINED BELOW), YOU AGREE TO BE BOUND BY THESE TERMS OF USE AND ALL TERMS INCORPORATED BY REFERENCE.</p>

        <h4>Terms and Conditions</h4>
        <p>If you are accepting these terms on behalf of an entity, you confirm that you are authorized on behalf of that entity to agree to be bound by these Terms of Use and all terms incorporated by reference.</p>
        <h6>Scope</h6>
        <p>This binding Agreement is between</p>
        <p>- Mercury Ltd. (“Service Provider” or “we”, which includes our subsidiaries, partners, affiliates, agents, employees, licensors, service providers or subcontractors (if any)) and</p>
        <p>- the person, persons, or entity (“You” or “Your”) using the Services (as defined below).</p>
        <p>These Terms apply to the download of the Client Application (as defined below), any access and use of the Client Application , our website at https://mercurywallet.com or its onion mirror at http://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.onion and our Statechain Entity and Conductor services (as defined below), and any of our other Services related to or utilizing any of the foregoing, which we refer to in these Terms and Conditions documents (“Terms” or “Terms of Use”), collectively, as our “Services”.</p>
        <h6>Eligibility and Agreement</h6>
        <p>If You use the Services these Terms apply. You will be solely liable for any damage or consequences arising from use without the full acceptance of the rules. The Service Provider shall not be liable under any circumstances in this case.
You can use our Services only if You can lawfully enter into an agreement pursuant to these Terms under applicable law. You acknowledge that Your use of this Software is at Your own discretion and in compliance with all applicable laws and regulations.
Due to the nature of the Service, we cannot guarantee the full compliance of user transactions, therefore it is Your own responsibility to ensure that the use of Mercury complies with Your local laws and jurisdiction.</p>
        <h6>Responsibility for Wallet Backups and Other Authentication Means</h6>
        <p>With our Services You, and only You are able to access and transact through Your wallet. This is enabled by Your recovery words, passwords and encrypted secret keys. If you use our Services to create a wallet, the software will use an algorithm to generate random recovery words and optionally combines it with an additional word (called the passphrase as defined in BIP39), where Mercury may use your chosen wallet password as the default passphrase. We call the combination of the recovery words and the passphrase as wallet backup, or backup.</p>
        <p>THE SERVICE PROVIDER EXPRESSLY DECLARES THAT IT DOES NOT STORE, HAVE ACCESS TO, OR HAVE ANY WAY OR MEANS OF RECOVERING YOUR BACKUP.</p>
        <p>It is Your responsibility to keep your wallet backups, your wallet files, and your passwords secure. You should not provide this information to anyone, including any Service Provider representative. Encrypted private key information is stored locally on Your computer in a wallet file. Private keys can be accessed with the password, which You created at the generation of the wallet.
If You permanently forget or lose Your backup, You will NEVER be able to recover any bitcoin in Your wallet, and You will suffer a complete, irrecoverable loss of all bitcoin in Your wallet. In the event of such loss, we shall not be liable for any lack of access to the wallet and we shall not be obliged to make wallet access, or the keys required for that purpose available.
The Service Provider has no responsibility and will not be liable for any loss or damage You suffer from the loss or misappropriation of Your backup.
From the point of downloading we do not store or manage any data, we have no knowledge or information about either the installation, or the use of the wallet.</p>
        <h6>Description of Services</h6>
        <p>The Mercury Software consists of the Client Application (Wallet) and the Mercury server (Statechain Entity and Swap Conductor) (both as defined below) and functions as a free, open-source desktop Bitcoin wallet. The Software does not constitute an account where we or other third parties serve as financial intermediaries or custodians of Your bitcoins. The Software and our Services are therefore not a bank, a custodian, an exchange, a financial intermediary or a regulated financial institution and is exempt from the authority any financial institutions.</p>
        <p>The client application (“Client Application”) is software, with the sole purpose of allowing You access to the Bitcoin network and our Services (as defined below), without the need or requirement to create or maintain a user account. The application itself is a Bitcoin desktop wallet with features enabling coins to be transferred between owners off-chain via the Mercury server, but without the server having any control or custody over the funds.
The Coinswap Conductor Service is a service that coordinates atomic statecoin swaps to prevent third parties from linking outputs on the public Bitcoin blockchain. Throughout the process, the Service does not initiate or process any standalone transactions whatsoever towards third parties (i.e. non-users of the Service) and therefore does not store or transmit value belonging to others. </p>
        <h6>Fees</h6>
        <p>Subject to the other provisions of these Terms, including, but not limited to Section 3 on Prohibited Activities, You may freely download and use the Client Application without any charge or fee imposed on You by the Service Provider.
The Service Provider does not charge You transaction fees for deposits onto the platform and transfers of statecoins between users while using the platform, however You are still subject to transaction fees on deposit, charged by the Bitcoin network.
Both the Service Provider and the Bitcoin network charge You transaction fees for withdrawing to a third party wallet.</p>
        <p>The transaction fee, charged by the Service Provider is 0.3% of the value of the deposit, independent of the number of transfers or coinswaps performed on the platform. </p>
        <p>BY ACCEPTING THESE TERMS AND CONDITIONS YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT MERCURY AUTOMATICALLY DEDUCTS THE TRANSACTION FEES FROM THE TRANSACTION YOU SUBMITTED FOR THE SERVICES IN LINE WITH THE PREVIOUS PARAGRAPHS.</p>
        <p>The Service Provider reserves the right to charge additional fees or to change the amount of fees, and we will provide You at least 30 days advance notice of any such change. The Service Provider reserves the right to waive and/or reduce any fee at any time, with or without notice.</p>
        <h6>Prohibited Activities</h6>
        <p>You agree that You will not use the Services to perform any type of illegal activity of any sort or to take any action that adversely affects the performance of or the provision by the Service Provider of the Services. Furthermore, You agree that You will not use the Services on Bitcoin that is created, received or given in exchange for, or as a result of, any type of illegal activity.
Use of the Services in a manner contrary to local law is generally prohibited.</p>
        <p>The prohibition of this paragraph includes, but is not limited to, the following prohibited activities:</p>
        <ul>
            <li>sales of narcotics, research chemicals or any controlled substances.</li>
            <li>items that infringe or violate any intellectual property rights such as copyrights, trademarks, trade secrets, or patents.</li>
            <li>ammunition, firearms, explosives (including fireworks), or weapons regulated under applicable law.</li>
            <li>transactions that show the personal information of third parties in violation of applicable law.</li>
            <li>transactions that support pyramid, Ponzi, or other "get rich quick" schemes.</li>
            <li>provide credit repair or debt settlement services.</li>
            <li>explicit sexual content.</li>
            <li>money laundering or any support thereof.</li>
        </ul>
        <p>You agree that You will not engage in any of the following activities via the Services, nor will You help or facilitate a third party to engage in any such activity:</p>
        <ul>
            <li>attempt to gain unauthorized access to our server.</li>
            <li>make any attempt to bypass or circumvent any security features.</li>
            <li>violate any law, statute, ordinance, regulation or court order.</li>
            <li>engage in any activity that is abusive or interferes with or disrupts our Services.</li>
        </ul>
        <p>If You find any reason to violate the law during Your transaction (for example, in a transaction with a third party), please let us know at one of the contacts listed at the end of this document.
The Service Provider shall assist the investigation in any case, if so instructed by an authorized body, a final court judgment or a final regulatory decision.</p>
        <h6>Indemnification</h6>
        <p>You agree to indemnify, defend and hold us, harmless against any and all claims, costs, losses, damages, liabilities, judgments and expenses (including reasonable fees of attorneys and other professionals) arising from or in any way related to Your use of our Services, Your violation of these Terms, or Your violation of any rights of any other person or entity.
In the event of such an occurrence, it is Your responsibility to notify the Service Provider immediately after the occurrence of the incident so that we can take the necessary measures to prevent and remedy the damage.</p>
        <h6>Ownership of Intellectual Property Rights</h6>
        <p>Our trademarks, service marks, designs, logos, URLs, and trade names that are displayed on our Services are referred to in these Terms collectively as the “Materials”. We hereby grant You a limited, non-exclusive, revocable, royalty-free, non-transferable and non-sublicensable licence to access and use the Materials for Your Services use. This license is not intended to be broadly construed, and we reserve all rights not expressly granted herein.</p>
        <p>Any feedback (or similar content/document, feature suggestion) you submit is non-confidential and will become the sole property of the Service Provider. We will be entitled to the unrestricted use and dissemination of such feedback for any purpose, commercial or otherwise, without acknowledgment or compensation to You.</p>
        <p>The software included with the Service is open-source under the GNU license and includes the following:
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
The warranty issues covered by the MIT license will be addressed in the following section.</p>
        <h6>Disclaimer of Warranties</h6>
        <p>Our Services are provided “as is” with no warranty of any kind. Your use of our Services is at Your sole risk, subject to the terms and conditions of liability contained in these Terms and Conditions.</p>
        <p>EXCEPT AS EXPRESSLY STATED IN THESE TERMS, WE DISCLAIM (TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW) ALL WARRANTIES, REPRESENTATIONS AND CONDITIONS, WHETHER EXPRESSED OR IMPLIED AND WHETHER IMPOSED BY STATUTE OR OTHERWISE, INCLUDING AND WITHOUT LIMITATION ANY IMPLIED WARRANTIES RELATING TO TITLE, NON-INFRINGEMENT, MERCHANTABILITY, AND FITNESS FOR A PARTICULAR PURPOSE. YOU ACKNOWLEDGE THAT YOU HAVE NOT ENTERED INTO THIS AGREEMENT IN RELIANCE UPON ANY STATEMENT, WARRANTY OR REPRESENTATION EXCEPT THOSE EXPRESSLY AND SPECIFICALLY SET FORTH IN THESE TERMS AND THAT YOU SHALL HAVE NO REMEDIES IN RESPECT OF ANY STATEMENT, WARRANTY, REPRESENTATION OR CONDITION THAT IS NOT EXPRESSLY AND SPECIFICALLY SET FORTH IN THESE TERMS.</p>
        <p>Some jurisdictions do not allow the disclaimer of implied terms in contracts with consumers, so some or all of the disclaimers in this section may not apply to You. However, in this case, it is Your responsibility to verify the content of these Terms and Conditions applicable to You under the applicable law and to use our Services accordingly.</p>
        <h6>Way of Support</h6>
        <p>Mercury provides WRITTEN support only. We do not currently offer phone support and we will NEVER call, e-mail or get in touch in any form with our users to offer any wallet recovery services. Please be safe and guard Your wallet information and funds. If You see any signs of abuse in this regard, please let us know at one of the contacts listed at the end of this document.</p>
        <h6>Limitation of Liability</h6>
        <p>The limitation of liability reflects the allocation of risk between the parties.
In no event will we be liable for any indirect, special, incidental, punitive or consequential damages in the cases of exclusion under the MIT license referred to above.
Notwithstanding the foregoing provision, in no event shall the aggregate liability of the Service Provider, our subsidiaries, partners, affiliates, agents, employees, licensors, service providers, or subcontractors (if any) for any loss or damage that arises as a result of, or in connection with, any of the occurrences described above which exceed the greater of $100 or the service fees that You paid to us for the Service we provide through the Services during the month in which the incident occurred.
Some jurisdictions do not allow certain warranty disclaimers or limitations on liability. Only the disclaimers or limitations that are lawful in the applicable jurisdiction will apply to You and our liability will be limited to the maximum extent permitted by law. However, in this case, it is Your responsibility to verify the content of the General Terms and Conditions applicable to You under the applicable law and to use our services accordingly.</p>
        <h6>Severability</h6>
        <p>If for any reason a court of competent jurisdiction finds any provision of these Terms to be invalid or unenforceable, that provision will be enforced to the maximum extent permissible and the other provisions of these Terms will remain in full force and effect.</p>
        <h6>Governing Law and Jurisdiction</h6>
        <p>These Terms and any dispute or claim between You and the Service Provider arising out of or in connection with these Terms or any terms incorporated into these Terms by reference or their subject matter or formation (including non-contractual disputes or claims) will be governed by and construed in accordance with the laws of Seychelles, without giving effect to any conflict of laws principles that may provide for the application of the law of another jurisdiction. Subject to the “Arbitration” section above, the courts of Seychelles shall have exclusive jurisdiction to settle any dispute or claim between You and the Service Provider arising out of or in connection with these Terms or any terms incorporated into these Terms by reference or their subject matter or formation (including non-contractual disputes or claims).</p>
        <h6>No Waiver</h6>
        <p>Any failure or delay by us to exercise or enforce any right or remedy provided under these Terms or by law will not constitute a waiver of that or any other right or remedy, nor will it preclude any further exercise of that or any other right or remedy. No single or partial right exercise of any right or remedy shall preclude or restrict the further exercise of that or any other right or remedy.</p>
        <h6>Assignment</h6>
        <p>The Service Provider may assign these Terms to its parent company, affiliate or subsidiary, or in connection with a merger, consolidation, or sale or other disposition of all or substantially all of its assets. You may not assign these Terms or Your use of or access to the Services at any time.</p>
        <h6>Entire Agreement</h6>
        <p>These Terms, together with any other terms incorporated into these Terms by reference and any other terms and conditions that apply to You, constitute the entire and exclusive agreement between us and You regarding its subject matter, and supersede and replace any previous or contemporaneous written or oral contract, warranty, representation or understanding regarding its subject matter. You acknowledge and agree that You shall have no remedies in respect of any statement, representation, assurance or warranty that is not set out in these Terms (or any other terms that are incorporated herein by reference).</p>
        <h6>Force Majeure</h6>
        <p>Neither You nor we will be liable for delays in processing or other non-performance caused by such events as fires, telecommunications, utility, or power failures, equipment failures, labor strike, riots, war, nonperformance of our vendors or suppliers, acts of God, or other causes over which the respective party has no reasonable control; provided that the party has procedures reasonably suited to avoid the effects of such events. The damages and consequences arising from these shall be borne by each party individually.</p>
        <h6>Mercury legal statement</h6>
        <p>Mercury Ltd., the creator of Mercury Wallet and owner of the brand only supports behaviour that is legally acceptable by Seychelles and international legal standards, and strictly rejects all kinds of illegal activities.</p>
        <h6>Information Provided</h6>
        <p>Service Provider provides information and material of a general nature. You are neither authorized to nor should You rely on the Service Provider for legal advice, investment advice, or advice of any kind. You act at Your own risk in any reliance on the contents provided. In no way are the owners of, or contributors to, the Service responsible for the actions, decisions, or other behaviour taken or not taken by You in reliance upon the Website or the use of Mercury Wallet.
Any exchange prices displayed are provided by 3rd party services and are not indicative of the Bitcoin being backed by any commodity or other form of money or having any other tangible value at all. The Service Provider makes no guarantees that Bitcoins can be exchanged or sold at the price displayed.
We have no control over the value of bitcoin, or the operation of the underlying software protocols which govern the operation of Bitcoin supported on our platform. We assume no responsibility for the operation of the underlying protocols and we are not able to guarantee their functionality, security or availability.</p>
        <h6>Investment Risks</h6>
        <p>The investment in bitcoin can lead to loss of money over shorter or even longer periods of time. The investors in bitcoin should expect prices to have large range fluctuations.</p>
        <h6>Compliance with Tax Obligations</h6>
        <p>The users of the wallet are solely responsible to determine what, if any taxes apply to their bitcoin transactions. The owners of, or contributors to, the wallet are NOT responsible for determining the taxes that apply to bitcoin transactions.</p>
    </div>
    )
}

export default TermsConditions;