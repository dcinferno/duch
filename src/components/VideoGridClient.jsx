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

  // ✅ Jonus lock state
  const [jonusUnlocked, setJonusUnlocked] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockTargetId, setUnlockTargetId] = useState(null);

  const loadMoreRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(12);

  // ---------------- PURCHASE STATE ----------------
  useEffect(() => {
    try {
      setPurchasedVideos(
        JSON.parse(localStorage.getItem("purchasedVideos") || "{}")
      );
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("purchasedVideos", JSON.stringify(purchasedVideos));
  }, [purchasedVideos]);

  // ---------------- JONUS UNLOCK STATE ----------------
  useEffect(() => {
    try {
      setJonusUnlocked(
        JSON.parse(localStorage.getItem("jonusUnlocked") || "{}")
      );
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("jonusUnlocked", JSON.stringify(jonusUnlocked));
  }, [jonusUnlocked]);

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
    if (sortByPrice)
      return [...filteredVideos].sort((a, b) => a.price - b.price);
    if (sortByViews)
      return [...filteredVideos].sort(
        (a, b) => (VideoViews[b._id] ?? 0) - (VideoViews[a._id] ?? 0)
      );
    return filteredVideos;
  })();

  const visibleVideos = videosToRender.slice(0, visibleCount);

  // ---------------- LOAD MORE ----------------
  useEffect(() => {
    const ob = new IntersectionObserver(
      (e) => e[0].isIntersecting && setVisibleCount((p) => p + 12),
      { rootMargin: "300px" }
    );
    if (loadMoreRef.current) ob.observe(loadMoreRef.current);
    return () => ob.disconnect();
  }, []);

  // ---------------- OPEN PREVIEW ----------------
  const openVideo = (video, index) => {
    if (video.tags?.includes("25daysofjonus") && !jonusUnlocked[video._id]) {
      setUnlockTargetId(video._id);
      setShowPasswordModal(true);
      return;
    }

    setSelectedVideo(video);
    setSelectedVideoIndex(index);
    router.push(`?video=${video._id}`, { shallow: true });
  };

  // ---------------- PLAY FULL ----------------
  const playFullVideo = async (video, index) => {
    if (video.tags?.includes("25daysofjonus") && !jonusUnlocked[video._id]) {
      setUnlockTargetId(video._id);
      setShowPasswordModal(true);
      return;
    }

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

  // ---------------- JONUS PASSWORD ----------------
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
      setJonusUnlocked((p) => ({ ...p, [unlockTargetId]: true }));
      setShowPasswordModal(false);
      setPasswordInput("");
    } else {
      alert("Incorrect password");
    }
  };

  // ---------------- RENDER ----------------
  return (
    <div className="w-full">
      {/* GRID */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {visibleVideos.map((video, index) => {
          const purchased = purchasedVideos[video._id];

          return (
            <div key={video._id} className="bg-white rounded-xl shadow">
              <img
                src={video.thumbnail || video.url}
                className="h-64 w-full object-cover"
              />

              <div className="p-3 flex flex-col">
                <h3 className="font-semibold">{video.title}</h3>

                {purchased && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full w-fit mt-1">
                    ✅ Purchased
                  </span>
                )}

                <div className="mt-3 flex gap-2">
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
                        onClick={() => openVideo(video, index)}
                        className="w-full bg-blue-600 text-white py-2 rounded"
                      >
                        Preview
                      </button>
                      {video.pay && video.price > 0 && (
                        <button className="w-full bg-purple-600 text-white py-2 rounded">
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

      {/* VIDEO MODAL (✅ smaller, scroll-safe) */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto relative p-4">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-2 right-3 text-2xl"
            >
              ×
            </button>

            <video
              src={selectedVideo.url}
              controls
              autoPlay
              className="w-full rounded mt-6 max-h-[60vh]"
            />
          </div>
        </div>
      )}

      {/* PASSWORD MODAL (unchanged but smaller) */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-white p-6 rounded w-full max-w-sm">
            <h2 className="font-bold text-lg mb-3 text-center">
              Unlock Jonus Video
            </h2>

            <input
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className="border w-full p-2 rounded mb-4"
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPasswordModal(false)}>
                Cancel
              </button>
              <button
                onClick={attemptUnlock}
                className="bg-blue-600 text-white px-4 py-2 rounded"
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
