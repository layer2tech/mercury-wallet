import plus from "../../assets/images/plus-black.png";
import restore from "../../assets/images/restore-img.png";
import check from "../../assets/images/icon-action-check_circle.png";

const WelcomeButton = ({ text, image, isChecked, onClick, name }) => {
  return (
    <div
      data-cy={`create-wallet-btn-${name}`}
      onClick={onClick}
      className={`relative rounded text-left text-xl cursor-pointer ${
        isChecked ? "selected" : ""
      } bg-[#ffffff] dark:bg-[#202020] p-2 shadow-sm mx-4 flex items-center justify-center md:w-[200px] w-full`}
    >
      <img className='mr-2' src={image} alt={text} />
      <span>{text}</span>
      <img className={`w-4 right-0 ${isChecked ? "" : "hidden"}`} src={check} alt={text} />
    </div>
  );
}

const WalletCreationOptions = ({ checked, changeCheckbox }) => {
  const handleCheckboxChange = (index) => {
    changeCheckbox(index);
  };

  return (
    <div data-cy="welcome-btns-list" className="flex items-center justify-between mt-5">
      <WelcomeButton
        name="create"
        text="Create New Wallet"
        image={plus}
        isChecked={checked === 1}
        onClick={() => handleCheckboxChange(1)}
      />

      <WelcomeButton
        text="Restore From Seed/Backup"
        name="restore"
        image={restore}
        isChecked={checked === 2}
        onClick={() => handleCheckboxChange(2)}
      />

      <WelcomeButton
        name="load"
        text="Load Existing Wallet"
        image={restore} // You can replace this with the appropriate image
        isChecked={checked === 3}
        onClick={() => handleCheckboxChange(3)}
      />
    </div>
  );
}

export default WalletCreationOptions;
