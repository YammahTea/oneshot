import {useState, useEffect} from 'react'
import ShotCard from './components/ShotCard'
import AuthScreen from './components/AuthScreen'

const API_URL = import.meta.env.VITE_API_URL;

function App() {

  // ----- APP STATE -----
  const [shots, setShots] = useState([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);

  // ----- AUTH STATE -----
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // ----- USER STATE -----
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('oneshot_username') || null);
  const [token, setToken] = useState(localStorage.getItem('oneshot_token') || null);


  // Runs once at the beginning to fetch shots
  useEffect(() => {
    if (currentUser || token) {fetchShots()}
  }, [currentUser, token]);

  // Function for handling cooldown timers
  useEffect(() => {

    if (cooldownTimer > 0) {
      const timerId = setTimeout(() => {
        setCooldownTimer(cooldownTimer - 1);
      }, 1000)

      return () => {clearTimeout(timerId);}
    }

  }, [cooldownTimer])


  // Function for login
  const handleLogin = async (e, username, password) => {
    e.preventDefault()
    setAuthLoading(true);
    setAuthError(null);

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try{
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        // Checks if 'detail' is an Array (which means it's that FastAPI validation list)
        // If yes, just grab the message from the first error.
        // If no, assume it's a string.
        const errorMessage = Array.isArray(data.detail)
          ? data.detail[0].msg
          : data.detail;

        throw new Error(errorMessage || "Failed to login");
      }

      const data = await response.json();
      completeAuth(data);

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
        // Checks if 'detail' is an Array (which means it's that FastAPI validation list)
        // If yes, just grab the message from the first error.
        // If no, assume it's a string.
        const errorMessage = Array.isArray(data.detail)
          ? data.detail[0].msg
          : data.detail;

        throw new Error(data.detail || "Registration failed");
      }

      const data = await response.json();
      completeAuth(data);

    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Helper function to save data
  const completeAuth = (data) => {
    localStorage.setItem('oneshot_token', data.access_token);
    localStorage.setItem('oneshot_username', data.username);
    setToken(data.access_token);
    setCurrentUser(data.username);
  }

  // Function for LOGOUT
  const handleLogout = async () => {

    // 1- Get token before deleting it
    const token = localStorage.getItem('oneshot_token');

    // 2- Kill the token in the server side
    if (token) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        });

      } catch (error) {
        console.error("Logout warning:", error);
      }
    }

    // 3- Delete the token client side
    localStorage.removeItem('oneshot_token');
    localStorage.removeItem('oneshot_username');
    setCurrentUser(null);
    setToken(null);

    // 4- Redirect the user
    window.location.reload();

  }

  // Function to fetch shots
  const fetchShots = async () => {
    try {
      const response = await fetch(`${API_URL}/shots`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setShots(await response.json());
      }

    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }

  // Function to handle posting a shot
  const handlePost = async () => {
    if (!input || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('caption', input);
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      const response = await fetch(`${API_URL}/post`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        // Default to whatever the server sends
        let errorMessage = data.detail || "Failed to post";

        if (response.status === 429) {
          errorMessage = "You have already made your Shot silly!";
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }
      // Clear input field and upload field
      setInput(""); setSelectedFile(null);

      // TIMER FOR SPAM PROTECTION
      setCooldownTimer(5);

      await fetchShots();

    } catch (err) {
      // Prevent the user from spamming the button if an error occurred
      if (err.status === 429 || err.message.includes("Wait")) {
        setCooldownTimer(5);
      }
      setError(err.message);

    } finally {
      setIsSubmitting(false);
    }
  }


  // Helper function to make "really_long_image_name.png" -> "really_lon....png"
  const formatFileName = (name) => {
    if (!name) return "";
    if (name.length <= 20) return name; // If short, return as is

    // Split name and extension
    const parts = name.split('.');
    const ext = parts.pop(); // get "png"
    const base = parts.join('.'); // get the rest

    // Take first 10 chars + ... + extension
    return `${base.substring(0, 10)}...${ext}`;
  }

  // --- THE ROUTER SWITCH ---
  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        authLoading={authLoading}
        authError={authError}
        onClearError={() => setAuthError(null)}
      />
    );
  }

  // --- MAIN APP (FEED) ---
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 justify-center">

      {/* Header with Username */}
      <div className="w-full max-w-md flex justify-between items-center mb-0 px-4">
        <h1 className="text-4xl font-bold text-black">OneShot.</h1>
        <div className="text-right">
          <p className="text-xs text-gray-400">Logged in as</p>
          <p className="font-bold text-lg">@{currentUser}</p>
        </div>
      </div>


      {/* Input Section */}
      <div className="bg-white p-10 rounded-lg shadow-md w-full max-w-md mb-6">

        <input
          type="text"
          placeholder={`What is your word, ${currentUser}?`}
          className="w-full border p-2 rounded mb-4 text-center text-lg"
          maxLength={50}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />


        {error && <p className="text-red-500 text-center mb-2 font-bold">{error}</p>}

        <button
          onClick={handlePost}
          className="w-full text-center cursor-pointer bg-customGrey hover:bg-black transition-colors duration-500 shadow-[0px_4px_32px_0_rgba(99,102,241,.70)] px-6 py-3 rounded-xl border-[1px] border-slate-500 text-white font-medium group disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          disabled={!input || isSubmitting || cooldownTimer > 0}
        >
          <div className="relative overflow-hidden">
            <p className="text-center group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
              {isSubmitting ? "Sending..." : cooldownTimer > 0 ? `Wait ${cooldownTimer}s` : "Ready?"}
            </p>
            <p className="w-full text-center absolute top-7 left-0 group-hover:top-0 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
              {isSubmitting ? "Sending..." : cooldownTimer > 0 ? `Wait ${cooldownTimer}s` : "Shot!"}
            </p>
          </div>
        </button>

        {/* File Input */}
        <div className="mb-4 mt-2 flex items-center justify-center gap-2">
          {/* 1. The Real Input (Hidden) */}
          <input
            type="file"
            id="file-upload"
            accept="image/*"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />

          {/* 2. The Custom Button (Label) */}
          <div className="content__item">
            <label
              htmlFor="file-upload"
              className="uploadImageButton uploadImageButton--pan"
            >
              {/* Dynamic Text: Change based on state */}
              <span>{selectedFile ? "Change Image" : "Upload Image"}</span>
            </label>
          </div>

          {/* 3. The Filename Display */}
          {selectedFile && (
            <span className="text-sm text-gray-500 italic">
                    {formatFileName(selectedFile.name)}
                </span>
          )}

          {/* 4. A tiny "X" to remove the file if they change their mind */}
          {selectedFile && (
            <button
              onClick={() => setSelectedFile(null)}
              className="text-red-500 hover:text-red-700 font-bold ml-1"
            >
              ✕
            </button>
          )}

        </div>

        <button
          onClick={handleLogout}
          className="text-xs text-red-500 underline mt-1 cursor-pointer hover:text-red-700"
        >
          Logout
        </button>

      </div>

      {/* Feed Section */}
      <div className="w-full max-w-md space-y-4 px-4 pb-10">
        {shots.map((shot) => (
          // components/ShotCard.jsx
          <ShotCard
            token={token}
            key= {shot.id}
            shot= {shot}
            currentUser= {currentUser}
            refreshFeed= {fetchShots}
          />
        ))}
      </div>

    </div>
  )
}

export default App

