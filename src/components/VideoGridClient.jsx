// components/VideoGridClient.jsx
"use client";
import { useState } from "react";

export default function VideoGridClient({ videos = [] }) {
  // default to empty array
  const [selectedVideo, setSelectedVideo] = useState(null);

  return (
    <div>
      {videos.length === 0 ? (
        <p>No videos found.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {videos.map((video) => (
            <div
              key={video._id}
              className="bg-white shadow rounded overflow-hidden cursor-pointer hover:shadow-md transition"
              onClick={() => setSelectedVideo(video)}
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-black mb-1">
                  {video.title}
                </h3>
                <p className="text-sm text-gray-700">
                  Price: {video.price === 0 ? "Free" : `$${video.price}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
