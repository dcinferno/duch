"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import VideoGridClient from "./VideoGridClient";

export default function VideosClientPage() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      setLoading(true);
      try {
        const url = category
          ? `/api/video?category=${category.toLowerCase()}`
          : "/api/video";

        const res = await fetch(url);
        const data = await res.json();
        setVideos(data);
      } catch (err) {
        console.error("Error fetching videos:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, [category]);

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-4">
        {category ? `${category} Videos` : "All Videos"}
      </h1>
      {loading ? <p>Loading videos...</p> : <VideoGridClient videos={videos} />}
    </div>
  );
}
