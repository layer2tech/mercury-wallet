import plus from "../../images/plus-black.png";
import restore from "../../images/restore-img.png";
import check from "../../images/icon-action-check_circle.png";

const WelcomeButton = ({ text, image, isChecked, onClick }) => {
  return (
    <div
      data-cy="create-wallet-btn"
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
        text="Create New Wallet"
        image={plus}
        isChecked={checked === 1}
        onClick={() => handleCheckboxChange(1)}
      />

      <WelcomeButton
        text="Restore From Seed/Backup"
        image={restore}
        isChecked={checked === 2}
        onClick={() => handleCheckboxChange(2)}
      />

      <WelcomeButton
        text="Load Existing Wallet"
        image={restore} // You can replace this with the appropriate image
        isChecked={checked === 3}
        onClick={() => handleCheckboxChange(3)}
      />
    </div>
  );
}

export default WalletCreationOptions;
