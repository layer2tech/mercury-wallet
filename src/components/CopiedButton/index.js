'use strict';
import React, { cloneElement, useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./copiedButton.css";

let timeout;

function CopiedButton ({ 
  children, 
  handleCopy, 
  style = {}, 
  message = 'Copied!',
  delay = 1000,
  className = "copy-btn-wrap"
}) {
  const [copied, setCopied] = useState(false);
  const handleClick = (e) => {
    //Stops copy event propagation to Receive Index X button in Receive.js
    if(!e.target.classList.contains("receive-btn")){
      handleCopy(e)
      setCopied(true)
    }
  };
  useEffect(() => {
    clearTimeout(timeout);
    timeout = setTimeout(() => setCopied(false), delay);
    return () => clearTimeout(timeout);
  },[copied, delay]);
  return (
    <div className={className}>
      {copied && <span className="copied" style={style}>{message}</span>}
      {cloneElement(children, { onClick: handleClick })}
    </div>
  );
};

CopiedButton.propTypes = {
  children: PropTypes.element,
  handleCopy: PropTypes.func,
  style: PropTypes.object,
  delay: PropTypes.number,
  message: PropTypes.string
};

export default CopiedButton;
