"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import VideoGrid from "../../components/VideoGrid";

export default function VideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const category = searchParams.get("category");

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
    <div className="p-6 flex-1">
      <h1 className="text-2xl font-bold mb-4">
        {category ? "Filtered Videos" : "All Videos"}
      </h1>
      <Suspense fallback={<p>Loading videos...</p>}>
        <VideoGrid videos={videos} />
      </Suspense>
    </div>
  );
}
