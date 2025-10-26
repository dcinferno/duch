"use client";
import { useState, useRef, useEffect } from "react";

export default function VideoGridClient({ videos = [] }) {
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const videoRefs = useRef({});

  // 🗓️ Format Date Helper (same as original)
  const formatDate = (dateInput) => {
    if (!dateInput) return "";
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

  // 🎥 Lazy-load grid videos (metadata for thumbnails)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const videoEl = entry.target;
            if (videoEl.dataset.src) {
              videoEl.src = videoEl.dataset.src;
              videoEl.preload = "metadata";
              videoEl.removeAttribute("data-src");
            }
          }
        });
      },
      { rootMargin: "300px" } // earlier trigger for smoother scroll loading
    );

    Object.values(videoRefs.current).forEach(
      (el) => el && observer.observe(el)
    );
    return () => observer.disconnect();
  }, [videos]);

  // ⚡ Regular browser preload helper
  const preloadVideoLink = (url) => {
    if (!url) return;
    const existing = document.querySelector(`link[as="video"][href="${url}"]`);
    if (!existing) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = url;
      document.head.appendChild(link);
    }
  };

  // ⚡ Aggressive manual preloader — fetches first ~8–16 MB into cache
  const aggressivePreload = async (url, maxMB = 8) => {
    if (!url) return;

    try {
      // Skip if already cached or being preloaded
      if (window.__preloadingVideos?.[url]) return;

      window.__preloadingVideos = window.__preloadingVideos || {};
      window.__preloadingVideos[url] = true;

      const controller = new AbortController();
      const signal = controller.signal;
      const response = await fetch(url, { signal, mode: "cors" });

      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      let bytesFetched = 0;
      const maxBytes = maxMB * 1024 * 1024;

      while (true) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        bytesFetched += value.length;
        if (bytesFetched > maxBytes) {
          controller.abort(); // stop after enough data is cached
          break;
        }
      }

      // Allow re-preloading later if needed
      delete window.__preloadingVideos[url];
    } catch (err) {
      // Ignore aborts and CORS issues
    }
  };

  // 🟢 Open modal
  const openVideo = (index) => {
    const video = videos[index];
    setSelectedVideoIndex(index);
    setSelectedVideo(video);
    // Warm up aggressively before showing
    preloadVideoLink(video.url);
    aggressivePreload(video.url, 16); // ~12MB buffer for smooth start
  };

  // 🎞️ Preload neighbor videos
  useEffect(() => {
    if (selectedVideoIndex === null) return;

    const next = videos[selectedVideoIndex + 1];
    const prev = videos[selectedVideoIndex - 1];

    if (next) aggressivePreload(next.url, 6);
    if (prev) aggressivePreload(prev.url, 6);
  }, [selectedVideoIndex]);

  return (
    <div className="w-full">
      {videos.length === 0 ? (
        <p className="text-center text-gray-600">No videos found.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video, index) => (
            <div
              key={video._id}
              className="bg-white shadow-lg rounded-xl overflow-hidden hover:shadow-2xl transition cursor-pointer flex flex-col"
              onMouseEnter={() => aggressivePreload(video.url, 8)} // 🧠 pre-buffer on hover
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-64 sm:h-72 object-cover"
              />

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
                  onClick={() => openVideo(index)}
                  className="mt-3 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 w-full text-sm sm:text-base font-medium transition-all"
                >
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md md:max-w-lg relative overflow-auto">
            <button
              onClick={() => {
                setSelectedVideo(null);
                setSelectedVideoIndex(null);
              }}
              className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
            >
              &times;
            </button>

            <div className="p-6 flex flex-col items-center">
              <h2 className="text-xl font-bold mb-3 text-gray-900 text-center">
                {selectedVideo.title}
              </h2>

              <video
                key={selectedVideo.url}
                src={selectedVideo.url}
                controls
                preload="auto"
                autoPlay
                playsInline
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
