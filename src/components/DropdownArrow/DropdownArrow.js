"use strict";
import arrow from "../../images/arrow-accordion.png";
import "./DropdownArrow.css"

const DropdownArrow = ({toggleContent: toggleContent, isToggleOn: isToggleOn}) => {
    return(
    <div
    onClick={toggleContent}
    className={isToggleOn ? "image rotate" : "image"} >

        <img src={arrow} alt="arrowIcon" />

    </div>
    )
}

export default DropdownArrow;