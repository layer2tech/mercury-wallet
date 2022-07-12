import React from 'react'
import PropTypes from 'prop-types'

import './style.css';

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
    <g id="Group_3804" data-name="Group 3804" transform="translate(-4080.92 -2000.138)">
      <path id="Path_1191" data-name="Path 1191" d="M4080.92,2000.138h18v18h-18Z" fill="none"/>
      <path id="Path_1192" data-name="Path 1192" d="M4087.67,2012.265l-3.127-3.127-1.061,1.061,4.188,4.189,9-9-1.061-1.062Z" fill="#fff"/>
    </g>
  </svg>
)
function Steppers({ current, steps }) {
  return (
    <div className="row steppers">
      <div className="wrapper-progressbar">
        <ul className="progressbar">
          {steps.map((item, index) => (
            <li
              className={`${item.id < current ? 'done' : ''}${item.id === current ? 'active': ''}`}
              key={item.id}
            >
              <span className={`steppers-num`}>{item.id < current ? <CheckIcon /> : item.id}</span>
              {item.description}
            </li>
          )) }
        </ul>
      </div>
    </div>
  )
}

Steppers.propTypes = {
  current: PropTypes.number.isRequired,
  steps: PropTypes.array.isRequired
}

export default Steppers
