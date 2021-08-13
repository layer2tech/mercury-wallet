import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setNotificationSeen } from "../../features/WalletDataSlice";

import "./index.css";

const NotificationBar = () => {

  const dispatch = useDispatch();
  const notification_dialogue = useSelector(state => state.walletData).notification_dialogue;
  let notifications_list = useRef(notification_dialogue);

  useEffect(() => {
    const handleCloseAllNotifficcations = () => {
      for(var i=0; i<notifications_list.current.length; i++){
        dispatch(setNotificationSeen({msg: notifications_list.current[i].msg}));
      }
      notifications_list.current = [];
    }

    // timer to close the notification after 5 seconds
    const timerPtr = setTimeout(() => {
      handleCloseAllNotifficcations();
    }, 5000);

    return () => {
      clearTimeout(timerPtr);
    }
  }, [notifications_list, dispatch]);

  const handleCloseNotification = (msg) => {
    // remove notificaiton message from WalletData state and local state
    dispatch(setNotificationSeen({msg: msg}))
    let new_notifications_list = notifications_list.current.filter((item) => {
      if (item.msg !== msg) { return item };
      return null
    })
    notifications_list.current = new_notifications_list;
  }

  // Display all notifications
  const showNotifications = notifications_list.current != null ? notifications_list.current.map((item, index) => (
    <div key={index} className={`hideBar wallet-notification`} onDoubleClick={() => handleCloseNotification(item.msg)}>
      <div className="notification-content">
        <p>{item.msg}</p>
      </div>
    </div>
  )) : (<></>);
  return showNotifications;
};

export default NotificationBar;