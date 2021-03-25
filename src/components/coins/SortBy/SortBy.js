import React, { useState } from 'react';
import PropTypes from 'prop-types';

import './SortBy.css';

const SORT_BY = {
	value: 'Value',
	expiry_data: 'Expiration',
	swap_rounds: 'Privacy Score'
}

const SortBy = ({
  sortCoin,
  setSortCoin
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="sort-by-wrapper">
      <span className="sort-by-menu" onClick={() => setOpen(!open) }>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="23" viewBox="0 0 20 23">
          <text id="_" data-name="→" transform="translate(0 19)" fill="#0F54F4" fontSize="20" fontFamily="LucidaGrande-Bold, Lucida Grande" fontWeight="700"><tspan x="0" y="0">→</tspan></text>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="23" viewBox="0 0 20 23">
          <text id="_" data-name="→" transform="translate(0 19)" fill="#0F54F4" fontSize="20" fontFamily="LucidaGrande-Bold, Lucida Grande" fontWeight="700"><tspan x="0" y="0">→</tspan></text>
        </svg>
      </span>
      {open && (
        <>
          <div className="sort-by-options">
            <div className="sort-head">
              <div 
                className={`sort-direction ${sortCoin.direction ? 'up' : ''}`}
                onClick={() => {
                  setSortCoin({
                    ...sortCoin,
                    direction: !sortCoin.direction
                  })
                }}
              >
                <svg id="icon_navigation_arrow_drop_down_24px" data-name="icon/navigation/arrow_drop_down_24px" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <rect id="Boundary" width="24" height="24" fill="none" />
                  <path id="_Color" data-name=" ↳Color" d="M0,0,5,5l5-5Z" transform="translate(7 10)" />
                </svg>
              </div>
              <span>Sort By</span>
            </div>
            <div className="order-items">
              {Object.keys(SORT_BY).map(orderItem => (
                <div 
                  key={orderItem} 
                  className={`order-item ${sortCoin.by === orderItem ? 'active': ''}`} 
                  onClick={() => {
                    setSortCoin({
                      ...sortCoin,
                      by: orderItem
                    });
                  }}
                >
                  {SORT_BY[orderItem]}
                </div>
              ))}
            </div>
          </div>
          <div className="sort-by-overlay" onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  );
}

SortBy.propTypes = {
  setSortCoin: PropTypes.func,
  sortCoin: PropTypes.object
}

export default SortBy
