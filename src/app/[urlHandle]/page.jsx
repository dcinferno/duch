"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import VideoGridClient from "../../components/VideoGridClient";
import { useParams } from "next/navigation";

export default function CreatorPage() {
  const { urlHandle } = useParams();
  const [creator, setCreator] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCreatorAndVideos() {
      setLoading(true);
      try {
        // Fetch creator by urlHandle
        const creatorRes = await fetch(`/api/creators/${urlHandle}`);
        if (!creatorRes.ok) throw new Error("Creator not found");
        const creatorData = await creatorRes.json();
        setCreator(creatorData);
        // Fetch videos by creator name (temporarily)
        const videosRes = await fetch(
          `/api/videos?creatorName=${encodeURIComponent(creatorData.name)}`
        );

        if (!videosRes.ok) throw new Error("Videos not found");
        const videoData = await videosRes.json();

        // Attach creator info to videos
        const videosWithCreator = videoData.map((video) => ({
          ...video,
          creatorPhoto: creatorData.photo || null,
          socialMediaUrl: creatorData.url || video.socialMediaUrl,
        }));

        setVideos(videosWithCreator);
      } catch (err) {
        console.error(err);
        setCreator(null);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCreatorAndVideos();
  }, [urlHandle]);

  if (loading) return <p className="text-center py-10">Loading...</p>;
  if (!creator) return <p className="text-center py-10">Creator not found.</p>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Creator Header */}
      <div className="flex items-center mb-6">
        {creator.photo && (
          <img
            src={creator.photo}
            alt={creator.name}
            className="w-20 h-20 rounded-full object-cover mr-4 shadow-lg"
          />
        )}
        <h1 className="text-3xl font-bold">{creator.name}'s Videos</h1>
      </div>

      {/* Video Grid */}
      {videos.length > 0 ? (
        <VideoGridClient videos={videos} />
      ) : (
        <p className="text-gray-500">No videos found for this creator.</p>
      )}
    </div>
  );
}
