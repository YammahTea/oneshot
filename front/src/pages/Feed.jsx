import React, { useState, useEffect} from 'react';
import ShotCard from "../components/ShotCard.jsx";

const API_URL = import.meta.env.VITE_API_URL;

const Feed = ({ token, currentUser }) => {

  const [shots, setShots] = useState([]);
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
  // Run on the start
  useEffect(() => {
    fetchShots()
  }, []);


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 pb-24">
      <div className="w-full max-w-md flex justify-between items-center mb-6 px-4">
        <h1 className="text-4xl font-bold text-black">OneShot.</h1>
      </div>

      <div className="w-full max-w-md space-y-4 px-4">
        {shots.map((shot) => (
          <ShotCard
            token={token}
            key={shot.id}
            shot={shot}
            currentUser={currentUser}
            refreshFeed={fetchShots}
          />
        ))}
        {shots.length === 0 && (
          <p className="text-center text-gray-400 mt-10">No shots yet. Be the first.</p>
        )}
      </div>
    </div>
  );
};

export default Feed;
