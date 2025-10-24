"use client";

import { useEffect, useState } from "react";
import VideoGridClient from "../components/VideoGridClient";

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      setLoading(true);
      try {
        const res = await fetch("/api/videos"); // your API endpoint
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
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Latest Videos</h1>

      {loading ? (
        <p>Loading videos...</p>
      ) : videos.length > 0 ? (
        <VideoGridClient videos={videos} />
      ) : (
        <p>No videos found.</p>
      )}
    </div>
  );
}
