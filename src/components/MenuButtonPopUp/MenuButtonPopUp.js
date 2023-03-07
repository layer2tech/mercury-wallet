'use strict';
import '../MenuPopUp/MenuPopUp.css';


const MenuButtonPopUp = ({openMenu, setOpenMenu, 
    options, title }) => {

    return(
        <>
        {openMenu && (
            <>
              <div className="filter-options">
                <div className="filter-head">{title}</div>
                  {options.map((item) => (
                      <button 
                        className="Body-button transparent"
                        onClick={item.action}
                        key={item.id}
                      >
                        {item.text}
                      </button>
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

export default MenuButtonPopUp