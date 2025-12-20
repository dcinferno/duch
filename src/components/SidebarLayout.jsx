"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export default function SidebarLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creators, setCreators] = useState([]);

  // --------------------------------------------------
  // Fetch creators once (client-side)
  // --------------------------------------------------
  useEffect(() => {
    async function fetchCreators() {
      try {
        const res = await fetch("/api/creators");
        const data = await res.json();
        setCreators(data);
      } catch (err) {
        console.error("❌ Failed to load creators", err);
      }
    }
    fetchCreators();
  }, []);

  // --------------------------------------------------
  // Lock body scroll when sidebar is open (mobile UX)
  // --------------------------------------------------
  useEffect(() => {
    if (!sidebarOpen) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-full w-full relative">
      {/* ==================================================
          MOBILE HAMBURGER BUTTON
         ================================================== */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Toggle sidebar"
        className="md:hidden fixed top-4 left-4 z-50 bg-white text-black p-2 rounded-md shadow-lg"
      >
        {sidebarOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* ==================================================
          MOBILE OVERLAY (closes sidebar on tap)
         ================================================== */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200 ${
          sidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onPointerDown={() => setSidebarOpen(false)}
      />

      {/* ==================================================
          SIDEBAR
         ================================================== */}
      <aside
        className={` fixed top-0 left-0 z-50 h-dvh w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }
    md:static
    md:translate-x-0
    md:w-64
    md:shrink-0
  `}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Sidebar creators={creators} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ==================================================
          MAIN CONTENT
         ================================================== */}
      <main className="flex-1 min-h-screen p-0">{children}</main>
    </div>
  );
}
