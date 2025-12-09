import { useState } from 'react'
import { Heart, MessageCircle, Send } from 'lucide-react'

export default function ShotCard({ shot, currentUser, refreshFeed }) {
  const [isCommenting, setIsCommenting] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentError, setCommentError] = useState(null)
  const [loading, setLoading] = useState(false)


  // function to handle like
  const handleLike = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/shot/${shot.id}/like`, {
        method: 'POST',
        headers: {
          'x-username': currentUser
        }
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.detail);
      } else {
        refreshFeed();
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
      const response = await fetch(`http://127.0.0.1:8000/shot/${shot.id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-username': currentUser
        },
        body: JSON.stringify({ content: commentText })
      });

      if (!response.ok) {
        const err = await response.json();
        setCommentError(err.detail);
      } else {
        setCommentText("");
        setIsCommenting(false);
        refreshFeed();
      }


    } catch (e) {
      setCommentError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500 transition hover:shadow-md mb-4">

      {/* HEADER */}
      <div className="flex justify-between items-baseline mb-2">
        <p className="font-bold text-gray-700">@{shot.owner}</p>
        <p className="text-xs text-gray-400">
          {new Date(shot.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* --- IMAGE DISPLAY --- */}
      {shot.image_url && (
        <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
          <img
            src={`http://127.0.0.1:8000${shot.image_url}`}
            alt="Shot visual"
            className="w-full h-auto object-cover max-h-96"
          />
        </div>
      )}

      {/* CAPTION */}
      <h2 className="text-2xl font-serif text-center mb-4">{shot.caption}</h2>

      {/* ACTIONS BAR */}
      <div className="flex items-center gap-4 text-gray-500 border-t pt-3">

        {/* Like Button */}
        <button
          onClick={handleLike}
          disabled={loading}
          className="flex items-center gap-1 hover:text-red-500 transition disabled:opacity-50"
        >
          <Heart size={20} />
          <span className="text-sm font-bold">{shot.like_count}</span>
        </button>

        {/* Comment Toggle */}
        <button
          onClick={() => setIsCommenting(!isCommenting)}
          className="flex items-center gap-1 hover:text-blue-500 transition"
        >
          <MessageCircle size={20} />
          <span className="text-sm font-bold">{shot.comments.length}</span>
        </button>
      </div>

      {/* COMMENTS SECTION */}
      <div className="mt-3 bg-gray-50 rounded p-2 text-sm">
        {/* List existing comments */}
        {shot.comments.map(c => (
          <div key={c.id} className="mb-1">
            <span className="font-bold text-gray-700 mr-2">@{c.owner}:</span>
            <span className="text-gray-600">{c.content}</span>
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
              className="bg-black text-white p-1 rounded hover:opacity-80"
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
