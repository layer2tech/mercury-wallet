'use strict';
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import "../coins/FilterBy/FilterBy.css";
import MenuButtonPopUp from "../MenuButtonPopUp/MenuButtonPopUp";
import { setShowInvoicePopup } from "../../features/WalletDataSlice";


const InvoiceOptions = (props) => {
  const dispatch = useDispatch();

  const showInvoicePopup = useSelector((state) => state.walletData).showInvoicePopup;

  const [openInvoiceMenu, setOpenInvoiceMenu] = useState(false);

  const showPrivateKeyOption = () => {
    dispatch(setShowInvoicePopup(!showInvoicePopup));
  };

  const FILTER_BY_OPTION = [
    {
      id: 1,
      value: "default",
      text: "Show Private Key",
      action: showPrivateKeyOption
    },
  ];

  return (
    <div className="filter-by-wrap">
      <div
        className="filter-coin-icon"
        onClick={() => setOpenInvoiceMenu(!openInvoiceMenu)}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M11.9998 20.0002C10.8971 20.0002 10 19.1031 10 18.0004C10 16.8972 10.8971 15.9997 11.9998 15.9997C13.1025 15.9997 13.9996 16.8972 13.9996 18.0004C13.9996 19.1031 13.1025 20.0002 11.9998 20.0002ZM11.9998 13.9999C10.8971 13.9999 10 13.1028 10 12.0001C10 10.8974 10.8971 10.0003 11.9998 10.0003C13.1025 10.0003 13.9996 10.8974 13.9996 12.0001C13.9996 13.1028 13.1025 13.9999 11.9998 13.9999ZM11.9998 7.9996C10.8971 7.9996 10 7.10249 10 5.9998C10 4.89711 10.8971 4 11.9998 4C13.1025 4 13.9996 4.89711 13.9996 5.9998C13.9996 7.10249 13.1025 7.9996 11.9998 7.9996Z"
            fill="var(--text-secondary)"
          />
        </svg>
      </div>
      <MenuButtonPopUp
        openMenu = {openInvoiceMenu} 
        setOpenMenu = {setOpenInvoiceMenu}
        options = {FILTER_BY_OPTION}
        title = {"Invoice Options"}/>
    </div>
  );
};

export default InvoiceOptions;
