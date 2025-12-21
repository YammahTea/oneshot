import React, { useState, useEffect } from 'react';
import ShotCard from "../components/ShotCard.jsx";
import SkeletonShot from "../components/SkeletonShot.jsx";

const API_URL = import.meta.env.VITE_API_URL;

const Profile = ({ currentUser, onLogout, token }) => {

  const [myShots, setMyShots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch "My Shots" when the component loads
  useEffect(() => {
    const fetchMyShots = async () => {
      try {
        const response = await fetch(`${API_URL}/myshots`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setMyShots(data);
        } else {
          console.error("Failed to fetch profile shots");
        }

      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchMyShots();

  }, [token]);

  const handleShotDeleted = (deletedShotId) => {
    setMyShots((prev) => prev.filter(shot => shot.id !== deletedShotId));
  };


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 pb-24">

      {/* --- PROFILE HEADER --- */}
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md text-center mb-6 border-t-4 border-black">
        <h1 className="text-3xl font-bold mb-2">@{currentUser}</h1>
        <p className="text-gray-500 mb-6">
          {loading ? "..." : `${myShots.length} Shots, the more the merrier!`}
        </p>

        <button
          onClick={onLogout}
          className="w-full bg-red-50 text-black-500 border border-red-200 font-bold py-2 px-4 rounded-xl hover:bg-red-600 transition cursor-pointer"
        >
          Logout
        </button>
      </div>

      {/* --- MY SHOTS LIST --- */}
      <div className="w-full max-w-md space-y-4 px-4">

        {loading ? (

          // show 2 Skeletons while fetching
          <>
            <SkeletonShot />
            <SkeletonShot />
          </>
        ) : myShots.length === 0 ? (
          <div className="text-center mt-10">
            <p className="text-gray-400 mb-4">You haven't posted anything yet.</p>
          </div>
        ) : (
          myShots.map((shot) => (
            <ShotCard
              key={shot.id}
              token={token}
              shot={shot}
              currentUser={currentUser}
              onDelete={() => handleShotDeleted(shot.id)}
            />
          ))
        )}

      </div>
    </div>
  );
};

export default Profile;
