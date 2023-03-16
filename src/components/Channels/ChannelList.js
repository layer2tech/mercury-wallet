import { useEffect, useState } from "react";
import Channel from "./Channel";
import { useSelector, useDispatch } from "react-redux";
import {
  updateBalanceInfo,
  getTotalChannelBalance,
  updateChannels,
  setIntervalIfOnline,
  getWalletName,
  callGetChannels,
} from "../../features/WalletDataSlice";
import EmptyChannelDisplay from "./EmptyChannelDisplay/EmptyChannelDisplay";
import { Link } from "react-router-dom";

const ChannelList = (props) => {
  const dispatch = useDispatch();

  const [channels, setChannels] = useState([]);

  const { balance_info } = useSelector((state) => state.walletData);

  useEffect(() => {
    const loadChannels = async () => {
      let channelsLoaded = await callGetChannels(getWalletName());
      setChannels(channelsLoaded);
      dispatch(
        updateBalanceInfo({
          ...balance_info,
          channel_balance: getTotalChannelBalance(),
        })
      );
    };
    loadChannels();
  }, [balance_info, dispatch]);

  useEffect(() => {
    let isMounted = true;
    let interval = setIntervalIfOnline(
      updateChannelsInfo,
      true,
      10000,
      isMounted
    );

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const updateChannelsInfo = async () => {
    let channelsLoaded;
    channelsLoaded = await callGetChannels(getWalletName());
    if (JSON.stringify(channelsLoaded) !== JSON.stringify(channels)) {
      setChannels(channelsLoaded);
      dispatch(
        updateBalanceInfo({
          ...balance_info,
          channel_balance: getTotalChannelBalance(),
        })
      );
    }
  };

  if (!channels.length) {
    const displayMessage = "Your wallet is empty";
    return <EmptyChannelDisplay message={displayMessage} />;
  }

  return (
    <div className="main-coin-wrap">
      {channels.map((item) => {
        return props.isMainPage ? (
          <Link
            to={{ pathname: "/channel_details", state: { item } }}
            key={item.id}
          >
            <Channel
              isMainPage={true}
              key={item.id}
              channel_data={item}
              selectedChannel={props.selectedChannel}
              selectedChannels={props.selectedChannels}
              setSelectedChannel={props.setSelectedChannel}
              render={props.render ? props.render : null}
            />
          </Link>
        ) : (
          <Channel
            key={item.id}
            channel_data={item}
            selectedChannel={props.selectedChannel}
            selectedChannels={props.selectedChannels}
            setSelectedChannel={props.setSelectedChannel}
            render={props.render ? props.render : null}
          />
        );
      })}
    </div>
  );
};

export default ChannelList;
