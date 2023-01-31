import { useEffect, useState } from "react";
import Channel from "./Channel";
import {useSelector, useDispatch} from 'react-redux';
import  { updateBalanceInfo, getTotalChannelBalance, updateChannels, setIntervalIfOnline, getWalletName } from '../../features/WalletDataSlice';
import EmptyChannelDisplay from './EmptyChannelDisplay/EmptyChannelDisplay';
import { fetchChannels } from "../../wallet/wallet";


const ChannelList = (props) => {
    const dispatch = useDispatch();

    const [channels, setChannels] = useState(props.channels);

    const { balance_info } = useSelector(
        (state) => state.walletData
    );

    useEffect(() => {
        dispatch(updateBalanceInfo({ ...balance_info, channel_balance: getTotalChannelBalance() }));
        let isMounted = true;
        let interval = setIntervalIfOnline(updateChannelsInfo, true, 10000, isMounted);
    
        return () => {
          isMounted = false;
          clearInterval(interval)};  
      }, [balance_info, dispatch, channels]);

    const updateChannelsInfo = async () => {
        let channelsLoaded;
        channelsLoaded = await fetchChannels(getWalletName());
        if (JSON.stringify(channelsLoaded) !== JSON.stringify(channels)) {
            updateChannels(channelsLoaded);
            setChannels(channelsLoaded);
            dispatch(updateBalanceInfo({ ...balance_info, channel_balance: getTotalChannelBalance() }));
        }
    };

    if (!props.channels.length) {
        const displayMessage = "Your wallet is empty";
        return (
            <EmptyChannelDisplay message={displayMessage} />
        );
    }

    return(
        <div className = "main-coin-wrap">
            {channels.map(item => {
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