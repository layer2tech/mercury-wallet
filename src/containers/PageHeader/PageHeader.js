
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { StdButton } from '../../components';
import { WALLET_MODE } from '../../features/WalletDataSlice';
import { fromSatoshi } from '../../wallet';
import './PageHeader.css';

const PageHeader = ({title, className, icon,
    svgIcon = undefined, subTitle = undefined, subText = undefined }) => {

    const { walletMode, balance_info } = useSelector((state) => state.walletData);
    
    return(
    <div className={`Body ${className}`}>
        <div className="swap-header">
            <h2 className="main-header">
                {svgIcon? (
                    svgIcon
                ):
                (
                    <img src={icon} alt="title-icon"/>
                )}
                {title}
            </h2>
            <div>
                <Link className="nav-link" to="/home">
                    <StdButton
                      label="Back"
                      className="Body-button transparent"/>
                </Link>
            </div>
        </div>
        <h3 className="subtitle">
            {subTitle ? (<>{subTitle}<br/></>) : ("")}
          {subText && walletMode === WALLET_MODE.STATECHAIN ? 
          (<><b> {fromSatoshi(balance_info.total_balance)} BTC</b> as <b>{balance_info.num_coins}</b> {subText}</>):
          (null)}
        </h3>
    </div>
    )
}

export default PageHeader;