// app/[creatorName]/page.js
import VideoGridWrapper from "../../components/VideoGridWrapper";

export default function CreatorPage({ params }) {
  const { creatorName } = params;

  return (
    <div className="p-4 md:ml-64">
      <h1 className="text-2xl font-bold mb-6">{creatorName}’s Videos</h1>
      <VideoGridWrapper filter={{ creatorName }} />
    </div>
  );
}
