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
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const SOCIAL_META = {
    beacons: { icon: "🌐", label: "Beacons" },
    instagram: { icon: "📸", label: "Instagram" },
  };
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
          `/api/videos?creator=${encodeURIComponent(urlHandle)}`
        );
        if (!videosRes.ok) throw new Error("Videos not found");
        const videoData = await videosRes.json();

        // Attach creator info to videos
        setVideos(videoData);
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
            className="w-20 h-20 rounded-full object-cover mr-4 shadow-lg cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setShowPhotoModal(true)}
          />
        )}

        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">{creator.name}'s Videos</h1>

          {/* 👇 Social links */}
          {Array.isArray(creator.socials) && creator.socials.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {creator.socials.map((social, i) => {
                const meta = SOCIAL_META[social.type] || {
                  icon: "🔗",
                  label: social.type,
                };

                return (
                  <a
                    key={`${social.type}-${i}`}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-black transition"
                  >
                    <span className="text-lg">{meta.icon}</span>
                    <span className="underline">{meta.label}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Video Grid */}
      {videos.length > 0 ? (
        <VideoGridClient videos={videos} />
      ) : (
        <p className="text-gray-500">No videos found for this creator.</p>
      )}

      {/* Full-screen photo modal */}
      {showPhotoModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPhotoModal(false)}
        >
          <img
            src={creator.photo}
            alt={creator.name}
            className="max-w-full max-h-full rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
