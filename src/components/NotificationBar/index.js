import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setNotificationSeen } from "../../features/WalletDataSlice";
import "./index.css";

const NotificationBar = () => {

  const dispatch = useDispatch();
  const notification_dialogue = useSelector(state => state.walletData).notification_dialogue;
  let notifications_list = notification_dialogue;

  useEffect(() => {
    // timer to close the notification after 5 seconds
    const timerPtr = setTimeout(() => {
      handleCloseAllNotifficcations();
    }, 5000);

    return () => {
      clearTimeout(timerPtr);
    }
  }, [notifications_list]);

  const handleCloseAllNotifficcations = () => {
    for(var i=0; i<notifications_list.length; i++){
      dispatch(setNotificationSeen({msg: notifications_list[i].msg}));
    }
    notifications_list = [];
  }

  const handleCloseNotification = (msg) => {
    // remove notificaiton message from WalletData state and local state
    dispatch(setNotificationSeen({msg: msg}))
    let new_notifications_list = notifications_list.filter((item) => {
      if (item.msg !== msg) { return item };
      return null
    })
    notifications_list = new_notifications_list;
  }

  // Display all notifications
  const showNotifications = notifications_list.map((item, index) => (
    <div key={index} className={`hideBar wallet-notification`} onDoubleClick={() => handleCloseNotification(item.msg)}>
      <div className="notification-content">
        <p><i className="fa fa-exclamation"></i> {item.msg}</p>
      </div>
    </div>
  ))
  return showNotifications;
};

export default NotificationBar;