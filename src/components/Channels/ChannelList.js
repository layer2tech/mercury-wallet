import { useState } from "react";
import { callSaveChannels, getChannels } from "../../features/WalletDataSlice";
import Channel from "./Channel";


const ChannelList = (props) => {
    // For testing
    const mock_channels = [
        {
            id: "abcdefghijklmno123456789",
            amt: 100000,
        },
        {
            id: "kezklmntuwxzy123456789",
            amt: 150000,
        },
        {
            id: "lmnopqrstuvwx123456789",
            amt: 50000,
        },
    ];
    callSaveChannels(mock_channels);
    //

    const [channels, setChannels] = useState(getChannels());

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