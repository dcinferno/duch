import VideosClientPage from "../components/VideoGridClient";

export const revalidate = 60; // Revalidate cache every 60 seconds

async function getVideos() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/videos`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch videos");
  }

  return res.json();
}

export default async function Home() {
  const type = process.env.NEXT_PUBLIC_LATEST_VIDEO_TYPE;
  const videos = await getVideos();

  return (
    <div className="w-full h-full flex flex-col px-2 sm:px-4 pt-6 overflow-hidden">
      <VideosClientPage videos={videos} title={`Latest ${type} Videos`} />
    </div>
  );
}
