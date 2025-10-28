"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "../app/logo.svg"; // adjust path if needed

export default function Sidebar({ creators }) {
  const premiumCreators = creators.filter((creator) => creator.premium);

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full px-4 pt-4">
      {/* Logo / Home Link */}
      <Link href="/" className="mb-6 flex items-center justify-center">
        <Image src={logo} alt="App Logo" width={96} height={96} />
      </Link>

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

                {/* Dynamic Icon Logic */}
                <span>
                  {creator.icon === "fire" ? (
                    <span className="text-orange-500 text-xl animate-flicker inline-block">
                      🔥
                    </span>
                  ) : creator.icon === "devil" ? (
                    <span className="text-red-600 text-lg animate-pulse inline-block">
                      😈
                    </span>
                  ) : creator.icon === "main-duo" ? (
                    <div className="flex gap-1">
                      {/* Snowflake rotating */}
                      <span className="animate-spin-slow inline-block will-change-transform mr-1">
                        ❄️
                      </span>
                      {/* Bunny bouncing */}
                      <span className="text-pink-400 text-lg animate-bounce inline-block transform-gpu">
                        🐰
                      </span>
                    </div>
                  ) : creator.icon === "bowing-man" ? (
                    <span className="inline-block text-2xl animate-bow">
                      🙇🏿‍♂️
                    </span>
                  ) : (
                    <span className="text-yellow-400 text-lg animate-pulse inline-block">
                      ⭐
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">No featured creators yet.</p>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="mt-auto mb-4 space-y-3">
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
        /* 🌈 Animated gradient for names */
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

        /* ❄️ Slow spin for snowflake */
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
          display: inline-block;
          will-change: transform;
          transform: translateZ(0);
        }

        /* 🙇🏿‍♂️ Bowing Man Animation */
        @keyframes bow {
          0%,
          100% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(25deg) scale(0.95);
          }
        }
        .animate-bow {
          display: inline-block;
          transform-origin: bottom center;
          animation: bow 2.5s ease-in-out infinite;
        }

        /* 🔥 Fire Flicker Animation */
        @keyframes flicker {
          0%,
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.1) rotate(-5deg);
          }
          75% {
            opacity: 0.9;
            transform: scale(0.95) rotate(3deg);
          }
        }
        .animate-flicker {
          animation: flicker 1s infinite ease-in-out;
          display: inline-block;
          will-change: transform, opacity;
        }
      `}</style>
    </aside>
  );
}
