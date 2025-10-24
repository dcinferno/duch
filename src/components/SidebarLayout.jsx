"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export default function SidebarLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creators, setCreators] = useState([]);

  useEffect(() => {
    async function fetchCreators() {
      try {
        const res = await fetch("/api/creators");
        const data = await res.json();
        setCreators(data);
      } catch (err) {
        console.error("Failed to load creators", err);
      }
    }

    fetchCreators();
  }, []);

  return (
    <div className="flex min-h-screen relative">
      {/* Mobile Hamburger */}
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

      {/* Sidebar for desktop & mobile */}
      <div
        className={`fixed top-0 left-0 z-30 h-full bg-gray-900 transition-transform transform
    md:static md:flex md:w-64
    ${sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
  `}
      >
        <Sidebar creators={creators} />
      </div>

      {/* Overlay when mobile sidebar open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 pt-16 md:pt-4 transition-all duration-300 p-4">
        {children}
      </main>
    </div>
  );
}
