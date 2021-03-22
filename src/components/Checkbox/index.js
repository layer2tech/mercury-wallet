import React from 'react'
import PropTypes from 'prop-types'
import './style.css'

function CheckBox({ checked, onChange, label, description, name }) {

  function handleChange(e) {
    const {checked, name} = e.target
    onChange({checked, name})
  }

  return (
    <div className="checkbox">
      <h2 className="checkbox-description">{description}</h2>
      <label className="toggle">
        <input
          className="toggle-checkbox"
          type="checkbox"
          name={name}
          onChange={handleChange}
          checked={checked}
        />
        <div className="toggle-switch" />
        <span className="toggle-label">{label}</span>
      </label>
    </div>
  );
}

CheckBox.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string,
  description: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  checked: PropTypes.bool.isRequired,
}

CheckBox.defaultProps = {
  name: ''
}

export default CheckBox
