import React from 'react';

export default function SkeletonShot() {
  return (
    <div className="bg-white p-4 rounded shadow border-l-4 border-gray-200 mb-4 w-full animate-pulse">

      {/* Header: User & Time */}
      <div className="flex justify-between items-baseline mb-2">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div> {/* Username */}
        <div className="h-3 bg-gray-200 rounded w-16"></div>  {/* Time */}
      </div>

      {/* Image Placeholder */}
      <div className="mb-4 rounded-lg bg-gray-200 w-full h-40"></div>

      {/* Caption Placeholder */}
      <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>

      {/* Actions Bar */}
      <div className="flex items-center gap-4 border-t border-gray-100 pt-3">
        <div className="h-5 w-5 bg-gray-200 rounded-full"></div> {/* Like Icon */}
        <div className="h-5 w-5 bg-gray-200 rounded-full"></div> {/* Comment Icon */}
      </div>

    </div>
  );
}
