"use client";

import { useEffect, useState } from "react";
import VideosClientPage from "../components/VideoGridClient";

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      setLoading(true);
      try {
        const res = await fetch("/api/videos");
        const data = await res.json();
        setVideos(data);
      } catch (err) {
        console.error("Failed to load videos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  return (
    <main className="flex-1 min-h-screen">
      {/* Page header */}
      <div className="px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-bold">Latest Videos</h1>
      </div>

      {/* Video grid */}
      <div className="px-4 sm:px-6 pb-6">
        {loading ? (
          <p>Loading videos...</p>
        ) : videos.length > 0 ? (
          <VideosClientPage videos={videos} />
        ) : (
          <p>No videos found.</p>
        )}
      </div>
    </main>
  );
}
