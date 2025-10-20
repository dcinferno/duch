"use client";

import { useState, Suspense } from "react";
import VideosClientPage from "../../components/VideosClientPage";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export default function VideosPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen relative">
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-20 bg-white text-black p-2 rounded shadow"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* Main Content */}
      <main className="flex-1 pt-16 md:pt-4 transition-all duration-300 p-4">
        <Suspense fallback={<p className="p-4">Loading videos...</p>}>
          <VideosClientPage />
        </Suspense>
      </main>
    </div>
  );
}
