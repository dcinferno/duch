'use client';

import { useState, Suspense } from 'react';
import SidebarWrapper from './SidebarWrapper';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function SidebarLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen relative overflow-x-hidden">
      {/* Hamburger Toggle (Mobile) */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-white text-black p-2 rounded shadow"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
      </button>

      {/* Sidebar Overlay (Mobile) & Static (Desktop) */}
      <Suspense fallback={<div className="p-4">Loading sidebar...</div>}>
        {/* Background overlay (dimmed screen on mobile when sidebar open) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black opacity-50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`
            fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-40 transform transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:relative md:z-0 md:transform-none
          `}
        >
          <SidebarWrapper />
        </div>
      </Suspense>

      {/* Main Content */}
      <main className="flex-1 p-4 pt-16 md:pt-4 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
