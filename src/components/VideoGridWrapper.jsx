"use client";

import { useEffect, useState } from "react";
import VideoGridClient from "./VideoGridClient";

export default function VideoGridWrapper() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getVideos() {
      try {
        setLoading(true);

        // Fetch videos
        const videoRes = await fetch("/api/pushrVideos", { cache: "no-store" });
        const videoData = await videoRes.json();

        // Fetch creators
        const creatorRes = await fetch("/api/creators", { cache: "no-store" });
        const creatorData = await creatorRes.json();

        // Merge creator info into each video
        const videosWithCreator = videoData.map((video) => {
          const creator = creatorData.find((c) => c.name === video.creatorName);

          return {
            ...video,
            creatorPhoto: creator?.photo || null,
            socialMediaUrl: creator?.url || video.socialMediaUrl,
          };
        });

        setVideos(videosWithCreator);
      } catch (err) {
        console.error("Failed to fetch videos or creators", err);
      } finally {
        setLoading(false);
      }
    }

    getVideos();
  }, []);

  if (loading) return <p>Loading videos...</p>;

  return <VideoGridClient videos={videos} />;
}
