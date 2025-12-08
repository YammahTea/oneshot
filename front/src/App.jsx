import {useState, useEffect} from 'react'
import ShotCard from './components/ShotCard'

function App() {

  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState(null);

  const [shots, setShots] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem('oneshot_username' || '')
  );



  // Runs once at the beginning to fetch shots
  useEffect(() => {
    fetchShots()
  }, [])

  // Function to fetch shots from python
  const fetchShots = async () => {

    try {
      const response = await fetch('http://127.0.0.1:8000/shots');
      const data = await response.json()
      setShots(data)
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }

  // Function for login
  const handleLogin = () => {
    if (!loginInput.trim()) {
      setLoginError("You must specify a username silly!");
      return;
    }

    localStorage.setItem('oneshot_username', loginInput); // save username in the browser memory
    setCurrentUser(loginInput);
  }

  // Function to send data to python
  const handlePost = async () => {
    if (!input || isSubmitting) return;

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 2000));
    setError(null);


    try {
      const response = await fetch('http://127.0.0.1:8000/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-username': currentUser,},
        body: JSON.stringify({content: input})
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Something went wrong!");
      }

      setInput("")

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
      await fetchShots();
    }
  }

  // UI part

  // Login screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
          <h1 className="text-4xl font-bold text-black mb-2">OneShot.</h1>
          <p className="text-gray-500 mb-6">Pick a name. Make it count.</p>

          <input
            type="text"
            placeholder="username"
            className="w-full border-2 border-gray-200 p-3 rounded-lg mb-4 text-center text-xl focus:border-black outline-none transition"
            value={loginInput}
            onChange={(e) => {
              setLoginInput(e.target.value)
              setLoginError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />

          {loginError && <p className="text-red-500 text-center mb-2 font-bold">{loginError}</p>}

          <button
            onClick={handleLogin}
            id="LoginButton"
          >
            Enter
          </button>

        </div>
      </div>

    )
  }



  // --- 5. MAIN APP UI (Logged In) ---
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
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md mb-6">
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
          disabled={!input || isSubmitting}
        >
          <div className="relative overflow-hidden">
            <p className="text-center group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
              {isSubmitting ? "Sending..." : "Ready?"}
            </p>
            <p className="w-full text-center absolute top-7 left-0 group-hover:top-0 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
              {isSubmitting ? "Sending..." : "Shot!"}
            </p>
          </div>
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("oneshot_username");
            window.location.reload();
          }}
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
            key={shot.id}
            shot={shot}
            currentUser={currentUser}
            refreshFeed={fetchShots}
          />
        ))}
      </div>

    </div>
  )
}
export default App

