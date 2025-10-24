"use client";

import Link from "next/link";

export default function Sidebar({ creators }) {
  // Filter only premium creators
  const premiumCreators = creators.filter((creator) => creator.premium);

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full px-4 pt-4">
      <div>
        <h2 className="text-lg font-semibold mb-3">Featured Creators</h2>
        {premiumCreators.length > 0 ? (
          <ul className="space-y-2">
            {premiumCreators.map((creator) => (
              <li
                key={creator._id}
                className="flex items-center justify-between"
              >
                {/* Creator Name */}
                <a
                  href={creator.urlHandle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-semibold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-400 animate-gradient-x hover:underline"
                >
                  {creator.name}
                </a>

                {/* Premium Star */}
                {creator.premium && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-yellow-400 animate-pulse animate-spin-slow"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.966a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.462a1 1 0 00-.364 1.118l1.287 3.966c.3.921-.755 1.688-1.54 1.118l-3.39-2.462a1 1 0 00-1.176 0l-3.39 2.462c-.784.57-1.838-.197-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.045 9.393c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.966z" />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">No featured creators yet.</p>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="mt-auto mb-4 space-y-3">
        {/* Upload Button */}
        <Link href="/upload">
          <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded flex items-center justify-center gap-2 transition-shadow shadow-md hover:shadow-lg">
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

        {/* Become a Creator Link */}
        <Link href="/sign-up">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded flex items-center justify-center gap-2 transition-shadow shadow-md hover:shadow-lg">
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Become a Creator
          </button>
        </Link>
      </div>

      <style jsx>{`
        @keyframes gradient-x {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient-x {
          background-size: 200% auto;
          animation: gradient-x 3s linear infinite;
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 5s linear infinite;
        }
      `}</style>
    </aside>
  );
}
