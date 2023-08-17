"use strict";
import { useEffect, useState } from "react";
import { Link, withRouter } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setWalletLoaded, setProgressComplete } from "../../features/WalletDataSlice";
import WalletCreationOptions from "./WelcomeBtns";

const Welcome = () => {
  const dispatch = useDispatch();

  useEffect(()=>{
    dispatch(setWalletLoaded({ loaded: false }))
    dispatch(setProgressComplete({ msg: "" }));
  },[])

   const [checked, changeCheckbox] = useState(0);

  const getLinkPath = () => {
    if (checked === 1) {
        return "create_wallet";
      } else if (checked === 2) {
        return "restore_wallet";
      } else {
        return "load_wallet";
      }
  };

  const linkPath = getLinkPath();

  return (
    <div className="max-w-2xl mx-auto p-5 pt-20 text-left">
      <div>
        <h1 data-cy="mercury-landing-title" className="text-4xl">Welcome to Mercury</h1>
        <p data-cy="mercury-landing-message" className="text-base text-[#202020] max-w-2xl p-2">
          If you’re using Mercury wallet for the first time, create a new
          wallet. If you have an existing wallet, load the wallet from your
          device storage, or use your seed phrase or backup file to restore the
          wallet.
        </p>
      </div>

      <WalletCreationOptions checked={checked} changeCheckbox={changeCheckbox} />

      <Link
        data-cy="landing-continue-btn"
        to={linkPath}
        className={`float-right block mt-6 mr-6 primary-btn blue ${!checked ? "disabled" : ""}`}>
        Continue
      </Link>
    </div>
  );
};

export default withRouter(Welcome);
