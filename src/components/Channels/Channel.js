import { useSelector } from 'react-redux';
import { ProgressBar } from "react-bootstrap";
import lightningLogo from '../../images/lightning_logo.png';
import '../coins/coins.css';
import './Channel.css';

const Channel = (props) => {
    useSelector
    const { balance_info } = useSelector((state) => state.walletData)
    return(
        <div>
            <div className = "coin-item">


                <div className = "CoinPanel">


                    <div className="CoinAmount-block">
                        <img src={lightningLogo} alt="icon" className="privacy" />
                        <span className="sub">
                                <b className = "CoinAmount" > 100000 Sats</b>
                                    <div className="scoreAmount">
                                        Node Alias
                                    </div>
                        </span>
                    </div>


                    <div className="progress_bar" >
                        <div className="sub">
                            <ProgressBar>                     
                            <ProgressBar 
                                striped variant={ 'success' }
                                now={50}
                                key={1} />
                            </ProgressBar>
                        </div>
                    </div>



                    <b className="CoinFundingTxid">
                        <img src={lightningLogo} className="sc-address-icon" alt="icon" />
                        abcdefghijklmno123456789
                    </b>

                </div>
            </div>
        </div>
    )
}

export default Channel;