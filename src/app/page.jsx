"use client"; // This marks the whole file as a client component

import { useState, useEffect } from "react";
import ClientOnly from "../components/ClientOnly";
import VideosClientPage from "../components/VideoGridClient";

export default function Home() {
  const type = process.env.NEXT_PUBLIC_LATEST_VIDEO_TYPE;
  return (
    <div className="w-full h-full flex flex-col px-2 sm:px-4 py-6">
      <ClientOnly fallback={<p>Loading videos...</p>}>
        <VideosFetcher title={`Latest ${type} Videos`} />
      </ClientOnly>
    </div>
  );
}

function VideosFetcher({ title }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch("/api/videos");
        const data = await res.json();
        setVideos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  if (loading) return <p>Loading videos...</p>;
  if (!videos.length) return <p>No videos found.</p>;

  return <VideosClientPage videos={videos} title={title} />;
}
