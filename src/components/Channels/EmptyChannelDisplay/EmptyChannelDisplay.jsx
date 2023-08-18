'use strict';
import '../../Coins/Coins.css';

import { Link } from 'react-router-dom';
import FilterBy from '../../Coins/FilterBy/FilterBy';

const EmptyChannelDisplay = (props) => {
    return(
        <div className="empty-coin-list">
            <div className = "main-coin-wrap">
                <FilterBy />
            </div>
            <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={"exclamation"}
            >
                <path
                    d="M9.9999 19.9998C4.48594 19.9998 0 15.5139 0 9.9999C0 4.48594 4.48594 0 9.9999 0C15.5139 0 19.9998 4.48594 19.9998 9.9999C19.9998 15.5139 15.5139 19.9998 9.9999 19.9998ZM9 12.9996V15.0003H10.9998V12.9996H9ZM9 5.0004V10.9998H10.9998V5.0004H9Z"
                    fill="var(--button-border)"
                />
            </svg>
            <div className="empty-message">
                <b>{props.message}</b> <Link to="/deposit_ln" >Open Channel</Link>
                <br/>
            </div>
        </div>
    )
}

export default EmptyChannelDisplay;