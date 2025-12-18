import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Components
import AuthScreen from './components/AuthScreen';
import FloatingMenu from './components/FloatingMenu';

// Pages
import Feed from './pages/Feed';
import Upload from './pages/Upload';
import Profile from './pages/Profile';

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  // ----- AUTH STATE -----
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const [currentUser, setCurrentUser] = useState(localStorage.getItem('oneshot_username') || null);
  const [token, setToken] = useState(localStorage.getItem('oneshot_token') || null);

  // Helper function to save data
  const completeAuth = (data) => {
    localStorage.setItem('oneshot_token', data.access_token);
    localStorage.setItem('oneshot_username', data.username);
    setToken(data.access_token);
    setCurrentUser(data.username);
  };

  // Function for login
  const handleLogin = async (e, username, password) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
        throw new Error(errorMessage || "Failed to login");
      }
      completeAuth(await response.json());

    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Function to register
  const handleRegister = async (e, username, password) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
        throw new Error(data.detail || "Registration failed");
      }

      completeAuth(await response.json());

    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Function for LOGOUT
  const handleLogout = async () => {
    const storedToken = localStorage.getItem('oneshot_token');
    if (storedToken) {

      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${storedToken}`,
            "Content-Type": "application/json",
          }
        });

      } catch (error) {
        console.error("Logout warning:", error);
      }
    }

    localStorage.removeItem('oneshot_token');
    localStorage.removeItem('oneshot_username');
    setCurrentUser(null);
    setToken(null);
    window.location.href = "/"; // Force hard redirect to clear state
  };

  // --- 1. IF NOT LOGGED IN, SHOW AUTH ---
  if (!currentUser || !token) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <AuthScreen
          onLogin={handleLogin}
          onRegister={handleRegister}
          authLoading={authLoading}
          authError={authError}
          onClearError={() => setAuthError(null)}
        />
      </div>
    );
  }

  // --- 2. IF LOGGED IN, SHOW APP WITH ROUTER ---
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Feed token={token} currentUser={currentUser} />} />
        <Route path="/upload" element={<Upload token={token} currentUser={currentUser} />} />
        <Route path="/profile" element={<Profile
            currentUser={currentUser}
            onLogout={handleLogout}
            token={token}/>}
        />

        {/* Redirect unknown URLs to feed */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Menu bar */}
      <FloatingMenu />

    </BrowserRouter>
  );
}

export default App;
