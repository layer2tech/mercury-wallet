import { useEffect } from "react";
import Channel from "./Channel";
import {useSelector, useDispatch} from 'react-redux';
import  { updateBalanceInfo, getTotalChannelBalance } from '../../features/WalletDataSlice';


const ChannelList = (props) => {
    const dispatch = useDispatch();

    const { balance_info } = useSelector(
        (state) => state.walletData
    );

    useEffect(() => {
        dispatch(updateBalanceInfo({ ...balance_info, channel_balance: getTotalChannelBalance() }));
    }, []);

    return(
        <div className = "main-coin-wrap">
            {props.channels.map(item => {
                return (
                    <Channel
                        key={item.id} 
                        channel_data={item}
                        selectedChannel={props.selectedChannel}
                        selectedChannels={props.selectedChannels}
                        setSelectedChannel={props.setSelectedChannel}
                        render={ props.render ? (props.render) : null}
                    />
                )
            })}
        </div>
    )
}

export default ChannelList;