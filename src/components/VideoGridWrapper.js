// components/VideoGridWrapper.js
"use client";

import { useEffect, useState } from "react";
import VideoGridClient from "./VideoGridClient"; // assumed to be a client component

export default function VideoGridWrapper() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getVideos() {
      try {
        const res = await fetch("/api/video", { cache: "no-store" });
        const data = await res.json();
        setVideos(data);
      } catch (err) {
        console.error("Failed to fetch videos", err);
      } finally {
        setLoading(false);
      }
    }

    getVideos();
  }, []);

  if (loading) return <p>Loading videos...</p>;

  return <VideoGridClient videos={videos} />;
}
