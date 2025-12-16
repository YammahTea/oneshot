import React from 'react';
import { useNavigate } from 'react-router-dom';
import './FloatingMenu.css';

const FloatingMenu = () => {
  const navigate = useNavigate();

  return (
    <div className="wrapper">
      <input type="checkbox" id="toogle" className="hidden-trigger" />

      {/* The Central Toggle Button */}
      <label htmlFor="toogle" className="circle">
        <svg className="svg" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
          {/* Simple Plus Icon for the center */}
          <path d="M24 4V44M4 24H44" stroke="black" strokeWidth="4" strokeLinecap="round"/>
        </svg>
      </label>

      <div className="subs">

        {/* TOP BUTTON: UPLOAD (Scope) */}
        <button className="sub-circle" onClick={() => navigate('/upload')}>

          <input value="1" name="sub-circle" type="radio" id="sub1" className="hidden-sub-trigger" />
          <label htmlFor="sub1" style={{ fontSize: '24px' }}>𖥔</label>
        </button>

        {/* LEFT BUTTON: PROFILE (User) */}
        <button className="sub-circle" onClick={() => navigate('/profile')}>

          <input value="2" name="sub-circle" type="radio" id="sub2" className="hidden-sub-trigger" />
          <label htmlFor="sub2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="20" height="20">
              <path d="M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/>
              <path d="M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32"/>
            </svg>
          </label>
        </button>

        {/* RIGHT BUTTON: FEED (Home) */}
        <button className="sub-circle" onClick={() => navigate('/')}>

          <input value="3" name="sub-circle" type="radio" id="sub3" className="hidden-sub-trigger" />
          <label htmlFor="sub3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="20" height="20">
              <path d="M80 212v236a16 16 0 0016 16h96V328a24 24 0 0124-24h80a24 24 0 0124 24v136h96a16 16 0 0016-16V212" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/>
              <path d="M480 256L266.89 52c-5-5.28-16.69-5.34-21.78 0L32 256M400 179V64h-48v69" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/>
            </svg>
          </label>
        </button>

      </div>
    </div>
  );
};

export default FloatingMenu;
