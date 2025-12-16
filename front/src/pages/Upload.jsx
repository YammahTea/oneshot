import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const Upload = ({ token, currentUser }) => {
  const navigate = useNavigate();

  // State
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);

  // Cooldown Logic
  useEffect(() => {
    if (cooldownTimer > 0) {
      const timerId = setTimeout(() => setCooldownTimer(c => c - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [cooldownTimer]);

  // Handle Post
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
        let errorMessage = data.detail || "Failed to post";
        if (response.status === 429) errorMessage = "You have already made your Shot silly!";

        const error = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }

      // SUCCESS!
      // Redirect the user back to the feed after posting
      navigate('/');

    } catch (err) {
      if (err.status === 429 || err.message.includes("Wait")) {
        setCooldownTimer(5);
      }
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileName = (name) => {
    if (!name) return "";
    if (name.length <= 20) return name;
    const parts = name.split('.');
    const ext = parts.pop();
    const base = parts.join('.');
    return `${base.substring(0, 10)}...${ext}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-10 rounded-lg shadow-md w-full max-w-md mb-6">
        <h2 className="text-2xl font-bold text-center mb-6">New Shot</h2>

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
          <input type="file" id="file-upload" accept="image/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files[0])} />
          <div className="content__item">
            <label htmlFor="file-upload" className="uploadImageButton uploadImageButton--pan">
              <span>{selectedFile ? "Change Image" : "Upload Image"}</span>
            </label>
          </div>
          {selectedFile && (
            <>
              <span className="text-sm text-gray-500 italic">{formatFileName(selectedFile.name)}</span>
              <button onClick={() => setSelectedFile(null)} className="text-red-500 hover:text-red-700 font-bold ml-1">✕</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;
