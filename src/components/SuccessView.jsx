"use client";

import { useEffect, useState } from "react";

export default function SuccessView({ videoId, urlHandle, router }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  //
  // 1️⃣ Mark as purchased
  //
  useEffect(() => {
    if (!videoId) return;
    const purchased = JSON.parse(
      localStorage.getItem("purchasedVideos") || "{}"
    );
    purchased[videoId] = true;
    localStorage.setItem("purchasedVideos", JSON.stringify(purchased));
  }, [videoId]);

  //
  // 2️⃣ Fetch full video signed URL from backend
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
      if (data.url) {
        localStorage.setItem(`full_${videoId}`, data.url);
      }
    }

    fetchDownloadUrl();
  }, [videoId]);

  //
  // 3️⃣ Load video metadata to render “Success” screen
  //
  useEffect(() => {
    if (!videoId) return;
    async function load() {
      try {
        const res = await fetch(`/api/videos?id=${videoId}`);
        const data = await res.json();
        setVideo(data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    load();
  }, [videoId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-5xl">
            ✓
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>

        <p className="text-gray-600 mb-6">
          Your purchase is complete. The full video has been unlocked.
        </p>

        {loading ? (
          <p className="text-gray-500">Loading video...</p>
        ) : video ? (
          <div className="mb-6">
            <img
              src={video.thumbnail || video.url}
              className="w-full rounded-lg shadow"
              alt={video.title}
            />
            <h2 className="text-xl font-semibold mt-3">{video.title}</h2>
            <p className="text-gray-500 text-sm mt-1">{video.description}</p>
          </div>
        ) : (
          <p className="text-gray-500">Video not found.</p>
        )}

        <div className="flex flex-col gap-3 mt-6">
          {/* DOWNLOAD NOW */}
          <button
            onClick={async () => {
              const fullUrl = localStorage.getItem(`full_${videoId}`);
              if (!fullUrl) {
                alert("Download not ready yet. Please try again.");
                return;
              }

              try {
                const response = await fetch(fullUrl);
                const blob = await response.blob();

                const blobUrl = URL.createObjectURL(blob);

                const a = document.createElement("a");
                a.href = blobUrl;

                const filename = video?.title
                  ? video.title.replace(/\s+/g, "_") + ".mp4"
                  : `${videoId}.mp4`;

                a.download = filename;

                document.body.appendChild(a);
                a.click();
                a.remove();

                URL.revokeObjectURL(blobUrl);
              } catch {
                alert("Download failed.");
              }
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 text-md font-medium"
          >
            Download Now
          </button>

          {/* BACK TO HOME */}
          <button
            onClick={() => router.push(urlHandle ? `/${urlHandle}` : "/")}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 text-md font-medium"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
