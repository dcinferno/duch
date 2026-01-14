"use client";

import { useEffect, useState } from "react";

export default function SuccessView({ token, videoId, bundleId, router }) {
  const [videos, setVideos] = useState([]);
  const [downloadUrls, setDownloadUrls] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const VIP_TELEGRAM_INVITE = process.env.NEXT_PUBLIC_VIP_TELEGRAM_INVITE;

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
        setLoading(true);
        setError(null);

        const res = await fetch("/api/download-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          let msg = "Access denied.";
          try {
            const data = await res.json();
            if (data?.error) msg = data.error;
          } catch {}
          throw new Error(msg);
        }

        const data = await res.json();

        // ----------------------------------
        // ✅ Normalize response (NON-BREAKING)
        // ----------------------------------
        const resolved = Array.isArray(data?.videos)
          ? data.videos
          : data?.videoId && data?.url
          ? [{ videoId: data.videoId, url: data.url }]
          : [];

        if (resolved.length === 0) {
          throw new Error("Invalid access response.");
        }

        // ----------------------------------
        // ✅ Cache setup
        // ----------------------------------
        const purchased =
          JSON.parse(localStorage.getItem("purchasedVideos")) || {};
        const fullUrls =
          JSON.parse(localStorage.getItem("fullVideoUrls")) || {};

        const videoMeta = [];

        for (const item of resolved) {
          if (!item.videoId || !item.url) continue;

          purchased[item.videoId] = { token };
          fullUrls[item.videoId] = item.url;

          try {
            const videoRes = await fetch(`/api/videos?id=${item.videoId}`);
            if (videoRes.ok) {
              videoMeta.push(await videoRes.json());
            }
          } catch (err) {
            console.warn(
              "⚠️ Failed to fetch video metadata:",
              item.videoId,
              err
            );
          }
        }

        localStorage.setItem("purchasedVideos", JSON.stringify(purchased));
        localStorage.setItem("fullVideoUrls", JSON.stringify(fullUrls));

        // ----------------------------------
        // ✅ State updates
        // ----------------------------------
        setDownloadUrls(
          Object.fromEntries(resolved.map((v) => [v.videoId, v.url]))
        );

        setVideos(videoMeta);
      } catch (err) {
        console.error("❌ SuccessView error:", err);
        setError(err.message || "Something went wrong.");
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
            onClick={() => router.push("/")}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
