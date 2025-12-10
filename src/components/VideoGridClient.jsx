"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrCreateUserId } from "@/lib/getOrCreateUserId";

export default function VideoGridClient({ videos = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ---------------- STATE ----------------
  const [purchasedVideos, setPurchasedVideos] = useState({});
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const [selectedTags, setSelectedTags] = useState([]);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [sortByViews, setSortByViews] = useState(false);
  const [sortByPrice, setSortByPrice] = useState(false);
  const [showJonusOnly, setShowJonusOnly] = useState(false);

  const [VideoViews, setVideoViews] = useState({});
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  const [FFWednesday, setFFWednesday] = useState(false);
  const [FFThursday, setFFThursday] = useState(false);
  const [wednesdayFilterOn, setWednesdayFilterOn] = useState(false);
  const [thursdayFilterOn, setThursdayFilterOn] = useState(false);

  const [jonusUnlocked, setJonusUnlocked] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockTargetId, setUnlockTargetId] = useState(null);

  const videoRefs = useRef({});
  const loggedVideosRef = useRef(new Set());
  const loadMoreRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(12);

  // ---------------- PURCHASE STATE ----------------
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("purchasedVideos") || "{}");
      setPurchasedVideos(saved);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("purchasedVideos", JSON.stringify(purchasedVideos));
  }, [purchasedVideos]);

  // ---------------- WEEKDAY FLAGS ----------------
  useEffect(() => {
    const d = new Date().getDay();
    setFFWednesday(d === 3);
    setFFThursday(d === 4);
  }, []);

  // ---------------- FILTERING ----------------
  const currentDay = new Date().getUTCDate();
  const isDecember = new Date().getUTCMonth() + 1 === 12;

  const filteredVideos = videos.filter((video) => {
    if (showPremiumOnly && !video.premium) return false;

    if (wednesdayFilterOn && !video.tags?.includes("wagon")) return false;

    if (
      thursdayFilterOn &&
      !video.creatorName?.toLowerCase().includes("pudding")
    )
      return false;

    if (showJonusOnly) {
      if (!video.tags?.includes("25daysofjonus")) return false;
      const d = new Date(video.createdAt || video.date);
      const day = d.getUTCDate();
      const month = d.getUTCMonth() + 1;
      if (month !== 12 || day < 1 || day > 25) return false;
      if (isDecember && day > currentDay) return false;
    }

    if (
      selectedTags.length &&
      !selectedTags.every((t) => video.tags?.includes(t))
    )
      return false;

    return true;
  });

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

  // ---------------- LOAD MORE ----------------
  useEffect(() => {
    const ob = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && setVisibleCount((p) => p + 12),
      { rootMargin: "400px" }
    );
    if (loadMoreRef.current) ob.observe(loadMoreRef.current);
    return () => ob.disconnect();
  }, []);

  useEffect(
    () => setVisibleCount(12),
    [
      selectedTags,
      showPremiumOnly,
      sortByViews,
      sortByPrice,
      wednesdayFilterOn,
      thursdayFilterOn,
      showJonusOnly,
    ]
  );

  // ---------------- OPEN PREVIEW ----------------
  const openVideo = (index) => {
    const video = visibleVideos[index];
    setSelectedVideo(video);
    setSelectedVideoIndex(index);
    router.push(`?video=${video._id}`, { shallow: true });
  };

  // ---------------- PLAY FULL ----------------
  const playFullVideo = async (video, index) => {
    const userId = getOrCreateUserId();

    const res = await fetch("/api/unlock-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, videoId: video._id }),
    });

    if (!res.ok) return alert("Unable to unlock video.");
    const data = await res.json();
    if (!data.url) return alert("No full video available.");

    setSelectedVideo({ ...video, url: data.url });
    setSelectedVideoIndex(index);
    router.push(`?video=${video._id}`, { shallow: true });
  };

  // ---------------- RENDER ----------------
  return (
    <div className="w-full">
      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-3 mb-6 justify-center">
        <button onClick={() => setShowPremiumOnly((p) => !p)}>
          💎 Featured
        </button>
        <button onClick={() => setSortByViews((p) => !p)}>🔥 Views</button>
        <button onClick={() => setSortByPrice((p) => !p)}>💸 Broke</button>
        {FFWednesday && (
          <button onClick={() => setWednesdayFilterOn((p) => !p)}>
            Wagon Wednesday
          </button>
        )}
        {FFThursday && (
          <button onClick={() => setThursdayFilterOn((p) => !p)}>
            🍷 Thirsty Thursday
          </button>
        )}
        <button onClick={() => setShowJonusOnly((p) => !p)}>
          🎄 25 Days of Jonus
        </button>
      </div>

      {/* GRID */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {visibleVideos.map((video, index) => {
          const purchased = purchasedVideos[video._id];

          return (
            <div
              key={video._id}
              className="bg-white rounded-xl shadow flex flex-col"
            >
              <img
                src={video.thumbnail || video.url}
                className="h-64 w-full object-cover"
              />

              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-semibold mb-1">{video.title}</h3>

                <div className="flex gap-2 mb-2">
                  {purchased && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      ✅ Purchased
                    </span>
                  )}
                </div>

                <div className="mt-auto flex gap-2">
                  {purchased ? (
                    <button
                      onClick={() => playFullVideo(video, index)}
                      className="w-full bg-green-600 text-white py-2 rounded"
                    >
                      ▶ Play Full Video
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => openVideo(index)}
                        className="w-full bg-blue-600 text-white py-2 rounded"
                      >
                        Preview
                      </button>
                      {video.pay && video.price > 0 && (
                        <button
                          onClick={async () => {
                            const userId = getOrCreateUserId();
                            localStorage.setItem("userId", userId);

                            const res = await fetch(
                              `${process.env.NEXT_PUBLIC_SERVER_URL}/api/checkout`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  userId,
                                  videoId: video._id,
                                  amount: video.price,
                                  site: "A",
                                }),
                              }
                            );

                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                          }}
                          className="w-full bg-purple-600 text-white py-2 rounded"
                        >
                          Pay ${video.price}
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

      <div ref={loadMoreRef} className="h-10" />

      {/* MODAL */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-white p-4 rounded max-w-lg w-full">
            <button onClick={() => setSelectedVideo(null)}>×</button>
            <video
              src={selectedVideo.url}
              controls
              autoPlay
              className="w-full mt-4"
            />
          </div>
        </div>
      )}
    </div>
  );
}
