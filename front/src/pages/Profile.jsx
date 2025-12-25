import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Loader2 } from "lucide-react";
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
  const [uploading, setUploading] = useState(false); // For avatar uploads

  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState(null);
  const fileInputRef = useRef(null); // Reference to the hidden input

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

          // instead of making a separate API call just to get your face, peek at the first shot in the list and save that as the avatar url
          // TO DO, /me endpoint
          if (pageNum === 1 && newShots.length > 0) {
            setAvatarUrl(newShots[0].owner_avatar);
          }

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

  // to trigger the hidden file input
  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  // Helper the file selection & Upload
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Optimistic UI: shows the image immediately before upload finishes
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/profile/avatar`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setAvatarUrl(data.avatar_url);
        alert("Profile picture updated!");

      } else {
        alert("Failed to upload image.");
      }

    } catch (error) {
      console.error("Upload error:", error);
      alert("Something went wrong.");
    } finally {
      setUploading(false);
    }

  };

  // Helper for display pfp
  const getDisplayAvatar = () => {
    if (avatarUrl) {
      return avatarUrl.startsWith("http")
        ? avatarUrl
        : `${API_URL}${avatarUrl}`;
    }
    return `https://ui-avatars.com/api/?name=${currentUser}&background=random&color=fff&size=128`;
  };

  // handler to load more shots
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMyShots(nextPage);
  };

  // Helper to update current displayed shots
  const handleShotDeleted = (deletedShotId) => {
    setMyShots((prev) => prev.filter(shot => shot.id !== deletedShotId));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 pb-24">

      {/* --- PROFILE HEADER --- */}
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md text-center mb-6 border-t-4 border-black relative">

        {/* --- CLICKABLE AVATAR --- */}
        <div className="relative w-32 h-32 mx-auto mb-4 group cursor-pointer" onClick={handleAvatarClick}>

          {/* The Image */}
          <img
            src={getDisplayAvatar()}
            alt="Profile"
            className={`w-full h-full rounded-full object-cover border-4 border-gray-100 shadow-lg transition duration-300 group-hover:brightness-75 ${uploading ? "opacity-50" : ""}`}
          />

          {/* The "Hover" Overlay (Desktop) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
            <Pencil className="text-white w-8 h-8" />
          </div>

          {/* The "Mobile" Badge (Always Visible) */}
          <div className="absolute bottom-1 right-1 bg-black text-white p-2 rounded-full border-2 border-white shadow-sm md:hidden">
            <Pencil size={14} />
          </div>

          {/* Loading Spinner (When uploading) */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="text-black w-10 h-10 animate-spin" />
            </div>
          )}

          {/* THE HIDDEN INPUT */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        <h1 className="text-3xl font-bold mb-2">@{currentUser}</h1>
        <p className="text-gray-500 mb-6">
          {loadingInitial ? "..." : `${myShots.length} Shots, the more the merrier!`}
        </p>

        <button
          onClick={onLogout}
          className="w-full bg-red-500 text-white border border-red-100 font-bold py-2 px-4 rounded-xl hover:bg-red-700 hover:text-white transition cursor-pointer"
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
