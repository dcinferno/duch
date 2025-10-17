import { Suspense } from "react";
import Sidebar from "../components/Sidebar";
import VideoGridWrapper from "../components/VideoGridWrapper"; // client component wrapper

export default function Home() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar is a Client Component, so we wrap it in Suspense */}
      <Suspense fallback={<div className="p-4">Loading sidebar...</div>}>
        <Sidebar />
      </Suspense>

      <main className="flex-1 p-4">
        <h1 className="text-2xl font-bold mb-4">Featured Videos</h1>
        <VideoGridWrapper />
      </main>
    </div>
  );
}
