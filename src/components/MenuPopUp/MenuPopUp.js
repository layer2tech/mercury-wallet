'use strict';
import './MenuPopUp.css';

const MenuPopUp = ({openMenu, setOpenMenu, selected, 
    handleChange, options, title }) => {

    return(
        <>
        {openMenu && (
            <>
              <div className="filter-options">
                <div className="filter-head">{title}</div>
                {options.map((item) => (
                  <label key={item.id} onClick={() => handleChange(item.value)}>
                    <input
                      readOnly
                      type="radio"
                      checked={selected === item.value}
                    />
                    {item.text}
                    <span className="checkmark"></span>
                  </label>
                ))}
              </div>
              <div
                className="menu-overlay"
                onClick={() => setOpenMenu(false)}
              />
            </>
        )}
        </>
    )
}

export default MenuPopUp