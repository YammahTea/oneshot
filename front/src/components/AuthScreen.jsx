import { useState } from 'react';
import Toast from './Toast.jsx'

export default function AuthScreen({ onLogin, onRegister, authLoading, authError, setAuthError, onClearError }) {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');



  return (
    <div className="wrapper bg-gray-100">
      <h1 className="absolute top-20 text-4xl font-bold text-black">
        OneShot.
      </h1>

      <div className="card-switch">
        <label className="switch">
          <input type="checkbox" className="toggle"/>
          <span className="slider"></span>
          <span className="card-side"></span>

          <div className="flip-card__inner">

            {/* --- LOGIN SIDE --- */}
            <div className="flip-card__front">
              <div className="title">Log in</div>
              <form className="flip-card__form" onSubmit={(e) => onLogin(e, username, password)}>
                <input
                  className="flip-card__input"
                  placeholder="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                />
                <input
                  className="flip-card__input"
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button className="flip-card__btn">
                  {authLoading ? "..." : "Let's go!"}
                </button>
              </form>
            </div>

            {/* --- SIGN UP SIDE --- */}
            <div className="flip-card__back">
              <div className="title">Sign up</div>
              <form className="flip-card__form" onSubmit={(e) => onRegister(e, username, password)}>
                {/* Shared State for simplicity */}
                <input
                  className="flip-card__input"
                  placeholder="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                />
                <input
                  className="flip-card__input"
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button className="flip-card__btn">
                  {authLoading ? "..." : "Confirm!"}
                </button>
              </form>
            </div>
          </div>
        </label>
      </div>

      {/* ERROR MESSAGE */}
      {authError &&
        <Toast
          message={authError}
          onClose={onClearError} />
      }

    </div>
  );
}
