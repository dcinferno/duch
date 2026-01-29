"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startCheckout } from "@/lib/startCheckout";

export default function VideoGridClient({
  videos = [],
  showCreatorPageLink = true,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ===============================
  // STATE / REFS
  // ===============================
  const openedFromUrlRef = useRef(false);
  const videoRefs = useRef({});
  const loggedVideosRef = useRef(new Set());
  const loadMoreRef = useRef(null);
  const scrollYRef = useRef(0);
  const [searchQuery, setSearchQuery] = useState("");
  const searchLogTimeoutRef = useRef(null);

  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loadingVideoId, setLoadingVideoId] = useState(null);

  const [purchasedVideos, setPurchasedVideos] = useState({});

  const [selectedTags, setSelectedTags] = useState([]);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [sortByViews, setSortByViews] = useState(false);
  const [sortByPrice, setSortByPrice] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const closedManuallyRef = useRef(false);
  const [VideoViews, setVideoViews] = useState({});

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockTargetId, setUnlockTargetId] = useState(null);
  const [showDiscountedOnly, setShowDiscountedOnly] = useState(false);
  const LATEST_VIDEO_TYPE =
    process.env.NEXT_PUBLIC_LATEST_VIDEO_TYPE?.toLowerCase() || null;

  // ===============================
  // HELPERS
  // ===============================

  function isDiscounted(video) {
    const base =
      typeof video.basePrice === "number"
        ? video.basePrice
        : Number(video.price) || 0;

    const final =
      typeof video.finalPrice === "number" ? video.finalPrice : base;

    return final < base;
  }

  function getDisplayPrice(video) {
    const price =
      video.displayPrice ??
      video.finalPrice ?? // legacy compatibility
      video.basePrice ??
      video.price ??
      0;

    return Number(price);
  }
  const isPurchased = (videoId) => !!purchasedVideos[videoId]?.token;

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
      // 🔍 SEARCH FILTER
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (q && q === LATEST_VIDEO_TYPE) {
          return true;
        }

        const matches =
          video.title?.toLowerCase().includes(q) ||
          video.creatorName?.toLowerCase().includes(q) ||
          video.description?.toLowerCase().includes(q) ||
          video.tags?.some((t) => t.toLowerCase().includes(q));

        if (!matches) return false;
      }

      // 🏷️ TAG FILTER
      if (
        selectedTags.length &&
        !selectedTags.every((t) => video.tags?.includes(t))
      )
        return false;

      if (showPremiumOnly && !video.premium) return false;
      if (showPaidOnly && !video.fullKey) return false;
      if (showDiscountedOnly && !isDiscounted(video)) return false;

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt),
    );

  const videosToRender = (() => {
    if (sortByPrice) {
      return [...filteredVideos].sort(
        (a, b) => getDisplayPrice(a) - getDisplayPrice(b),
      );
    }

    if (sortByViews) {
      return [...filteredVideos].sort(
        (a, b) => (VideoViews[b._id] ?? 0) - (VideoViews[a._id] ?? 0),
      );
    }
    return filteredVideos;
  })();

  const visibleVideos = videosToRender.slice(0, visibleCount);

  // ===============================
  // OPEN VIDEO
  // ===============================
  const openVideo = async (index) => {
    scrollYRef.current = window.scrollY;
    const video = visibleVideos[index];
    if (!video) return;

    if (selectedVideo?._id === video._id) return;

    let urlToPlay = video.url;

    if (isPurchased(video._id)) {
      try {
        setLoadingVideoId(video._id);
        const purchase = purchasedVideos[video._id];

        if (!purchase?.token) {
          alert("Missing access token");
          return;
        }

        const res = await fetch("/api/download-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: purchase.token, // 🔑 ONLY THIS
          }),
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
    setVisibleCount(12);
  }, [searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;

    // debounce
    clearTimeout(searchLogTimeoutRef.current);

    searchLogTimeoutRef.current = setTimeout(() => {
      fetch("/api/log-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          resultsCount: videosToRender.length,
          filters: {
            premium: showPremiumOnly,
            paid: showPaidOnly,
            discounted: showDiscountedOnly,
            tags: selectedTags,
          },
          source: "VideoGridClient",
        }),
      }).catch(() => {});
    }, 600);

    return () => clearTimeout(searchLogTimeoutRef.current);
  }, [
    searchQuery,
    videosToRender.length,
    showPremiumOnly,
    showPaidOnly,
    showDiscountedOnly,
    selectedTags,
  ]);

  useEffect(() => {
    if (!videos.length) return;

    const controller = new AbortController();

    const fetchViews = async () => {
      try {
        const ids = videos.map((v) => v._id).join(",");
        const res = await fetch(`/api/video-views?videoIds=${ids}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Failed to fetch views");

        const data = await res.json(); // { [videoId]: count }

        setVideoViews((prev) => ({
          ...data,
          ...prev, // preserve locally incremented views
        }));
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("❌ Failed to load video views", err);
        }
      }
    };

    fetchViews();

    return () => controller.abort();
  }, [videos]);

  useEffect(() => {
    if (!selectedVideo) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedVideo]);
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("purchasedVideos") || "{}");
    setPurchasedVideos(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("purchasedVideos", JSON.stringify(purchasedVideos));
  }, [purchasedVideos]);

  useEffect(() => {
    const id = searchParams.get("video");
    if (!id) return;

    if (closedManuallyRef.current) return;
    if (selectedVideo?._id === id) return;

    // 1️⃣ Try grid first
    const idx = visibleVideos.findIndex((v) => v._id === id);
    if (idx !== -1) {
      openVideo(idx);
      return;
    }

    // 2️⃣ Fallback: fetch single video (homepage deep-link)
    (async () => {
      try {
        const res = await fetch(`/api/videos?id=${id}`);
        if (!res.ok) throw new Error("Video fetch failed");

        const video = await res.json();
        if (!video?._id) return;

        openedFromUrlRef.current = true;

        // 🔥 open with full logic
        setSelectedVideoIndex(-1);
        openVideoFromObject(video); // see below
      } catch (err) {
        console.warn("Deep-link video load failed", err);
      }
    })();
  }, [searchParams, visibleVideos, selectedVideo]);

  useEffect(() => {
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((p) => p + 12);
      },
      { rootMargin: "400px" },
    );
    if (loadMoreRef.current) ob.observe(loadMoreRef.current);
    return () => ob.disconnect();
  }, []);
  // ===============================
  // MISSING HELPERS (FIXES CRASHES)
  // ===============================
  const openVideoFromObject = async (video) => {
    scrollYRef.current = window.scrollY;

    let urlToPlay = video.url;

    if (isPurchased(video._id)) {
      try {
        setLoadingVideoId(video._id);
        const purchase = purchasedVideos[video._id];

        if (!purchase?.token) return;

        const res = await fetch("/api/download-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: purchase.token }),
        });

        const data = await res.json();
        if (data?.url) {
          urlToPlay = data.url;
        }
      } catch {
        return;
      } finally {
        setLoadingVideoId(null);
      }
    }

    setSelectedVideo({ ...video, url: urlToPlay });
  };

  const togglePremium = () => setShowPremiumOnly((p) => !p);

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const clearFilters = () => {
    setSelectedTags([]);
    setShowPremiumOnly(false);
    setSortByViews(false);
    setSortByPrice(false);
    setShowDiscountedOnly(false);
  };

  const allTags = Array.from(new Set(videos.flatMap((v) => v.tags || [])));
  const canPay = (video) =>
    video.pay && !!video.fullKey && getDisplayPrice(video) > 0;

  const openVideoFromUrl = (video, index) => {
    setSelectedVideo(video);
    setSelectedVideoIndex(index);
  };

  const closeModal = () => {
    closedManuallyRef.current = true;
    openedFromUrlRef.current = false;

    router.push("?", { scroll: false });
    setSelectedVideo(null);
    setSelectedVideoIndex(null);
    requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollYRef.current,
        behavior: "instant", // or "auto"
      });
    });
  };

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

  return (
    <div className="w-full">
      {/* FILTER BAR ======================================================= */}
      {/* MOBILE SEARCH ROW */}
      <div className="w-full mb-4 sm:hidden">
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search…"
            className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="
        absolute right-2 top-1/2 -translate-y-1/2
        text-gray-500 hover:text-gray-800
        p-2 rounded-full
        hover:bg-gray-100
        transition
      "
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 justify-center items-center">
        <span className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full shadow-sm">
          {videosToRender.length}{" "}
          {videosToRender.length === 1 ? "item" : "items"}
        </span>
        {/* DESKTOP SEARCH */}
        <div className="relative hidden sm:flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search…"
            className="
      px-3 py-1.5 pr-8
      rounded-full
      border border-gray-300
      text-sm
      focus:outline-none focus:ring-2 focus:ring-blue-500
    "
          />

          {/* CLEAR (DESKTOP) */}
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className={`
      absolute right-2
      text-gray-400
      transition-all
      ${
        searchQuery
          ? "opacity-100 hover:text-red-500 hover:scale-110"
          : "opacity-0 pointer-events-none"
      }
    `}
            aria-label="Clear search"
          >
            ✕
          </button>
        </div>

        <button
          onClick={() => setShowDiscountedOnly((s) => !s)}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showDiscountedOnly
              ? "bg-red-600 text-white border-red-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-red-100"
          }`}
        >
          🤑 Deals
        </button>

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
          sortByPrice) && (
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
            const thumbSrc =
              video.type === "image" ? video.url : video.thumbnail;

            return (
              <div
                id={`video-${video._id}`}
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
                    className={`w-full h-full object-cover transition-all`}
                  />
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
                    <div className="flex items-center justify-between text-sm text-gray-600 min-w-0">
                      <div className="flex items-center gap-1">
                        {/* Creator Name (LINKED) */}
                        <a
                          href={video.socialMediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-700 hover:underline shrink-0"
                        >
                          {video.creatorName}
                        </a>
                        {/* Separator */}

                        {/* Internal Creator Page */}
                        {showCreatorPageLink && video.creatorUrlHandle && (
                          <>
                            <span className="mx-1 text-blue-600 shrink-0">
                              ·
                            </span>
                            <a
                              href={`/${video.creatorUrlHandle}`}
                              className="text-blue-600 hover:underline truncate whitespace-nowrap overflow-hidden"
                              title="View Creator Page"
                            >
                              View Page
                            </a>
                          </>
                        )}
                      </div>
                      {/* PRICE */}
                      <div className="flex items-center gap-2">
                        {video.finalPrice < video.basePrice ? (
                          <>
                            <span className="line-through text-gray-400">
                              $
                              {Number(
                                video.basePrice ?? video.price ?? 0,
                              ).toFixed(2)}
                            </span>

                            <span className="font-semibold text-gray-800">
                              ${getDisplayPrice(video).toFixed(2)}
                            </span>

                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              {video.discount?.percentOff
                                ? `${video.discount.percentOff}% OFF`
                                : "SALE"}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium text-gray-800">
                            {getDisplayPrice(video) === 0
                              ? "Free"
                              : `$${getDisplayPrice(video).toFixed(2)}`}
                          </span>
                        )}
                      </div>
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
                            onClick={() => startCheckout(video)}
                            className="w-full bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-700 text-sm font-medium"
                          >
                            Pay ${getDisplayPrice(video).toFixed(2)}
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
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
          onPointerDown={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-md relative overflow-auto"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-2 right-3 text-blue-600 text-2xl hover:text-blue-800"
            >
              &times;
            </button>

            <div className="p-6 flex flex-col items-center">
              <h2 className="text-xl font-bold mb-3 text-center">
                {selectedVideo.title}
              </h2>

              {/* 🎬 VIDEO ONLY */}
              <video
                key={selectedVideo.url} // 🔑 ensures reload when URL changes
                src={selectedVideo.url}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[300px] rounded mb-4 object-contain"
                onPlay={() => logVideoViews(selectedVideo._id)}
              />

              <p className="text-sm text-gray-700 mb-4 text-center">
                {selectedVideo.description}
              </p>

              <div className="flex justify-between w-full text-sm text-gray-600 mb-4">
                <span className="font-medium text-blue-700">
                  {selectedVideo.creatorName}
                </span>
                <span>{VideoViews[selectedVideo._id] ?? 0} views</span>
              </div>

              {/* 💜 PAY BUTTON */}
              {!isPurchased(selectedVideo._id) && selectedVideo.fullKey && (
                <button
                  onClick={() => startCheckout(selectedVideo)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg"
                >
                  Pay ${getDisplayPrice(selectedVideo).toFixed(2)}
                </button>
              )}

              {isPurchased(selectedVideo._id) && (
                <div className="w-full text-center text-sm text-green-600 font-medium">
                  ✔ Purchased
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
