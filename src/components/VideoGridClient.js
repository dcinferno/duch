"use client";

import { useState } from "react";

export default function VideoGridClient({ videos }) {
  const [selectedVideo, setSelectedVideo] = useState(null);

  return (
    <div>
      {/* Video Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {videos.map((video) => (
          <div
            key={video._id}
            className="bg-white shadow rounded overflow-hidden cursor-pointer hover:shadow-md transition"
            onClick={() => setSelectedVideo(video)}
          >
            {/* Thumbnail Image */}
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-48 object-cover"
            />

            <div className="p-4">
              <h3 className="text-lg font-semibold text-black mb-1">
                {video.title}
              </h3>

              {/* 💲 Price */}
              {video.price !== undefined && (
                <p className="text-sm text-gray-700 mb-2">
                  Price:{" "}
                  <span className="font-medium">
                    {video.price === 0 ? "Free" : `$${video.price}`}
                  </span>
                </p>
              )}
              <p className="text-sm text-gray-600 mb-1">{video.category}</p>
              {/* Button (Optional click target) */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent parent click
                  setSelectedVideo(video);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Preview / Purchase
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full relative shadow-lg">
            {/* Close Button */}
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black text-xl"
            >
              &times;
            </button>

            <h2 className="text-xl font-bold mb-4">{selectedVideo.title}</h2>

            {/* Video Preview */}
            <video
              src={selectedVideo.previewUrl}
              controls
              className="w-full mb-4 rounded"
            />

            {/* Purchase Button */}
            <button
              onClick={() => {
                // You can replace this with real purchase logic
                alert(`Purchasing: ${selectedVideo.title}`);
              }}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              {selectedVideo.price === 0
                ? "Download for Free"
                : "Purchase Video"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
