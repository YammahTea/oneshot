import React from 'react';

const Profile = ({currentUser, onLogout}) => {

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-2">@{currentUser}</h1>
        <p className="text-gray-500 mb-8">OneShot Member</p>

        <button
          onClick={onLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-red-500/30 cursor-pointer"
        >
          Logout
        </button>

        <p className="text-gray-500 mb-0 mt-3">More profile features will be added...</p>

      </div>
    </div>
  );
};

export default Profile;
