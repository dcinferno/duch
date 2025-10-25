import ClientOnly from "../components/ClientOnly";
import VideosClientPage from "../components/VideoGridClient";

export default function Home() {
  return (
    <div className="w-full px-2 sm:px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Latest Videos</h1>

      <ClientOnly fallback={<p>Loading videos...</p>}>
        <VideosFetcher />
      </ClientOnly>
    </div>
  );
}

// Client-only component with hooks
function VideosFetcher() {
  const { useState, useEffect } = require("react");
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
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  if (loading) return <p>Loading videos...</p>;
  if (!videos.length) return <p>No videos found.</p>;

  return <VideosClientPage videos={videos} />;
}
