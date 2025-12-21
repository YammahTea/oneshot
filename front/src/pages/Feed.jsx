import React, { useState, useEffect} from 'react';
import ShotCard from "../components/ShotCard.jsx";
import SkeletonShot from "../components/SkeletonShot.jsx";

const API_URL = import.meta.env.VITE_API_URL;

const Feed = ({ token, currentUser }) => {

  const [shots, setShots] = useState([]);
  const [page, setPage] = useState(1); // tracks current page
  const [hasMore, setHasMore] = useState(true); // stop fetching if empty
  const [isLoading, setIsLoading] = useState(false); // loading state to prevent overshooting

  // Function to fetch shots
  const fetchShots = async (pageNum = 1) => {

    if (isLoading) return; // Prevent double clicks
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/shots?page=${pageNum}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const newShots = await response.json();

        if (newShots.length === 0) {
          setHasMore(false); // no more data to load
        } else {
          // If page 1, replace. If page 2+, append.
          setShots(prev => pageNum === 1 ? newShots : [...prev, ...newShots]);
        }
      }

    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  }
  // Run on the start
  useEffect(() => {
    fetchShots( 1)
  }, []);

  // Handler for "Load More" button
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchShots(nextPage);
  };

  const removeShotFromFeed = (deletedShotId) => {
    setShots((prevShots) => prevShots.filter(shot => shot.id !== deletedShotId));
  };


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 pb-24">
      <div className="w-full max-w-md flex justify-between items-center mb-6 px-4">
        <h1 className="text-4xl font-bold text-black">OneShot.</h1>
      </div>

      <div className="w-full max-w-md space-y-4 px-4">

        {isLoading && shots.length === 0 && (
          <>
            <SkeletonShot />
            <SkeletonShot />
          </>
        )}

        {shots.map((shot) => (
          <ShotCard
            token={token}
            key={shot.id}
            shot={shot}
            currentUser={currentUser}
            onDelete={() => removeShotFromFeed(shot.id)}
          />
        ))}

        {/* LOAD MORE BUTTON */}
        {hasMore && shots.length > 0 && (
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="w-full py-4 mt-4 text-gray-500 font-bold hover:text-black transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Loading..." : "Load more"}
          </button>
        )}

        {!hasMore && (
          <p className="text-center text-gray-400 mt-10">You have reached the end. Congrats...</p>
        )}

        {shots.length === 0 && !isLoading && (
          <p className="text-center text-gray-400 mt-10">No shots yet. Be the first.</p>
        )}
      </div>
    </div>
  );
};

export default Feed;
