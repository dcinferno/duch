import { Suspense } from "react";
import VideosClientPage from "../../components/VideosClientPage";

export default function VideosPage() {
  return (
    <Suspense fallback={<p className="p-4">Loading videos...</p>}>
      <VideosClientPage />
    </Suspense>
  );
}
