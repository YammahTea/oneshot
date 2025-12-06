import {useState, useEffect} from 'react'

function App() {
  const [shots, setShots] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Function to send data to python
  const handlePost = async () => {
    if (!input || isSubmitting) return;

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 2000));
    setError(null);


    try {
      const response = await fetch('http://127.0.0.1:8000/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">

      <h1 className="text-4xl font-bold text-black-600 mb-8">OneShot.</h1>

      {/* Input Section */}
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md mb-6">
        <input
          type="text"
          placeholder="What is your word for today?"
          className="w-full border p-2 rounded mb-4 text-center text-lg"
          maxLength={50}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        {/* Error Message Area */}
        {error && <p className="text-red-500 text-center mb-2 font-bold">{error}</p>}

        <button
          onClick={handlePost}
          className="w-full text-center cursor-pointer bg-customGrey hover:bg-black transition-colors duration-500 shadow-[0px_4px_32px_0_rgba(99,102,241,.70)] px-6 py-3 rounded-xl border-[1px] border-slate-500 text-white font-medium group disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          disabled={!input || isSubmitting}
        >
          <div className="relative overflow-hidden">
            <p
              className="text-center group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]"
            >
              {isSubmitting ? "Sending..." : "Ready?"}
            </p>
            <p
              className="w-full text-center absolute top-7 left-0 group-hover:top-0 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]"
            >
              {isSubmitting ? "Sending..." : "Shot!"}
            </p>
          </div>
        </button>
      </div>

      {/* Feed Section - Dynamic Mapping */}
      <div className="w-full max-w-md space-y-4">
        {shots.map((shot) => (
          <div key={shot.id} className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
            <div className="flex justify-between items-baseline">
              <p className="font-bold text-gray-700">@{shot.owner}</p>
              <p className="text-xs text-gray-400">
                {new Date(shot.created_at).toLocaleTimeString()}
              </p>
            </div>
            <h2 className="text-2xl mt-2 font-serif text-center">{shot.caption}</h2>
          </div>
        ))}
      </div>

    </div>
  )
}
export default App

