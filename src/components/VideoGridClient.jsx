"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VideoGridClient({ videos = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [sortByViews, setSortByViews] = useState(false);
  const [sortByPrice, setSortByPrice] = useState(false);
  const [showJonusOnly, setShowJonusOnly] = useState(false);
  const [VideoViews, setVideoViews] = useState({});
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [FFThursday, setFFThursday] = useState(false);
  const [thursdayFilterOn, setThursdayFilterOn] = useState(false);
  const [FFWednesday, setFFWednesday] = useState(false);
  const [wednesdayFilterOn, setWednesdayFilterOn] = useState(false);

  // 🔒 Jonus unlock state
  const [jonusUnlocked, setJonusUnlocked] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockTargetId, setUnlockTargetId] = useState(null);

  const videoRefs = useRef({});
  const loggedVideosRef = useRef(new Set());
  const loadMoreRef = useRef(null);

  const [visibleCount, setVisibleCount] = useState(12);

  // --- Helpers for aggressive video preload ------------------------------

  const preloadVideoLink = (url) => {
    if (typeof document === "undefined" || !url) return;
    if (document.querySelector(`link[as="video"][href="${url}"]`)) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = url;
    document.head.appendChild(link);
  };

  const aggressivePreload = async (url, maxMB = 8) => {
    if (typeof window === "undefined" || !url) return;

    window.__preloadingVideos = window.__preloadingVideos || {};
    if (window.__preloadingVideos[url]) return;
    window.__preloadingVideos[url] = true;

    try {
      const controller = new AbortController();
      const response = await fetch(url, { signal: controller.signal });
      const reader = response.body?.getReader();
      if (!reader) return;

      const maxBytes = maxMB * 1024 * 1024;
      let bytesFetched = 0;

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
      // ignore
    } finally {
      delete window.__preloadingVideos[url];
    }
  };

  // Load unlocks from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("jonusUnlocked") || "{}");
      setJonusUnlocked(saved);
    } catch {}
  }, []);

  // Save unlocks to localStorage
  useEffect(() => {
    localStorage.setItem("jonusUnlocked", JSON.stringify(jonusUnlocked));
  }, [jonusUnlocked]);

  // Set weekday flags
  useEffect(() => {
    const today = new Date().getDay();
    setFFWednesday(today === 3);
    setFFThursday(today === 4);
  }, []);

  // Format date helper
  const formatDate = (dateInput) => {
    if (!dateInput) return "";
    const date = dateInput.$date
      ? new Date(dateInput.$date)
      : new Date(dateInput);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days <= 7) return `${days} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // 25 Days of Jonus time logic
  const currentDay = new Date().getUTCDate();
  const isDecember = new Date().getUTCMonth() + 1 === 12;

  const filteredVideos = videos
    .filter((video) => {
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => video.tags?.includes(tag));

      const matchesPremium = !showPremiumOnly || video.premium;

      const matchesWednesday =
        !wednesdayFilterOn ||
        (video.type === "video" && video.tags?.includes("wagon"));

      const matchesThursday =
        !thursdayFilterOn ||
        (video.type === "video" &&
          video.creatorName?.toLowerCase().includes("pudding"));

      let matchesJonus = true;
      if (showJonusOnly) {
        if (!video.tags?.includes("25daysofjonus")) matchesJonus = false;
        else if (!video.createdAt) matchesJonus = false;
        else {
          const d = new Date(video.createdAt);
          const month = d.getUTCMonth() + 1;
          const day = d.getUTCDate();
          if (month !== 12 || day < 1 || day > 25) matchesJonus = false;
          else if (isDecember && day > currentDay) matchesJonus = false;
        }
      }

      return (
        matchesTags &&
        matchesPremium &&
        matchesWednesday &&
        matchesThursday &&
        matchesJonus
      );
    })
    .sort(
      (a, b) =>
        new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );

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

  const visibleVideos = videosToRender.slice(0, visibleCount);

  // Infinite scroll
  useEffect(() => {
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((p) => p + 12);
      },
      { rootMargin: "400px" }
    );
    if (loadMoreRef.current) ob.observe(loadMoreRef.current);
    return () => ob.disconnect();
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(12);
  }, [
    selectedTags,
    showPremiumOnly,
    sortByViews,
    sortByPrice,
    wednesdayFilterOn,
    thursdayFilterOn,
    showJonusOnly,
  ]);

  // Fetch views
  useEffect(() => {
    if (videos.length === 0) return;
    const fetchAll = async () => {
      try {
        const ids = videos.map((v) => v._id).join(",");
        const res = await fetch(`/api/video-views?videoIds=${ids}`);
        const data = await res.json();
        setVideoViews(data);
      } catch {}
    };
    fetchAll();
  }, [videos]);

  // Log video views (only once per session per video)
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
        body: JSON.stringify({ videoId, viewedAt: new Date().toISOString() }),
      });
    } catch {}
  };

  // Auto-open modal if ?video=<id> in URL
  useEffect(() => {
    const id = searchParams.get("video");
    if (!id) return;

    const idx = visibleVideos.findIndex((v) => v._id === id);
    if (idx === -1) return;

    const video = visibleVideos[idx];
    const isJonusLocked =
      video.tags?.includes("25daysofjonus") && !jonusUnlocked[video._id];

    if (isJonusLocked) {
      setUnlockTargetId(video._id);
      setShowPasswordModal(true);
      return;
    }

    setSelectedVideo(video);
    setSelectedVideoIndex(idx);
  }, [searchParams, visibleVideos, jonusUnlocked]);

  // Preload next/prev videos when modal open
  useEffect(() => {
    if (selectedVideoIndex === null) return;
    const next = visibleVideos[selectedVideoIndex + 1];
    const prev = visibleVideos[selectedVideoIndex - 1];

    if (next && next.type === "video") aggressivePreload(next.url, 6);
    if (prev && prev.type === "video") aggressivePreload(prev.url, 6);
  }, [selectedVideoIndex, visibleVideos]);

  // Unlock attempt
  const attemptUnlock = async () => {
    const res = await fetch("/api/validate-lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: unlockTargetId,
        password: passwordInput,
      }),
    });
    const data = await res.json();

    if (data.unlockedUrl) {
      setJonusUnlocked((prev) => ({ ...prev, [unlockTargetId]: true }));
      setShowPasswordModal(false);
      setPasswordInput("");
    } else {
      alert("Incorrect password");
    }
  };

  const openVideo = (index) => {
    const video = visibleVideos[index];
    const isJonusLocked =
      video.tags?.includes("25daysofjonus") && !jonusUnlocked[video._id];

    if (isJonusLocked) {
      setUnlockTargetId(video._id);
      setShowPasswordModal(true);
      return;
    }

    setSelectedVideo(video);
    setSelectedVideoIndex(index);
    router.push(`?video=${video._id}`, { shallow: true });

    if (video.type === "video") {
      preloadVideoLink(video.url);
      aggressivePreload(video.url, 16);
    }
  };

  const closeModal = () => {
    router.push("?", undefined, { shallow: true });
    setSelectedVideo(null);
    setSelectedVideoIndex(null);
  };

  const allTags = Array.from(new Set(videos.flatMap((v) => v.tags || [])));

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const togglePremium = () => setShowPremiumOnly((p) => !p);

  const clearFilters = () => {
    setSelectedTags([]);
    setShowPremiumOnly(false);
    setSortByPrice(false);
    setSortByViews(false);
    setWednesdayFilterOn(false);
    setThursdayFilterOn(false);
    setShowJonusOnly(false);
  };

  return (
    <div className="w-full">
      {/* FILTER BAR ======================================================= */}
      <div className="flex flex-wrap gap-3 mb-6 justify-center items-center">
        <span className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full shadow-sm">
          {videosToRender.length}{" "}
          {videosToRender.length === 1 ? "item" : "items"}
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

        {/* WEDNESDAY */}
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

        {/* THURSDAY */}
        {FFThursday && (
          <button
            onClick={() => setThursdayFilterOn((s) => !s)}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
              thursdayFilterOn
                ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
                : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
            }`}
          >
            🍷 Thirsty Thursday
          </button>
        )}

        {/* 25 DAYS OF JONUS */}
        <button
          onClick={() => setShowJonusOnly((s) => !s)}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showJonusOnly
              ? "bg-red-600 text-white border-red-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-red-100"
          }`}
        >
          🎄 25 Days of Jonus
        </button>

        {/* TAGS DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => setShowTagsDropdown((p) => !p)}
            className="px-3 py-1.5 rounded-full border text-sm font-medium bg-white text-gray-800 border-gray-300 hover:bg-blue-100 flex items-center gap-1"
          >
            🏷️ Tags
          </button>

          {showTagsDropdown && (
            <div className="absolute left-0 mt-2 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-10 p-2">
              {allTags.length === 0 ? (
                <p className="text-gray-500 text-sm px-2">No tags</p>
              ) : (
                allTags.map((tag) => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-all ${
                        selected
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
          thursdayFilterOn ||
          showJonusOnly) && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-full border text-sm font-medium bg-blue-100 hover:bg-blue-200 text-blue-700"
          >
            Clear Filters ✖️
          </button>
        )}
      </div>

      {/* GRID ============================================================ */}
      {visibleVideos.length === 0 ? (
        <p className="text-center text-gray-600">No items found.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleVideos.map((video, index) => {
            const isJonusLocked =
              video.tags?.includes("25daysofjonus") &&
              !jonusUnlocked[video._id];

            const thumbSrc =
              video.type === "image" ? video.url : video.thumbnail;

            return (
              <div
                key={video._id}
                ref={(el) => (videoRefs.current[video._id] = el)}
                className="bg-white shadow-lg rounded-xl overflow-hidden transition hover:shadow-[0_0_18px_rgba(59,130,246,0.4)] flex flex-col"
                onMouseEnter={() => {
                  if (video.type === "video") aggressivePreload(video.url, 8);
                }}
              >
                {/* THUMBNAIL */}
                <div className="relative w-full h-64 sm:h-72">
                  <img
                    src={thumbSrc}
                    alt={video.title}
                    className={`w-full h-full object-cover transition-all ${
                      isJonusLocked ? "blur-xl brightness-50" : ""
                    }`}
                  />

                  {isJonusLocked && (
                    <button
                      onClick={() => {
                        setUnlockTargetId(video._id);
                        setShowPasswordModal(true);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 text-white text-xl font-bold"
                    >
                      🔒 Unlock
                    </button>
                  )}
                </div>

                {/* CONTENT */}
                <div className="p-3 flex flex-col flex-1">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {video.title}
                      </h3>
                      {video.premium && (
                        <span className="text-blue-600 font-semibold">💎</span>
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

                    {/* PRICE + CREATOR (always visible even when locked) */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      {/* Creator Name (LINKED) */}
                      <a
                        href={video.socialMediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {video.creatorName}
                      </a>
                      {/* PRICE */}
                      {video.creatorName.toLowerCase().includes("pudding") &&
                      FFThursday &&
                      video.type === "video" ? (
                        <span className="flex items-center gap-1">
                          <span className="line-through text-gray-400">
                            ${video.price}
                          </span>
                          <span className="text-blue-600 font-semibold">
                            {(video.price * 0.75).toFixed(2)}
                          </span>
                        </span>
                      ) : video.tags?.includes("wagon") &&
                        FFWednesday &&
                        video.type === "video" ? (
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
                    className="mt-3 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Preview
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LOAD MORE */}
      {visibleVideos.length < videosToRender.length && (
        <div
          ref={loadMoreRef}
          className="flex justify-center items-center py-6"
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
          Loading more...
        </div>
      )}

      {/* MODAL ============================================================ */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md relative overflow-auto">
            <button
              onClick={closeModal}
              className="absolute top-2 right-3 text-blue-600 text-2xl hover:text-blue-800"
            >
              &times;
            </button>

            <div className="p-6 flex flex-col items-center">
              <h2 className="text-xl font-bold mb-3">{selectedVideo.title}</h2>

              {selectedVideo.type === "video" ? (
                <video
                  src={selectedVideo.url}
                  controls
                  autoPlay
                  className="w-full max-h-[300px] rounded mb-4 object-contain"
                  onPlay={() => logVideoViews(selectedVideo._id)}
                />
              ) : (
                <img
                  src={selectedVideo.url}
                  alt={selectedVideo.title}
                  className="w-full max-h-[300px] rounded mb-4 object-contain"
                />
              )}

              <p className="text-sm text-gray-700 mb-4 text-center">
                {selectedVideo.description}
              </p>

              <div className="flex justify-between w-full text-sm text-gray-600">
                <span className="font-medium text-blue-700">
                  {selectedVideo.creatorName}
                </span>
                <span>{VideoViews[selectedVideo._id] ?? 0} views</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL ==================================================== */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-center">
              Unlock Jonus Image
            </h2>

            <input
              type="string"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className="border p-2 rounded w-full mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={attemptUnlock}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
