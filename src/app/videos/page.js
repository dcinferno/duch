// app/videos/page.jsx
export const dynamic = "force-dynamic";
import VideoGridClient from "../../components/VideoGridClient";
import { connectToDB } from "../../lib/mongodb";
import Videos from "../../models/videos";

export default async function VideosPage() {
  await connectToDB();
  const videos = await Videos.find({}).sort({ createdAt: -1 }).lean();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Latest Videos</h1>
      <VideoGridClient videos={videos || []} />
    </div>
  );
}
