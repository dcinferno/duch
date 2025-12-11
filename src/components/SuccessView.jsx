"use client";

import { useEffect, useState } from "react";

export default function SuccessView({ videoId, urlHandle, router }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  //
  // ✅ 1️⃣ Mark video as purchased (merge-safe)
  //
  useEffect(() => {
    if (!videoId) return;

    const purchased = JSON.parse(localStorage.getItem("purchasedVideos")) || {};

    purchased[videoId] = true;

    localStorage.setItem("purchasedVideos", JSON.stringify(purchased));
  }, [videoId]);

  //
  // ✅ 2️⃣ Fetch & store FULL video URL (merge-safe)
  //
  useEffect(() => {
    if (!videoId) return;

    async function fetchDownloadUrl() {
      const userId = localStorage.getItem("userId");

      const res = await fetch("/api/download-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, videoId }),
      });

      const data = await res.json();
      if (!data.url) return;

      const fullUrls = JSON.parse(localStorage.getItem("fullVideoUrls")) || {};

      fullUrls[videoId] = data.url;

      localStorage.setItem("fullVideoUrls", JSON.stringify(fullUrls));
    }

    fetchDownloadUrl();
  }, [videoId]);

  //
  // ✅ 3️⃣ Load video metadata
  //
  useEffect(() => {
    if (!videoId) return;

    async function load() {
      try {
        const res = await fetch(`/api/videos?id=${videoId}`);
        setVideo(await res.json());
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }

    load();
  }, [videoId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-5xl">
          ✓
        </div>

        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your purchase is complete. The full video has been unlocked.
        </p>

        {loading ? (
          <p className="text-gray-500">Loading video…</p>
        ) : video ? (
          <>
            <img
              src={video.thumbnail || video.url}
              alt={video.title}
              className="w-full rounded-lg shadow"
            />
            <h2 className="text-xl font-semibold mt-3">{video.title}</h2>
            <p className="text-gray-500 text-sm mt-1">{video.description}</p>
          </>
        ) : (
          <p className="text-gray-500">Video not found.</p>
        )}

        <div className="flex flex-col gap-3 mt-6">
          {/* ✅ DOWNLOAD */}
          <button
            onClick={async () => {
              const fullUrls =
                JSON.parse(localStorage.getItem("fullVideoUrls")) || {};

              const fullUrl = fullUrls[videoId];

              if (!fullUrl) {
                alert("Download not ready yet. Try again.");
                return;
              }

              const res = await fetch(fullUrl);
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);

              const a = document.createElement("a");
              a.href = url;
              a.download =
                (video?.title || videoId).replace(/\s+/g, "_") + ".mp4";

              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            Download Now
          </button>

          {/* ✅ BACK */}
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
