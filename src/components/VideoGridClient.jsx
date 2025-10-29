"use client";
import { useState, useRef, useEffect } from "react";

export default function VideoGridClient({ videos = [] }) {
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [VideoViewss, setVideoViewss] = useState({});
  const videoRefs = useRef({});
  const loggedVideosRef = useRef(new Set());
  const fetchQueue = useRef([]);
  const isProcessingQueue = useRef(false);

  // 🗓️ Format Date Helper
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

  // 🧩 Filtering logic
  const filteredVideos = videos.filter((v) => {
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => v.tags?.includes(tag));
    const matchesPremium = !showPremiumOnly || v.premium === true;
    return matchesTags && matchesPremium;
  });

  // ⚡ Lazy-load video src
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
      { rootMargin: "300px" }
    );

    Object.values(videoRefs.current).forEach(
      (el) => el && observer.observe(el)
    );
    return () => observer.disconnect();
  }, [videos]);

  // ⚡ Preload helpers
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

  const aggressivePreload = async (url, maxMB = 8) => {
    if (!url) return;
    try {
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
          controller.abort();
          break;
        }
      }

      delete window.__preloadingVideos[url];
    } catch {}
  };

  // 🟢 Open modal
  const openVideo = (index) => {
    const video = filteredVideos[index];
    setSelectedVideoIndex(index);
    setSelectedVideo(video);
    preloadVideoLink(video.url);
    aggressivePreload(video.url, 16);
  };

  // 🎞️ Preload neighbor videos
  useEffect(() => {
    if (selectedVideoIndex === null) return;
    const next = filteredVideos[selectedVideoIndex + 1];
    const prev = filteredVideos[selectedVideoIndex - 1];
    if (next) aggressivePreload(next.url, 6);
    if (prev) aggressivePreload(prev.url, 6);
  }, [selectedVideoIndex]);

  // 🏷️ Tags
  const allTags = Array.from(new Set(videos.flatMap((v) => v.tags || [])));
  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  const togglePremium = () => setShowPremiumOnly((prev) => !prev);
  const clearFilters = () => {
    setSelectedTags([]);
    setShowPremiumOnly(false);
  };

  // ❌ Log video view
  const logVideoViews = async (videoId) => {
    if (!videoId || loggedVideosRef.current.has(videoId)) return;
    loggedVideosRef.current.add(videoId);
    setVideoViewss((prev) => ({
      ...prev,
      [videoId]: (prev[videoId] || 0) + 1,
    }));
    try {
      await fetch("/api/video-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
    } catch {}
  };

  // 👁️ Throttled queue for fetching views
  const processQueue = async () => {
    if (isProcessingQueue.current) return;
    isProcessingQueue.current = true;

    while (fetchQueue.current.length > 0) {
      const videoId = fetchQueue.current.shift();
      if (videoId && !VideoViewss[videoId]) {
        try {
          const res = await fetch(`/api/video-views?videoId=${videoId}`);
          if (!res.ok) continue;
          const data = await res.json();
          setVideoViewss((prev) => ({
            ...prev,
            [videoId]: data.totalViews || 0,
          }));
        } catch {
          setVideoViewss((prev) => ({ ...prev, [videoId]: 0 }));
        }
      }
      await new Promise((r) => setTimeout(r, 500)); // 500ms delay between requests
    }

    isProcessingQueue.current = false;
  };

  // 👁️ IntersectionObserver for visible videos
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const videoId = entry.target.dataset.videoId;
            if (videoId && !VideoViewss[videoId]) {
              fetchQueue.current.push(videoId);
              processQueue();
            }
          }
        });
      },
      { rootMargin: "200px" }
    );

    Object.values(videoRefs.current).forEach(
      (el) => el && observer.observe(el)
    );
    return () => observer.disconnect();
  }, [filteredVideos, VideoViewss]);

  // ------------------- JSX -------------------
  return (
    <div className="w-full">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        <button
          onClick={togglePremium}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showPremiumOnly
              ? "bg-purple-600 text-white border-purple-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
          }`}
        >
          💎 Featured Only
        </button>

        {allTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                isSelected
                  ? "bg-green-600 text-white border-green-600 shadow-lg scale-105"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
              }`}
            >
              #{tag}
            </button>
          );
        })}

        {(selectedTags.length > 0 || showPremiumOnly) && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-full border text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-800 transition-all"
          >
            Clear Filters ✖️
          </button>
        )}
      </div>

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <p className="text-center text-gray-600">
          No videos found matching current filters.
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVideos.map((video, index) => (
            <div
              key={video._id}
              data-video-id={video._id} // Important for throttled fetching
              ref={(el) => (videoRefs.current[video._id] = el)}
              className="bg-white shadow-lg rounded-xl overflow-hidden hover:shadow-2xl transition cursor-pointer flex flex-col"
              onMouseEnter={() => aggressivePreload(video.url, 8)}
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-64 sm:h-72 object-cover"
              />

              <div className="p-3 flex flex-col flex-1">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                      {video.title}
                    </h3>
                    {video.premium && (
                      <span className="text-purple-600 text-sm font-semibold">
                        💎
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-2">
                    {formatDate(video.createdAt)}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                    {video.description}
                  </p>

                  <p className="text-xs text-gray-500 mb-2">
                    {VideoViewss[video._id] || 0} views
                  </p>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {video.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

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

      {/* Video Modal */}
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
                onPlay={() => logVideoViews(selectedVideo._id)}
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
