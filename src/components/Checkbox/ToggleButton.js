import './ToggleButton.css'

const ToggleButton = ({handleChange, checked, name, label}) => {

    return (
        <label className="cursor-pointer p-0 inline-block">
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
    );
}

export default ToggleButton;