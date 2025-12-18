import { useState } from 'react'
import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL;

export default function ShotCard({ token, shot, currentUser, onDelete }) {

  const [currentLikes, setCurrentLikes] = useState(shot.like_count);
  const [currentComments, setCurrentComments] = useState(shot.comments);

  const [isCommenting, setIsCommenting] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentError, setCommentError] = useState(null)
  const [loading, setLoading] = useState(false)


  // function to handle like
  const handleLike = async () => {
    if (loading) return; // Prevent spamming
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/shot/${shot.id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.detail);
      } else {
        // Update the number of likes locally
        setCurrentLikes(prev => prev + 1);
      }


    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // function to handle comment
  const handleComment = async () => {
    if (!commentText.trim()) return;
    setLoading(true);
    setCommentError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/shot/${shot.id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: commentText })
      });

      if (!response.ok) {
        const err = await response.json();
        setCommentError(err.detail);
      } else {
        // Add the comment to the list locally
        const newComment = {
          id: Date.now(), // Temporary ID
          owner: currentUser,
          content: commentText
        };

        setCurrentComments(prev => [...prev, newComment]);
        setCommentText("");
        setIsCommenting(false);
      }


    } catch (e) {
      setCommentError(e.message);
    } finally {
      setLoading(false);
    }
  }
  // Function to delete shot
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this shot?")) return;

    try {
      const response = await fetch(`${API_URL}/shot/${shot.id}/delete`, {
        method: 'DELETE',
        headers: {'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // This removes it from the UI immediately
        if (onDelete) onDelete();

      } else {
        const err = await response.json();
        alert(err.detail || "Failed to delete the shot");
      }

    } catch (e) {
      console.error(e);
      alert("Network Error: " + e.message);
    }
  }

  const isOwner = shot.owner === currentUser;

  return (
    <div className="bg-white p-4 rounded shadow border-l-4 border-black-500 transition hover:shadow-md mb-4">

      {/* HEADER */}
      <div className="flex justify-between items-baseline mb-2">
        <p className="font-bold text-gray-700">@{shot.owner}</p>

        {/* THE TRASH ICON  */}
        {/* Only render if isOwner is true */}
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400">
            {new Date(shot.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>

          {isOwner && (
            <button
              onClick={handleDelete}
              className="text-gray-400 hover:text-red-600 transition p-1 cursor-pointer"
              title="Delete Shot"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* --- IMAGE DISPLAY --- */}
      {shot.image_url && (
        <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
          <img
            src={
              shot.image_url.startsWith("http")
                ? shot.image_url  // It's a Cloud Link (R2) -> Use as is
                : `${API_URL}${shot.image_url}` // It's Local -> Add localhost
            }
            alt="Shot visual"
            className="w-full h-auto object-cover max-h-96"
          />
        </div>
      )}

      {/* CAPTION */}
      <h2 className="text-2xl font-serif text-center mb-4 break-words w-full">{shot.caption}</h2>

      {/* ACTIONS BAR */}
      <div className="flex items-center gap-4 text-gray-500 border-t pt-3">

        {/* Like Button */}
        <button
          onClick={handleLike}
          disabled={loading}
          className="flex items-center gap-1 hover:text-red-500 transition disabled:opacity-50 cursor-pointer"
        >
          <Heart size={20} fill={currentLikes > shot.like_count ? "red" : "none"} color={currentLikes > shot.like_count ? "red" : "currentColor"} />
          <span className="text-sm font-bold">{currentLikes}</span>
        </button>

        {/* Comment Toggle */}
        <button
          onClick={() => setIsCommenting(!isCommenting)}
          className="flex items-center gap-1 hover:text-blue-500 transition cursor-pointer"
        >
          <MessageCircle size={20} />
          <span className="text-sm font-bold">{currentComments.length}</span>
        </button>
      </div>

      {/* COMMENTS SECTION */}
      <div className="mt-3 bg-gray-50 rounded p-2 text-sm">
        {/* List existing comments */}
        {currentComments.map((c, index) => (
          <div key={c.id || index} className="mb-1">
            <span className="font-bold text-gray-700 mr-2">@{c.owner}:</span>
            <span className="text-gray-600 break-words w-full">{c.content}</span>
          </div>
        ))}

        {/* Comment Input Box (Hidden by default) */}
        {isCommenting && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              className="border rounded px-2 py-1 w-full"
              placeholder="One word comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              onClick={handleComment}
              disabled={loading}
              className="bg-black text-white p-1 rounded hover:opacity-80 cursor-pointer"
            >
              <Send size={16} />
            </button>
          </div>
        )}

        {/* Error Message for this specific card */}
        {commentError && <p className="text-red-500 text-xs mt-1">{commentError}</p>}

      </div>
    </div>
  )
}
