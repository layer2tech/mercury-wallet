import React from 'react'
import PropTypes from 'prop-types'
import './style.css'

function Steppers({ total, current }) {
  const arr = Array.from(Array(total).keys())

  return (
    <div className="row steppers">
      <div className="wrapper-progressbar">
        <ul className="progressbar">
          {arr.map((index) => (
            <li className={`${index < current ? 'active' : ''}`} key={index}>{index + 1}</li>
          )) }
        </ul>
      </div>
    </div>
  )
}

Steppers.propTypes = {
  total: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired
}

export default Steppers
