"use client";

import { useState, Suspense } from "react";
import Sidebar from "../../components/Sidebar";
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

      {/* Sidebar (One Instance Only) */}
      <Suspense fallback={<div className="p-4">Loading sidebar...</div>}>
        <div
          className={`
            fixed top-0 left-0 h-full w-64 bg-gray-900 z-10 transform transition-transform duration-300
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:relative md:translate-x-0 md:transform-none md:z-0
          `}
        >
          <Sidebar />
        </div>
      </Suspense>

      {/* Main Content */}
      <main className="flex-1 p-4 pl-14 md:pl-4 md:ml-64">
        <Suspense fallback={<p className="p-4">Loading videos...</p>}>
          <VideosClientPage />
        </Suspense>
      </main>
    </div>
  );
}
