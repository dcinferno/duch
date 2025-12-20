"use client";

import { useEffect, useState } from "react";

export default function SuccessView({ videoId, urlHandle, router }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  // ✅ 1️⃣ Mark purchased
  useEffect(() => {
    if (!videoId) return;

    const purchased = JSON.parse(localStorage.getItem("purchasedVideos")) || {};
    purchased[videoId] = true;
    localStorage.setItem("purchasedVideos", JSON.stringify(purchased));
  }, [videoId]);

  // ✅ 2️⃣ Fetch signed download URL
  useEffect(() => {
    if (!videoId) return;

    async function fetchDownloadUrl() {
      try {
        const userId = localStorage.getItem("userId");

        if (!userId) {
          throw new Error("Missing userId");
        }

        const res = await fetch("/api/download-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, videoId }),
        });

        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("This video has not been purchased.");
          }

          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Unable to prepare download.");
        }

        const data = await res.json();

        if (!data.url) {
          throw new Error("No download URL returned");
        }

        setDownloadUrl(data.url);

        const fullUrls =
          JSON.parse(localStorage.getItem("fullVideoUrls")) || {};
        fullUrls[videoId] = data.url;
        localStorage.setItem("fullVideoUrls", JSON.stringify(fullUrls));
      } catch (err) {
        console.error("Download URL error:", err);
        setDownloadError(err.message);
      }
    }

    fetchDownloadUrl();
  }, [videoId]);

  // ✅ 3️⃣ Load video metadata
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
            disabled={!downloadUrl}
            onClick={() => {
              window.open(downloadUrl, "_blank", "noopener,noreferrer");
            }}
            className={`w-full py-3 rounded-lg text-white ${
              downloadUrl
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {downloadUrl ? "Download Now" : "Preparing Download…"}
          </button>

          {downloadError && (
            <p className="text-red-600 font-medium text-sm">{downloadError}</p>
          )}
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
