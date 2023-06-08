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
  setPingLightningMs,
  callGetChannelEvents,
  updateChannelEvents,
  setError,
  setSuccessMessage
} from "../../features/WalletDataSlice";
import EmptyChannelDisplay from "./EmptyChannelDisplay/EmptyChannelDisplay";
import { Link } from "react-router-dom";
import { pingLightning } from "../../wallet/mercury/info_api";
import { getPaymentEvent } from "../../wallet/util";

const ChannelList = (props) => {
  const dispatch = useDispatch();

  const [channels, setChannels] = useState([]);

  const [channelEvents, setChannelEvents] = useState([]);

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
    let lightning_ping_ms_new = await pingLightning();
    dispatch(setPingLightningMs(lightning_ping_ms_new));
    let channelsLoaded = await callGetChannels(getWalletName());
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

  useEffect(() => {
    let isMounted = true;
    let interval = setIntervalIfOnline(
      updateChannelEventsInfo,
      true,
      10000,
      isMounted
    );

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const updateChannelEventsInfo = async () => {
    const channelEventsLoaded = await callGetChannelEvents(getWalletName());
    if (JSON.stringify(channelEventsLoaded) !== JSON.stringify(channelEvents)) {
      setChannelEvents(channelEventsLoaded);
      dispatch(updateChannelEvents(channelEventsLoaded));
      let newEvents = channelEventsLoaded.filter(event => !channelEvents.includes(event));
      const paymentEvent = getPaymentEvent(newEvents);
      if (paymentEvent) {
        if (paymentEvent.event_type.includes("Failed")) {
          dispatch(setError({ msg: "Payment failed to receive" }));
        } else {
          dispatch(setSuccessMessage({ msg: "Payment received successfully" }));
        }
      }
    }
  };

  if (channels && !channels.length) {
    const displayMessage = "Your wallet is empty";
    return <EmptyChannelDisplay message={displayMessage} />;
  }

  return (
    <div className="main-coin-wrap">
      {channels &&
        channels.map((item) => {
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
