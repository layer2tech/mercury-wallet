'use strict';
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setNotificationSeen } from "../../features/WalletDataSlice";
import "./index.css";

const NotificationBar = () => {
  const dispatch = useDispatch();
  let notifications_list = useSelector(state => state.walletData).notification_dialogue;

  useEffect(() => {
    const handleCloseAllNotifications = () => {
      for(var i=0; i<notifications_list.length; i++){
        dispatch(setNotificationSeen({msg: notifications_list[i].msg}));
      }
      notifications_list = [];
    }
    // timer to close the notification after 5 seconds
    const timerPtr = setTimeout(() => {
      handleCloseAllNotifications();
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
  const showNotifications = notifications_list != null ? notifications_list.map((item, index) => (
    <div key={index} className={`hideBar wallet-notification`} onDoubleClick={() => handleCloseNotification(item.msg)}>
      <div className="notification-content">
        <p>{item.msg}</p>
      </div>
    </div>
  )) : (<></>);
  return showNotifications;
};

export default NotificationBar;