import Channel from "./Channel"


const ChannelList = (props) => {
    const channels = [
        {
            id: "abcdefghijklmno123456789",
            amt: 100000,
        },
        {
            id: "kezklmntuwxzy123456789",
            amt: 150000,
        }
    ]
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