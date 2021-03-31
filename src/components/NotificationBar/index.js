import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { setNotificationSeen } from "../../features/WalletDataSlice";

import "./index.css";

function NotificationBar () {
  const dispatch = useDispatch();
  const notification_dialogue = useSelector(state => state.walletData).notification_dialogue;
  let notifications_list = notification_dialogue;

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
    <div key={index} className={`hideBar wallet-notification`}>
      <div className="notification-content">
        <p><i className="fa fa-exclamation"></i> {item.msg}</p>
        <div className="close" onClick={() => handleCloseNotification(item.msg)}>
          <i className="fa fa-close"></i>
        </div>
      </div>
    </div>
  ))
  return showNotifications;
};

export default NotificationBar;
