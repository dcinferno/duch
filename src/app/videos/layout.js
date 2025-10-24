"use client";

import { useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Sidebar from "../../components/Sidebar";

export default function VideosLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen relative">
      {/* Mobile Hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-40 bg-white text-black p-2 rounded shadow"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content */}
      <main
        className={`flex-1 pt-16 md:pt-4 transition-all duration-300
    ${sidebarOpen ? "overflow-hidden" : ""} 
    px-2 md:px-6 md:ml-64`}
      >
        {children}
      </main>
    </div>
  );
}
