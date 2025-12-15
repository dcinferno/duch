"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrCreateUserId } from "@/lib/getOrCreateUserId";

export default function VideoGridClient({ videos = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ===============================
  // STATE / REFS
  // ===============================
  const openedFromUrlRef = useRef(false);
  const videoRefs = useRef({});
  const loggedVideosRef = useRef(new Set());
  const loadMoreRef = useRef(null);

  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loadingVideoId, setLoadingVideoId] = useState(null);

  const [purchasedVideos, setPurchasedVideos] = useState({});
  const [jonusUnlocked, setJonusUnlocked] = useState({});

  const [selectedTags, setSelectedTags] = useState([]);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [sortByViews, setSortByViews] = useState(false);
  const [sortByPrice, setSortByPrice] = useState(false);
  const [showJonusOnly, setShowJonusOnly] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  const [VideoViews, setVideoViews] = useState({});

  const [FFWednesday, setFFWednesday] = useState(false);
  const [FFThursday, setFFThursday] = useState(false);
  const [wednesdayFilterOn, setWednesdayFilterOn] = useState(false);
  const [thursdayFilterOn, setThursdayFilterOn] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockTargetId, setUnlockTargetId] = useState(null);

  // ===============================
  // HELPERS
  // ===============================
  const isPurchased = (videoId) => !!purchasedVideos[videoId];

  const aggressivePreload = async (url, maxMB = 8) => {
    if (!url || typeof window === "undefined") return;

    window.__preloadingVideos = window.__preloadingVideos || {};
    if (window.__preloadingVideos[url]) return;
    window.__preloadingVideos[url] = true;

    try {
      const controller = new AbortController();
      const res = await fetch(url, { signal: controller.signal });
      const reader = res.body?.getReader();
      if (!reader) return;

      let bytes = 0;
      const limit = maxMB * 1024 * 1024;

      while (true) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        bytes += value.length;
        if (bytes > limit) {
          controller.abort();
          break;
        }
      }
    } catch {
    } finally {
      delete window.__preloadingVideos[url];
    }
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput.$date || dateInput);
    const diff = Date.now() - d;
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days <= 7) return `${days} days ago`;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ===============================
  // DERIVED DATA (ORDER MATTERS)
  // ===============================
  const filteredVideos = videos
    .filter((video) => {
      if (
        selectedTags.length &&
        !selectedTags.every((t) => video.tags?.includes(t))
      )
        return false;

      if (showPremiumOnly && !video.premium) return false;
      if (showPaidOnly && !(video.pay && video.fullKey)) return false;

      if (
        wednesdayFilterOn &&
        !(video.type === "video" && video.tags?.includes("wagon"))
      )
        return false;

      if (
        thursdayFilterOn &&
        !video.creatorName?.toLowerCase().includes("pudding")
      )
        return false;

      if (showJonusOnly && !video.tags?.includes("25daysofjonus")) return false;

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );

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

  // ===============================
  // OPEN VIDEO
  // ===============================
  const openVideo = async (index) => {
    const video = visibleVideos[index];
    if (!video) return;

    if (selectedVideo?._id === video._id) return;

    const isJonusLocked =
      video.tags?.includes("25daysofjonus") && !jonusUnlocked[video._id];

    if (isJonusLocked) {
      setUnlockTargetId(video._id);
      setShowPasswordModal(true);
      return;
    }

    let urlToPlay = video.url;

    if (isPurchased(video._id)) {
      try {
        setLoadingVideoId(video._id);
        const userId = getOrCreateUserId();

        const res = await fetch("/api/download-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, videoId: video._id }),
        });

        const data = await res.json();
        if (!data?.url) throw new Error("No URL returned");

        urlToPlay = data.url;
      } catch (e) {
        alert("Failed to load full video");
        return;
      } finally {
        setLoadingVideoId(null);
      }
    }

    setSelectedVideo({ ...video, url: urlToPlay });
    setSelectedVideoIndex(index);
    router.push(`?video=${video._id}`, { shallow: true });
  };

  // ===============================
  // EFFECTS
  // ===============================
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("purchasedVideos") || "{}");
    setPurchasedVideos(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("purchasedVideos", JSON.stringify(purchasedVideos));
  }, [purchasedVideos]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("jonusUnlocked") || "{}");
    setJonusUnlocked(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("jonusUnlocked", JSON.stringify(jonusUnlocked));
  }, [jonusUnlocked]);

  useEffect(() => {
    const day = new Date().getDay();
    setFFWednesday(day === 3);
    setFFThursday(day === 4);
  }, []);

  useEffect(() => {
    const id = searchParams.get("video");
    if (!id) {
      openedFromUrlRef.current = false;
      return;
    }
    if (openedFromUrlRef.current) return;

    const idx = visibleVideos.findIndex((v) => v._id === id);
    if (idx === -1) return;

    openedFromUrlRef.current = true;
    openVideo(idx);
  }, [searchParams, visibleVideos]);

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
        <button
          onClick={() => setShowPaidOnly((p) => !p)}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showPaidOnly
              ? "bg-purple-600 text-white border-purple-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-purple-100"
          }`}
        >
          💰💵 Paid Only
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
            <div className="absolute left-0 mt-2 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2">
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
                  if (video.type === "video" && !isPurchased(video._id)) {
                    aggressivePreload(video.url, 8);
                  }
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

                  {/* ACTION BUTTONS: always show Preview, optionally show Pay */}
                  {/* ACTION BUTTONS: Preview + (optional) Pay */}
                  <div className="mt-3 flex flex-col gap-2 w-full">
                    {isPurchased(video._id) ? (
                      // ✅ WATCH FULL VIDEO
                      <button
                        onClick={() => openVideo(index)}
                        disabled={loadingVideoId === video._id}
                        className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${
                          loadingVideoId === video._id
                            ? "bg-green-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {loadingVideoId === video._id ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4 text-white"
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
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v8H4z"
                              />
                            </svg>
                            Loading…
                          </>
                        ) : (
                          "▶ Watch Full Video"
                        )}
                      </button>
                    ) : (
                      <>
                        {/* PREVIEW */}
                        <button
                          onClick={() => openVideo(index)}
                          className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Preview
                        </button>

                        {/* PAY */}

                        {canPay(video) && (
                          <button
                            onClick={async () => {
                              const userId = getOrCreateUserId();
                              localStorage.setItem("userId", userId);

                              const payload = {
                                userId,
                                videoId: video._id,
                                creatorName: video.creatorName,
                                creatorTelegramId:
                                  video.creatorTelegramId || "", // REQUIRED for tagging
                                creatorUrl: video.socialMediaUrl || "", // fallback link
                                site: "A",
                              };

                              const url = getCheckOutUrl();
                              const res = await fetch(`${url}/api/checkout`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(payload),
                              });

                              const data = await res.json();
                              if (data.url) window.location.href = data.url;
                            }}
                            className="w-full bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-700 text-sm font-medium"
                          >
                            Pay ${getDisplayPrice(video)}
                          </button>
                        )}
                      </>
                    )}
                  </div>
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
