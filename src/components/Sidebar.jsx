"use client";

import Link from "next/link";

export default function Sidebar({ creators }) {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full px-4 pt-4">
      <div>
        <h2 className="text-lg font-semibold mb-3">Featured Creators</h2>
        {creators.length > 0 ? (
          <ul className="space-y-2">
            {creators.map((creator) => (
              <li key={creator._id}>
                <a
                  href={creator.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:underline text-yellow-300"
                >
                  {creator.name}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">No featured creators yet.</p>
        )}
      </div>

      {/* Upload Button at the bottom */}
      <div className="mt-auto mb-4">
        <Link href="/upload">
          <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded flex items-center justify-center gap-2 transition-shadow shadow-md hover:shadow-lg">
            {/* Optional: Upload icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v8m0-8l-4 4m4-4l4 4m-4-8V4"
              />
            </svg>
            Upload
          </button>
        </Link>
      </div>
    </aside>
  );
}
