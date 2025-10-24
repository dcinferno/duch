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
    <div className="w-full px-2 sm:px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Latest Videos</h1>
      {loading ? (
        <p>Loading videos...</p>
      ) : videos.length > 0 ? (
        <VideosClientPage videos={videos} />
      ) : (
        <p>No videos found.</p>
      )}
    </div>
  );
}
