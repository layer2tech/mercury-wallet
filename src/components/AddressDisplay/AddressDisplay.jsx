import { callGetNetwork, callGetStateCoin } from "../../features/WalletDataSlice"
import CopiedButton from "../CopiedButton/CopiedButton";
import copy_img from "../../images/icon2.png";

const AddressDisplay = ({shared_key_id}) => {
    const getAddress = (shared_key_id) => {
        
        let sc = callGetStateCoin(shared_key_id)
    
        if (sc != undefined) {
          let addr = sc.getBtcAddress(callGetNetwork());
          return addr
        }
        return null
    }

    //Button to handle copying p address to keyboard
    const copyAddressToClipboard = (event, address) => {
        event.stopPropagation()
        navigator.clipboard.writeText(address);
    }

    return (
        <div>
            <div className="flex items-center bg-[#dfeaff] dark:bg-[#2d2d2d] p-3 mt-2 text-[#000000] dark:text-[#e7e7e7]">
                <CopiedButton handleCopy={(event) => copyAddressToClipboard(event, getAddress(shared_key_id))}>
                    <img type="button" src={copy_img} alt="icon" />
                </CopiedButton>
            <span className="long"><b>{getAddress(shared_key_id)}</b></span>
            </div>
      </div>
    )
}

export default AddressDisplay;