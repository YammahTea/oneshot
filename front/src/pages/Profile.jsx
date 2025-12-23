import React, { useState, useEffect } from 'react';
import ShotCard from "../components/ShotCard.jsx";
import SkeletonShot from "../components/SkeletonShot.jsx";

const API_URL = import.meta.env.VITE_API_URL;

const Profile = ({ currentUser, onLogout, token }) => {

  // --- STATE MANAGEMENT ---
  const [myShots, setMyShots] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Split loading
  const [loadingInitial, setLoadingInitial] = useState(true); // Big Skeletons
  const [loadingMore, setLoadingMore] = useState(false);      // Small spinner on button

  // Fetch "My Shots" when the component loads
  const fetchMyShots = async (pageNum) => {

    if (loadingMore) return;

    // Decide which loader to show
    if (pageNum === 1) setLoadingInitial(true); // skeleton
    else setLoadingMore(true);

    try {
      const response = await fetch(`${API_URL}/myshots?page=${pageNum}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const newShots = await response.json();

        if (newShots.length === 0) {
          setHasMore(false); // Stop the button from showing
        } else {
          // If Page 1 -> Overwrite. If Page 2+ -> Append.
          setMyShots(prev => pageNum === 1 ? newShots : [...prev, ...newShots]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch your shots:", err);
    } finally {
      // Turn off both loaders
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  };

  // --- EFFECTS ---
  // Initial Load (Page 1)
  useEffect(() => {
    if (token) {
      setPage(1);
      setHasMore(true);
      fetchMyShots(1);
    }
  }, [token]);

  // --- HANDLERS ---
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMyShots(nextPage);
  };

  const handleShotDeleted = (deletedShotId) => {
    setMyShots((prev) => prev.filter(shot => shot.id !== deletedShotId));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 pb-24">

      {/* --- PROFILE HEADER --- */}
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md text-center mb-6 border-t-4 border-black">
        <h1 className="text-3xl font-bold mb-2">@{currentUser}</h1>
        <p className="text-gray-500 mb-6">
          {loadingInitial ? "..." : `${myShots.length} Shots, the more the merrier!`}
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

        {loadingInitial ? (

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

        {/* LOAD MORE BUTTON */}
        {hasMore && myShots.length > 0 && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full py-4 mt-4 text-gray-500 font-bold hover:text-black transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        )}

        {!hasMore && (
          <p className="text-center text-gray-400 mt-10">You have reached the end. Congrats... but consider posting</p>
        )}

      </div>
    </div>
  );
};

export default Profile;
