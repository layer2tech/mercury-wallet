'use strict';

const StdButton = ({label, icon, onClick, className}) => {
  return(
    <button onClick={onClick} className={className}>
    {icon ? <img src={icon} alt="icon"/>  : ' '}  {label}
    </button>
  )
}

export default StdButton;
