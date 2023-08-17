'use strict';
import ToggleButton from './ToggleButton';

const CheckBox = ({ checked, onChange, label, description, name }) => {

  const handleChange = (e) => {
    const {checked, name} = e.target
    onChange({checked, name})
  }

  return (
    <div className="mt-[16px]">
      <h2 className="mb-[8px]">{description}</h2>
      <ToggleButton handleChange={handleChange} checked={checked} name={name} label={label}/>
    </div>
  );
}

export default CheckBox
