"use client";

import {
  useState,
  useReducer,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { startCheckout } from "@/lib/startCheckout";
import { filterReducer, initialFilterState } from "@/lib/filterReducer";

export default function VideoGridClient({
  videos = [],
  showCreatorPageLink = true,
  title,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ===============================
  // STATE / REFS
  // ===============================
  const openedFromUrlRef = useRef(false);
  const videoRefs = useRef({});
  const loggedVideosRef = useRef(new Set());
  const scrollYRef = useRef(0);
  const searchLogTimeoutRef = useRef(null);
  const gridContainerRef = useRef(null);

  const [columnCount, setColumnCount] = useState(1);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loadingVideoId, setLoadingVideoId] = useState(null);

  const [purchasedVideos, setPurchasedVideos] = useState({});

  // Filter state managed by reducer
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);
  const {
    searchQuery,
    selectedTags,
    showPremiumOnly,
    showPaidOnly,
    showDiscountedOnly,
    showPurchasedOnly,
    sortByViews,
    sortByPrice,
    sortByDurationShort,
    sortByDurationLong,
    showTagsDropdown,
    showShadowGames,
  } = filterState;

  // Initialize filters from URL params on mount
  const initializedFromUrl = useRef(false);
  useEffect(() => {
    if (initializedFromUrl.current) return;
    initializedFromUrl.current = true;

    const paid = searchParams.get("paid") === "true";
    const shadow = searchParams.get("shadowgames") === "true";
    const discounted = searchParams.get("discounted") === "true";
    const purchased = searchParams.get("purchased") === "true";

    if (paid || shadow || discounted || purchased) {
      dispatch({
        type: "SET_FROM_URL",
        payload: {
          showPaidOnly: paid,
          showShadowGames: shadow,
          showDiscountedOnly: discounted,
          showPurchasedOnly: purchased,
        },
      });
    }
  }, [searchParams]);

  // Sync filter changes to URL
  const prevFiltersRef = useRef({ showPaidOnly, showShadowGames, showDiscountedOnly, showPurchasedOnly });
  useEffect(() => {
    if (!initializedFromUrl.current) return;

    // Skip if filters haven't actually changed (prevents unnecessary navigation on mount)
    const prev = prevFiltersRef.current;
    if (
      prev.showPaidOnly === showPaidOnly &&
      prev.showShadowGames === showShadowGames &&
      prev.showDiscountedOnly === showDiscountedOnly &&
      prev.showPurchasedOnly === showPurchasedOnly
    ) {
      return;
    }
    prevFiltersRef.current = { showPaidOnly, showShadowGames, showDiscountedOnly, showPurchasedOnly };

    const params = new URLSearchParams(window.location.search);

    // Update or remove each filter param
    if (showPaidOnly) params.set("paid", "true");
    else params.delete("paid");

    if (showShadowGames) params.set("shadowgames", "true");
    else params.delete("shadowgames");

    if (showDiscountedOnly) params.set("discounted", "true");
    else params.delete("discounted");

    if (showPurchasedOnly) params.set("purchased", "true");
    else params.delete("purchased");

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPaidOnly, showShadowGames, showDiscountedOnly, showPurchasedOnly, router]);

  const closedManuallyRef = useRef(false);
  const [VideoViews, setVideoViews] = useState({});

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockTargetId, setUnlockTargetId] = useState(null);
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

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ===============================
  // DERIVED DATA (ORDER MATTERS)
  // ===============================
  const filteredVideos = useMemo(
    () =>
      videos
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
          if (showPurchasedOnly && !purchasedVideos[video._id]?.token)
            return false;
          if (
            showShadowGames &&
            !video.tags?.some(
              (t) =>
                t.toLowerCase() === "shadow games" ||
                t.toLowerCase() === "shadowgames",
            )
          )
            return false;
          return true;
        })
        .sort(
          (a, b) =>
            new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt),
        ),
    [
      videos,
      searchQuery,
      selectedTags,
      showPremiumOnly,
      showPaidOnly,
      showDiscountedOnly,
      showPurchasedOnly,
      purchasedVideos,
      showShadowGames,
    ],
  );

  const videosToRender = useMemo(() => {
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

    if (sortByDurationShort) {
      return [...filteredVideos].sort(
        (a, b) => (a.duration ?? Infinity) - (b.duration ?? Infinity),
      );
    }

    if (sortByDurationLong) {
      return [...filteredVideos].sort(
        (a, b) => (b.duration ?? 0) - (a.duration ?? 0),
      );
    }

    return filteredVideos;
  }, [
    filteredVideos,
    sortByPrice,
    sortByViews,
    sortByDurationShort,
    sortByDurationLong,
    VideoViews,
  ]);

  // Group videos into rows for virtualization
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < videosToRender.length; i += columnCount) {
      result.push(videosToRender.slice(i, i + columnCount));
    }
    return result;
  }, [videosToRender, columnCount]);

  // Virtualizer for rows with dynamic measurement
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => gridContainerRef.current,
    estimateSize: () => 620, // Initial estimate, will be refined by measurement
    overscan: 3, // Render 3 extra rows above/below viewport
    measureElement: (element) => {
      // Measure actual height including margin/gap
      return element.getBoundingClientRect().height + 16;
    },
  });

  // ===============================
  // OPEN VIDEO
  // ===============================
  const openVideo = async (index) => {
    scrollYRef.current = gridContainerRef.current?.scrollTop || 0;
    const video = videosToRender[index];
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
  // Track container width for responsive columns
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1280)
        setColumnCount(4); // xl
      else if (width >= 1024)
        setColumnCount(3); // lg
      else if (width >= 640)
        setColumnCount(2); // sm
      else setColumnCount(1); // mobile
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

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
    const idx = videosToRender.findIndex((v) => v._id === id);
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
  }, [searchParams, videosToRender, selectedVideo]);
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

  const togglePremium = () => dispatch({ type: "TOGGLE_PREMIUM" });
  const toggleTag = (tag) => dispatch({ type: "TOGGLE_TAG", payload: tag });
  const clearFilters = () => dispatch({ type: "CLEAR_ALL" });

  const allTags = useMemo(
    () => Array.from(new Set(videos.flatMap((v) => v.tags || []))),
    [videos],
  );
  const canPay = (video) =>
    video.pay && !!video.fullKey && getDisplayPrice(video) > 0;

  const [copiedVideoId, setCopiedVideoId] = useState(null);

  const shareVideo = async (videoId, e) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?video=${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedVideoId(videoId);
      setTimeout(() => setCopiedVideoId(null), 2000);
    } catch {
      // Fallback for older browsers
      prompt("Copy this link:", url);
    }
  };

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
      if (gridContainerRef.current) {
        gridContainerRef.current.scrollTop = scrollYRef.current;
      }
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
    <div className="w-full h-full flex flex-col">
      <div
        ref={gridContainerRef}
        className="flex-1 min-h-0 overflow-auto"
      >
      {title && <h1 className="text-2xl font-bold mb-4">{title}</h1>}
      {/* FILTER BAR ======================================================= */}
      {/* MOBILE SEARCH ROW */}
      <div className="w-full mb-4 sm:hidden">
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) =>
              dispatch({ type: "SET_SEARCH", payload: e.target.value })
            }
            placeholder="Search…"
            className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_SEARCH", payload: "" })}
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
            onChange={(e) =>
              dispatch({ type: "SET_SEARCH", payload: e.target.value })
            }
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
            onClick={() => dispatch({ type: "SET_SEARCH", payload: "" })}
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
          onClick={() => dispatch({ type: "TOGGLE_DISCOUNTED" })}
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
          onClick={() => dispatch({ type: "TOGGLE_PAID" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showPaidOnly
              ? "bg-purple-600 text-white border-purple-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-purple-100"
          }`}
        >
          💰💵 Paid Only
        </button>

        {/* PURCHASED */}
        <button
          onClick={() => dispatch({ type: "TOGGLE_PURCHASED" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showPurchasedOnly
              ? "bg-green-600 text-white border-green-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-green-100"
          }`}
        >
          ✅ Purchased
        </button>

        {/* MOST VIEWED */}
        <button
          onClick={() => dispatch({ type: "TOGGLE_SORT_VIEWS" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            sortByViews
              ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
          }`}
        >
          🔥 Most Viewed
        </button>

        {/* SHOW BROKE */}
        <button
          onClick={() => dispatch({ type: "TOGGLE_SHADOW_GAMES" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showShadowGames
              ? "bg-black text-white border-black shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-200"
          }`}
        >
          😈 Shadow Games
        </button>

        {/* SHORT DURATION */}
        <button
          onClick={() => dispatch({ type: "TOGGLE_SORT_DURATION_SHORT" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            sortByDurationShort
              ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
          }`}
        >
          ⚡ Short
        </button>

        {/* LONG DURATION */}
        <button
          onClick={() => dispatch({ type: "TOGGLE_SORT_DURATION_LONG" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            sortByDurationLong
              ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
              : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
          }`}
        >
          🎬 Long
        </button>

        {/* TAGS DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => dispatch({ type: "TOGGLE_TAGS_DROPDOWN" })}
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
          showPurchasedOnly ||
          sortByViews ||
          sortByPrice ||
          sortByDurationShort ||
          sortByDurationLong) && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-full border text-sm font-medium bg-blue-100 hover:bg-blue-200 text-blue-700"
          >
            Clear Filters ✖️
          </button>
        )}
      </div>

      {/* GRID ============================================================ */}
      {videosToRender.length === 0 ? (
        <p className="text-center text-gray-600">No items found.</p>
      ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const rowVideos = rows[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-1 pb-4">
                    {rowVideos.map((video) => {
                      const globalIndex = videosToRender.findIndex(
                        (v) => v._id === video._id,
                      );
                      const thumbSrc =
                        video.type === "image" ? video.url : video.thumbnail;

                      return (
                        <div
                          id={`video-${video._id}`}
                          key={video._id}
                          ref={(el) => (videoRefs.current[video._id] = el)}
                          className="bg-white shadow-lg rounded-xl overflow-hidden transition hover:shadow-[0_0_18px_rgba(59,130,246,0.4)] flex flex-col"
                          onMouseEnter={() => {
                            if (
                              video.type === "video" &&
                              !isPurchased(video._id)
                            ) {
                              aggressivePreload(video.url, 8);
                            }
                          }}
                        >
                          {/* THUMBNAIL */}
                          <div className="relative w-full h-64 sm:h-72">
                            <img
                              src={thumbSrc}
                              alt={video.title}
                              className="w-full h-full object-cover transition-all"
                              loading="lazy"
                            />
                            {video.type === "video" && video.duration && (
                              <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
                                {formatDuration(video.duration)}
                              </span>
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
                                  <span className="text-blue-600 font-semibold">
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

                              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                <span>{VideoViews[video._id] ?? 0} views</span>
                                <button
                                  onClick={(e) => shareVideo(video._id, e)}
                                  className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                                  title="Copy link"
                                >
                                  {copiedVideoId === video._id ? (
                                    <span className="text-green-600">
                                      ✓ Copied
                                    </span>
                                  ) : (
                                    <>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                        />
                                      </svg>
                                      Share
                                    </>
                                  )}
                                </button>
                              </div>

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

                              {/* PRICE + CREATOR */}
                              <div className="flex items-center justify-between text-sm text-gray-600 min-w-0">
                                <div className="flex items-center gap-1">
                                  <a
                                    href={video.socialMediaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-blue-700 hover:underline shrink-0"
                                  >
                                    {video.creatorName}
                                  </a>
                                  {showCreatorPageLink &&
                                    video.creatorUrlHandle && (
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

                            {/* ACTION BUTTONS */}
                            <div className="mt-3 flex flex-col gap-2 w-full">
                              {isPurchased(video._id) ? (
                                <button
                                  onClick={() => openVideo(globalIndex)}
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
                                  <button
                                    onClick={() => openVideo(globalIndex)}
                                    className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 text-sm font-medium"
                                  >
                                    Preview
                                  </button>
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
                </div>
              );
            })}
          </div>
      )}
      </div>

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

              <div className="flex justify-between items-center w-full text-sm text-gray-600 mb-4">
                <span className="font-medium text-blue-700">
                  {selectedVideo.creatorName}
                </span>
                <div className="flex items-center gap-3">
                  <span>{VideoViews[selectedVideo._id] ?? 0} views</span>
                  <button
                    onClick={(e) => shareVideo(selectedVideo._id, e)}
                    className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                    title="Copy link"
                  >
                    {copiedVideoId === selectedVideo._id ? (
                      <span className="text-green-600 text-xs">✓ Copied</span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
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
