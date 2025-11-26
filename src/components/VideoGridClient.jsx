"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VideoGridClient({ videos = [] }) {
  const router = useRouter();

  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [sortByViews, setSortByViews] = useState(false);
  const [sortByPrice, setSortByPrice] = useState(false);
  const [VideoViews, setVideoViews] = useState({});
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [FFThursday, setFFThursday] = useState(false);
  const [thursdayFilterOn, setThursdayFilterOn] = useState(false);
  const [FFWednesday, setFFWednesday] = useState(false);
  const [wednesdayFilterOn, setWednesdayFilterOn] = useState(false);

  const videoRefs = useRef({});
  const loggedVideosRef = useRef(new Set());
  const searchParams = useSearchParams();

  // Pagination
  const [visibleCount, setVisibleCount] = useState(12);
  const loadMoreRef = useRef(null);

  // Wed / Thu logic
  useEffect(() => {
    const today = new Date().getDay();
    setFFWednesday(today === 3);
    setFFThursday(today === 4);
  }, []);

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

  // Filters
  const filteredVideos = videos.filter((v) => {
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => v.tags?.includes(tag));

    const matchesPremium = !showPremiumOnly || v.premium === true;
    const matchesWednesday = !wednesdayFilterOn || v.tags.includes("wagon");
    const matchesThursday =
      !thursdayFilterOn || v.creatorName.includes("pudding");

    return matchesTags && matchesPremium && matchesWednesday && matchesThursday;
  });

  // Sorting
  const videosToRender = (() => {
    if (sortByPrice) {
      return [...filteredVideos].sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        return (VideoViews[b._id] ?? 0) - (VideoViews[a._id] ?? 0);
      });
    }
    if (sortByViews) {
      return [...filteredVideos].sort(
        (a, b) => (VideoViews[b._id] ?? 0) - (VideoViews[a._id] ?? 0)
      );
    }
    return filteredVideos;
  })();

  // Auto-open modal on page load if ?view= is present
  useEffect(() => {
    const id = searchParams.get("video");
    if (!id) return;

    const index = videos.findIndex((v) => v._id === id);
    if (index !== -1) {
      openVideo(index); // <-- PRELOADS restored
    }
  }, [searchParams, videos]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((prev) => prev + 12);
      },
      { rootMargin: "400px" }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, []);

  // Reset on filter change
  useEffect(() => {
    setVisibleCount(12);
  }, [
    selectedTags,
    showPremiumOnly,
    sortByViews,
    sortByPrice,
    wednesdayFilterOn,
    thursdayFilterOn,
  ]);

  const visibleVideos = videosToRender.slice(0, visibleCount);

  // Lazy-load images
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            if (el.dataset.src) {
              el.src = el.dataset.src;
              el.preload = "metadata";
              el.removeAttribute("data-src");
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

  // Preload helpers
  const preloadVideoLink = (url) => {
    if (!url) return;
    if (!document.querySelector(`link[as="video"][href="${url}"]`)) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = url;
      document.head.appendChild(link);
    }
  };

  const aggressivePreload = async (url, maxMB = 8) => {
    if (!url || window.__preloadingVideos?.[url]) return;
    window.__preloadingVideos = window.__preloadingVideos || {};
    window.__preloadingVideos[url] = true;

    try {
      const controller = new AbortController();
      const response = await fetch(url, { signal: controller.signal });

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
    } catch {
    } finally {
      delete window.__preloadingVideos[url];
    }
  };

  // OPEN MODAL + UPDATE URL
  const openVideo = (index) => {
    const video = visibleVideos[index];

    setSelectedVideo(video);
    setSelectedVideoIndex(index);

    // URL becomes ?view=<id> but page doesn't navigate
    router.push(`?video=${video._id}`, { shallow: true });

    preloadVideoLink(video.url);
    aggressivePreload(video.url, 16);
  };

  // PRELOAD next/previous videos when modal open
  useEffect(() => {
    if (selectedVideoIndex === null) return;
    const next = visibleVideos[selectedVideoIndex + 1];
    const prev = visibleVideos[selectedVideoIndex - 1];
    if (next) aggressivePreload(next.url, 6);
    if (prev) aggressivePreload(prev.url, 6);
  }, [selectedVideoIndex]);

  const allTags = Array.from(new Set(videos.flatMap((v) => v.tags || [])));

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const togglePremium = () => setShowPremiumOnly((prev) => !prev);

  const clearFilters = () => {
    setSelectedTags([]);
    setShowPremiumOnly(false);
    setSortByPrice(false);
    setSortByViews(false);
    setWednesdayFilterOn(false);
    setThursdayFilterOn(false);
  };

  // View counter
  const logVideoViews = async (videoId) => {
    if (!videoId || loggedVideosRef.current.has(videoId)) return;
    loggedVideosRef.current.add(videoId);

    setVideoViews((prev) => ({
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

  // Fetch views
  useEffect(() => {
    if (videos.length === 0) return;

    const fetchAllViews = async () => {
      try {
        const ids = videos.map((v) => v._id).join(",");
        const res = await fetch(`/api/video-views?videoIds=${ids}`);
        const data = await res.json();
        setVideoViews(data);
      } catch (err) {
        console.error("Failed to fetch views:", err);
      }
    };

    fetchAllViews();
  }, [videos]);

  // AUTO-OPEN MODAL IF URL HAS ?view=<id>
  useEffect(() => {
    if (videos.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("view");
    if (!id) return;

    const idx = visibleVideos.findIndex((v) => v._id === id);
    if (idx !== -1) openVideo(idx);
  }, [videos, visibleVideos]);

  // CLOSE MODAL + CLEAN URL
  const closeModal = () => {
    router.push("?", undefined, { shallow: true });
    setSelectedVideo(null);
    setSelectedVideoIndex(null);
  };

  return (
    <div className="w-full">
      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-3 mb-6 justify-center items-center">
        <span className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full shadow-sm">
          {videosToRender.length}{" "}
          {videosToRender.length === 1 ? "video" : "videos"}
        </span>

        {/* PREMIUM */}
        <button
          onClick={togglePremium}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showPremiumOnly
              ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
          }`}
        >
          💎 Featured Only
        </button>

        {/* MOST VIEWED */}
        <button
          onClick={() => {
            setSortByViews((p) => !p);
            if (!sortByViews) setSortByPrice(false);
          }}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            sortByViews
              ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
          }`}
        >
          🔥 Most Viewed
        </button>

        {/* BROKE */}
        <button
          onClick={() => {
            setSortByPrice((p) => !p);
            if (!sortByPrice) setSortByViews(false);
          }}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            sortByPrice
              ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
          }`}
        >
          💸😭 Broke
        </button>

        {/* WEDNESDAY FILTER */}
        {FFWednesday && (
          <button
            onClick={() => setWednesdayFilterOn((s) => !s)}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
              wednesdayFilterOn
                ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
                : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
            }`}
          >
            Wagon Wednesday
          </button>
        )}

        {/* THURSDAY FILTER */}
        {FFThursday && (
          <button
            onClick={() => setThursdayFilterOn((s) => !s)}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
              thursdayFilterOn
                ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
                : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
            }`}
          >
            🍷Thirsty Thursday
          </button>
        )}

        {/* TAGS DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => setShowTagsDropdown((prev) => !prev)}
            className="px-3 py-1.5 rounded-full border text-sm font-medium bg-white text-gray-800 border-gray-300 hover:bg-blue-100 flex items-center gap-1"
          >
            🏷️ Tags
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-4 h-4 transition-transform ${
                showTagsDropdown ? "rotate-180" : "rotate-0"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* TAGS LIST */}
          {showTagsDropdown && (
            <div className="absolute left-0 mt-2 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-10 p-2">
              {allTags.length === 0 ? (
                <p className="text-gray-500 text-sm px-2">No tags available</p>
              ) : (
                allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`block w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-blue-100"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {(selectedTags.length > 0 ||
          showPremiumOnly ||
          sortByViews ||
          sortByPrice ||
          wednesdayFilterOn ||
          thursdayFilterOn) && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-full border text-sm font-medium bg-blue-100 hover:bg-blue-200 text-blue-700 transition-all"
          >
            Clear Filters ✖️
          </button>
        )}
      </div>

      {/* VIDEO GRID */}
      {visibleVideos.length === 0 ? (
        <p className="text-center text-gray-600">
          No videos found matching current filters.
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleVideos.map((video, index) => (
            <div
              key={video._id}
              ref={(el) => (videoRefs.current[video._id] = el)}
              className="bg-white shadow-lg rounded-xl overflow-hidden transition cursor-pointer hover:shadow-[0_0_18px_rgba(59,130,246,0.4)] flex flex-col"
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
                      <span className="text-blue-600 text-sm font-semibold">
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
                    {VideoViews[video._id] ?? 0} views
                  </p>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {video.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* PRICE + DISCOUNTS */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    {video.socialMediaUrl ? (
                      <a
                        href={video.socialMediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {video.creatorName}
                      </a>
                    ) : (
                      <span className="text-blue-700 font-medium">
                        {video.creatorName}
                      </span>
                    )}

                    {video.creatorName.toLowerCase().includes("pudding") &&
                    FFThursday ? (
                      <span className="flex items-center gap-1">
                        <span className="line-through text-gray-400">
                          {video.price === 0 ? "" : `$${video.price}`}
                        </span>
                        <span className="text-blue-600 font-semibold">
                          ${(video.price * 0.75).toFixed(2)}
                        </span>
                      </span>
                    ) : video.tags?.includes("wagon") && FFWednesday ? (
                      <span className="flex items-center gap-1">
                        <span className="line-through text-gray-400">
                          {video.price === 0 ? "Free" : `$${video.price}`}
                        </span>
                        <span className="text-blue-600 font-semibold">
                          $13.34
                        </span>
                      </span>
                    ) : (
                      <span className="text-blue-700">
                        {video.price === 0 ? "Free" : `$${video.price}`}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openVideo(index)}
                  className="mt-3 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 w-full text-sm sm:text-base font-medium transition-all"
                >
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOAD MORE */}
      {visibleVideos.length < videosToRender.length ? (
        <div
          ref={loadMoreRef}
          className="flex justify-center items-center py-6 text-gray-500"
        >
          <svg
            className="animate-spin h-5 w-5 mr-2 text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          Loading more videos...
        </div>
      ) : (
        videosToRender.length > 0 && (
          <div className="text-center text-blue-400 py-6">
            You’ve reached the end 👿
          </div>
        )
      )}

      {/* MODAL */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md md:max-w-lg relative overflow-auto">
            <button
              onClick={closeModal}
              className="absolute top-2 right-3 text-blue-600 hover:text-blue-800 text-2xl"
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

              <div className="flex justify-between w-full px-2 text-sm text-gray-600 mb-2">
                {selectedVideo.socialMediaUrl ? (
                  <a
                    href={selectedVideo.socialMediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    {selectedVideo.creatorName}
                  </a>
                ) : (
                  <span className="font-medium text-blue-700">
                    {selectedVideo.creatorName}
                  </span>
                )}
                <span>{VideoViews[selectedVideo._id] ?? 0} views</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
