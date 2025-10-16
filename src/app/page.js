import Sidebar from "@/components/Sidebar";
import VideoGrid from "@/components/VideoGrid";

async function getVideos() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/video`);
  return res.json();
}

export default async function Home() {
  const videos = await getVideos();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4">
        <h1 className="text-2xl font-bold mb-4">Featured Videos</h1>
        <VideoGrid videos={videos} />
      </main>
    </div>
  );
}
