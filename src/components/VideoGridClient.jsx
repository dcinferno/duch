"use client";
import { useState } from "react";

export default function VideoGridClient({ videos = [] }) {
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Helper to format dates
  const formatDate = (dateInput) => {
    if (!dateInput) return "";
    // Normalize MongoDB $date wrapper
    const date = dateInput.$date
      ? new Date(dateInput.$date)
      : new Date(dateInput);

    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="w-full">
      {videos.length === 0 ? (
        <p className="text-center text-gray-600">No videos found.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <div
              key={video._id}
              className="bg-white shadow-lg rounded-xl overflow-hidden hover:shadow-2xl transition cursor-pointer flex flex-col"
            >
              {/* Thumbnail */}
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-64 sm:h-72 object-cover"
              />

              {/* Info */}
              <div className="p-3 flex flex-col flex-1">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
                    {video.title}
                  </h3>

                  <p className="text-xs text-gray-500 mb-2">
                    {formatDate(video.createdAt)}
                  </p>

                  <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                    {video.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    {video.socialMediaUrl ? (
                      <a
                        href={video.socialMediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {video.creatorName}
                      </a>
                    ) : (
                      <span>{video.creatorName}</span>
                    )}
                    <span>
                      {video.price === 0 ? "Free" : `$${video.price}`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedVideo(video)}
                  className="mt-3 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 w-full text-sm sm:text-base font-medium transition-all"
                >
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md md:max-w-lg relative overflow-auto">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
            >
              &times;
            </button>

            <div className="p-6 flex flex-col items-center">
              <h2 className="text-xl font-bold mb-3 text-gray-900 text-center">
                {selectedVideo.title}
              </h2>

              <video
                src={selectedVideo.url}
                controls
                className="w-full max-h-[200px] sm:max-h-[300px] md:max-h-[400px] rounded mb-4 object-contain"
              />

              <p className="text-sm text-gray-700 mb-4 text-center">
                {selectedVideo.description}
              </p>

              <div className="flex justify-between items-center w-full">
                {selectedVideo.socialMediaUrl ? (
                  <a
                    href={selectedVideo.socialMediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {selectedVideo.creatorName}
                  </a>
                ) : (
                  <span className="text-sm text-gray-600">
                    {selectedVideo.creatorName}
                  </span>
                )}

                <span className="text-sm text-gray-800 font-semibold">
                  {selectedVideo.price === 0
                    ? "Free"
                    : `$${selectedVideo.price}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
