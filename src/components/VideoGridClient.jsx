"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrCreateUserId } from "@/lib/getOrCreateUserId";

export default function VideoGridClient({ videos = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------
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

  // 🔒 Jonus locking
  const [jonusUnlocked, setJonusUnlocked] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockTargetId, setUnlockTargetId] = useState(null);

  const videoRefs = useRef({});
  const loadMoreRef = useRef(null);
  const loggedVideosRef = useRef(new Set());

  const [visibleCount, setVisibleCount] = useState(12);

  // --------------------------------------------------
  // PURCHASE PERSISTENCE
  // --------------------------------------------------
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

  // --------------------------------------------------
  // JONUS PERSISTENCE
  // --------------------------------------------------
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

  // --------------------------------------------------
  // DAY FLAGS
  // --------------------------------------------------
  useEffect(() => {
    const d = new Date().getDay();
    setFFWednesday(d === 3);
    setFFThursday(d === 4);
  }, []);

  // --------------------------------------------------
  // FILTERING LOGIC (unchanged behavior)
  // --------------------------------------------------
  const currentDay = new Date().getUTCDate();
  const isDecember = new Date().getUTCMonth() + 1 === 12;

  const filteredVideos = videos
    .filter((video) => {
      if (
        selectedTags.length &&
        !selectedTags.every((t) => video.tags?.includes(t))
      )
        return false;

      if (showPremiumOnly && !video.premium) return false;

      if (wednesdayFilterOn && !video.tags?.includes("wagon")) return false;

      if (
        thursdayFilterOn &&
        !video.creatorName?.toLowerCase().includes("pudding")
      )
        return false;

      if (showJonusOnly) {
        if (!video.tags?.includes("25daysofjonus")) return false;
        const d = new Date(video.createdAt);
        const m = d.getUTCMonth() + 1;
        const day = d.getUTCDate();
        if (m !== 12 || day < 1 || day > 25) return false;
        if (isDecember && day > currentDay) return false;
      }

      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const videosToRender = (() => {
    if (sortByPrice) {
      return [...filteredVideos].sort((a, b) =>
        a.price !== b.price
          ? a.price - b.price
          : (VideoViews[b._id] ?? 0) - (VideoViews[a._id] ?? 0)
      );
    }
    if (sortByViews) {
      return [...filteredVideos].sort(
        (a, b) => (VideoViews[b._id] ?? 0) - (VideoViews[a._id] ?? 0)
      );
    }
    return filteredVideos;
  })();

  const visibleVideos = videosToRender.slice(0, visibleCount);

  // --------------------------------------------------
  // DEEP LINK RESTORE (searchParams)
  // --------------------------------------------------
  useEffect(() => {
    const id = searchParams.get("video");
    if (!id) return;

    const idx = visibleVideos.findIndex((v) => v._id === id);
    if (idx === -1) return;

    const video = visibleVideos[idx];

    if (video.tags?.includes("25daysofjonus") && !jonusUnlocked[video._id]) {
      setUnlockTargetId(video._id);
      setShowPasswordModal(true);
      return;
    }

    setSelectedVideo(video);
    setSelectedVideoIndex(idx);
  }, [searchParams, visibleVideos, jonusUnlocked]);

  // --------------------------------------------------
  // OPEN / CLOSE
  // --------------------------------------------------
  const openVideo = (index) => {
    const video = visibleVideos[index];

    if (video.tags?.includes("25daysofjonus") && !jonusUnlocked[video._id]) {
      setUnlockTargetId(video._id);
      setShowPasswordModal(true);
      return;
    }

    setSelectedVideo(video);
    setSelectedVideoIndex(index);
    router.push(`?video=${video._id}`, { shallow: true });
  };

  const closeModal = () => {
    router.push("?", { shallow: true });
    setSelectedVideo(null);
    setSelectedVideoIndex(null);
  };

  // --------------------------------------------------
  // JONUS UNLOCK
  // --------------------------------------------------
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

  // --------------------------------------------------
  // UNLOCK / PLAY FULL VIDEO
  // --------------------------------------------------
  const playFullVideo = async (video, index) => {
    const userId = getOrCreateUserId();

    const res = await fetch("/api/unlock-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, videoId: video._id }),
    });

    if (!res.ok) return alert("Unlock failed");

    const data = await res.json();
    if (!data.url) return alert("No full video");

    setSelectedVideo({ ...video, url: data.url });
    setSelectedVideoIndex(index);
    router.push(`?video=${video._id}`, { shallow: true });
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleVideos.map((video, index) => {
          const purchased = purchasedVideos[video._id];

          return (
            <div
              key={video._id}
              className="bg-white rounded-xl shadow relative"
            >
              {purchased && (
                <span className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full z-10">
                  ✅ Purchased
                </span>
              )}

              <img
                src={video.thumbnail || video.url}
                className="h-64 w-full object-cover"
                alt={video.title}
              />

              <div className="p-3 flex flex-col gap-2">
                <h3 className="font-semibold">{video.title}</h3>

                <div className="flex gap-2">
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

                            const payload = {
                              userId,
                              videoId: video._id,
                              amount: video.price,
                              site: "A",
                            };

                            const res = await fetch(
                              `${process.env.NEXT_PUBLIC_SERVER_URL}/api/checkout`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify(payload),
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

      {/* VIDEO MODAL */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full">
            <button
              onClick={closeModal}
              className="float-right text-xl font-bold"
            >
              ×
            </button>
            <video
              src={selectedVideo.url}
              controls
              autoPlay
              className="w-full mt-3 rounded"
            />
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-4 rounded max-w-sm w-full">
            <h2 className="font-bold mb-3">Unlock Video</h2>
            <input
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="border rounded p-2 w-full mb-3"
              placeholder="Enter password"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-3 py-2 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={attemptUnlock}
                className="px-3 py-2 bg-blue-600 text-white rounded"
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
