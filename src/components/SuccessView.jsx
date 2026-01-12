"use client";

import { useEffect, useState } from "react";

export default function SuccessView({ urlHandle, router }) {
  const [videos, setVideos] = useState([]);
  const [downloadUrls, setDownloadUrls] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const VIP_TELEGRAM_INVITE = process.env.NEXT_PUBLIC_VIP_TELEGRAM_INVITE;

  // ------------------------------------------
  // 1️⃣ Read access token from URL
  // ------------------------------------------
  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      : null;

  // ------------------------------------------
  // 2️⃣ Exchange token for video access
  // ------------------------------------------
  useEffect(() => {
    if (!token) {
      setError("Missing access token.");
      setLoading(false);
      return;
    }

    async function loadAccess() {
      try {
        const res = await fetch("/api/download-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Access denied.");
        }

        const data = await res.json();
        if (!data.url || !data.videoId) {
          throw new Error("Invalid access response.");
        }
        const purchased =
          JSON.parse(localStorage.getItem("purchasedVideos")) || {};

        purchased[data.videoId] = {
          token, // 🔑 THIS IS WHAT VideoGrid NEEDS
        };

        localStorage.setItem("purchasedVideos", JSON.stringify(purchased));

        setDownloadUrls({ [data.videoId]: data.url });

        // Cache for VideoGrid playback
        const fullUrls =
          JSON.parse(localStorage.getItem("fullVideoUrls")) || {};
        fullUrls[data.videoId] = data.url;
        localStorage.setItem("fullVideoUrls", JSON.stringify(fullUrls));

        // Fetch video metadata
        const videoRes = await fetch(`/api/videos?id=${data.videoId}`);
        if (videoRes.ok) {
          const video = await videoRes.json();
          setVideos([video]);
        }
      } catch (err) {
        console.error("❌ SuccessView error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAccess();
  }, [token]);

  // ------------------------------------------
  // UI
  // ------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-5xl">
          ✓
        </div>

        <h1 className="text-2xl font-bold mb-2">Payment Successful</h1>

        {loading && <p className="text-gray-500">Preparing your video…</p>}

        {!loading && error && (
          <p className="text-red-600 font-medium">{error}</p>
        )}

        <div className="flex flex-col gap-4 mt-6">
          {/* ----------------------------------
      PER-VIDEO DOWNLOADS
  ---------------------------------- */}
          {!loading && videos.length > 0 && (
            <div className="space-y-6">
              {videos.map((video) => (
                <div key={video._id}>
                  <img
                    src={video.thumbnail || video.url}
                    alt={video.title}
                    className="w-full rounded-lg shadow"
                  />

                  <h2 className="text-xl font-semibold mt-3">{video.title}</h2>

                  <p className="text-gray-500 text-sm mt-1">
                    {video.description}
                  </p>

                  <button
                    disabled={!downloadUrls[video._id]}
                    onClick={() =>
                      window.open(
                        downloadUrls[video._id],
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className={`w-full mt-4 py-3 rounded-lg text-white ${
                      downloadUrls[video._id]
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {downloadUrls[video._id]
                      ? "Watch / Download Video"
                      : "Preparing Video…"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ----------------------------------
      TIP (GLOBAL)
  ---------------------------------- */}
          {!loading && videos.length > 0 && (
            <p className="text-xs text-gray-500 text-center">
              Tip: Once the video opens, right-click and choose{" "}
              <strong>“Save video as…”</strong>
            </p>
          )}

          {/* ----------------------------------
      VIP ACCESS (ALWAYS LAST)
  ---------------------------------- */}
          <button
            disabled={videos.length === 0}
            onClick={() =>
              window.open(VIP_TELEGRAM_INVITE, "_blank", "noopener,noreferrer")
            }
            className={`w-full py-3 rounded-lg font-medium ${
              videos.length > 0
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-gray-400 text-white cursor-not-allowed"
            }`}
          >
            <span
              className={`inline-block mr-1 transition-transform ${
                videos.length > 0 ? "scale-110 animate-pulse" : ""
              }`}
            >
              👑
            </span>
            Join VIP Telegram
          </button>

          {/* ----------------------------------
      NAVIGATION
  ---------------------------------- */}
          <button
            onClick={() => router.push(urlHandle ? `/${urlHandle}` : "/")}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
