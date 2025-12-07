"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "../app/logo.svg";

export default function Sidebar({ creators }) {
  const premiumCreators = creators
    .filter((creator) => creator.premium)
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));

  const topCreators = creators.filter(
    (creator) => !creator.premium && creator.urlHandle && !creator.secret
  );

  // Accept the click event so we can prevent default navigation
  // and ensure the analytics event has time to be sent.
  const handleClick = (e, creator) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    const url = creator?.urlHandle || creator?.url || "#";

    // Send analytics (use transport_type: 'beacon' where supported)
    try {
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "creator_click", {
          event_category: "Creators",
          event_label: creator?.name,
          value: url,
          transport_type: "beacon",
        });
      }
    } catch (err) {
      // guard against any runtime errors in gtag
      // eslint-disable-next-line no-console
      console.warn("gtag send failed", err);
    }

    // Navigate in the same tab after a short delay so the event
    // has time to be dispatched. This avoids opening a new tab.
    setTimeout(() => {
      if (url && url !== "#") {
        try {
          window.location.href = url;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("navigation failed", err);
        }
      }
    }, 150);
  };

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full px-4 pt-1 sm:pt-2">
      {/* Logo */}
      <Link href="/" className="flex items-center justify-center mb-2 sm:mb-3">
        <Image src={logo} alt="App Logo" width={96} height={96} />
      </Link>

      {/* Scrollable CONTENT area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {/* Featured Creators */}
        <div className="mb-2">
          <h2 className="text-lg font-semibold mb-1">Featured Creators</h2>
          {premiumCreators.length > 0 ? (
            <ul className="space-y-2">
              {premiumCreators.map((creator) => (
                <li
                  key={creator._id}
                  className="flex items-center justify-between"
                >
                  <a
                    href={creator.urlHandle}
                    onClick={(e) => handleClick(e, creator)}
                    className="block font-semibold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-400 animate-gradient-x hover:underline"
                  >
                    {creator.name}
                  </a>
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
                        <span className="animate-spin-slow inline-block mr-1">
                          ❄️
                        </span>
                        <span className="text-pink-400 text-lg animate-bounce inline-block">
                          🐰
                        </span>
                      </div>
                    ) : creator.icon === "bowing-man" ? (
                      <span className="inline-block text-2xl animate-bow">
                        🙇🏿‍♂️
                      </span>
                    ) : creator.icon === "cherry" ? (
                      <span className="text-red-500 text-lg animate-cherry inline-block">
                        🍒
                      </span>
                    ) : creator.icon === "princess" ? (
                      <span className="text-pink-300 text-2xl animate-princess inline-block">
                        🧝🏻‍♀️
                      </span>
                    ) : creator.icon === "crown" ? (
                      <span className="text-yellow-300 text-2xl animate-shimmer inline-block">
                        👑
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

        {/* Top Creators */}
        <div className="border-t border-gray-700 pt-3 mt-2">
          <h2 className="text-lg font-semibold mb-1">Top Creators</h2>
          {topCreators.length > 0 ? (
            <ul className="space-y-2">
              {topCreators.map((creator) => (
                <li key={creator._id}>
                  <a
                    href={creator.urlHandle}
                    onClick={(e) => handleClick(e, creator)}
                    className="block text-sm text-gray-300 hover:text-yellow-400 transition-colors"
                  >
                    {creator.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm mt-2">No top creators yet.</p>
          )}
        </div>
      </div>

      {/* FIXED Bottom Buttons */}
      <div className="mt-3 mb-4 space-y-3">
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

        {/* Become a Creator Button */}
        <Link href="/sign-up">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded flex items-center justify-center gap-2 transition-shadow shadow-md hover:shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 11c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zM19 20v-1c0-2.761-4.03-4-7-4s-7 1.239-7 4v1M16 3.13a4 4 0 010 7.75"
              />
            </svg>
            Become a Creator
          </button>
        </Link>
      </div>

      {/* Animations */}
      {/* Custom animations */}
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
          animation: spin-slow 15s linear infinite;
          display: inline-block;
        }

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
          animation: bow 2.5s ease-in-out infinite;
          transform-origin: bottom center;
        }

        @keyframes flicker {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.1);
          }
        }
        .animate-flicker {
          animation: flicker 1s infinite ease-in-out;
        }

        @keyframes cherry-pulse {
          0%,
          100% {
            transform: scale(1);
            filter: drop-shadow(0 0 6px rgba(255, 0, 80, 0.7))
              drop-shadow(0 0 12px rgba(255, 0, 100, 0.6))
              drop-shadow(0 0 18px rgba(255, 0, 120, 0.5));
          }
          50% {
            transform: scale(1.3);
            filter: drop-shadow(0 0 12px rgba(255, 0, 100, 0.9))
              drop-shadow(0 0 24px rgba(255, 20, 150, 0.8))
              drop-shadow(0 0 36px rgba(255, 60, 180, 0.7));
          }
        }
        .animate-cherry {
          animation: cherry-pulse 1.8s ease-in-out infinite;
        }

        /* Softer shimmer animation */
        @keyframes shimmer {
          0% {
            filter: drop-shadow(0 0 2px rgba(255, 215, 0, 0.5))
              drop-shadow(0 0 4px rgba(255, 235, 100, 0.4));
            transform: scale(1);
            opacity: 0.9;
          }
          50% {
            filter: drop-shadow(0 0 5px rgba(255, 235, 120, 0.6))
              drop-shadow(0 0 8px rgba(255, 245, 160, 0.5));
            transform: scale(1.08);
            opacity: 1;
          }
          100% {
            filter: drop-shadow(0 0 2px rgba(255, 215, 0, 0.5))
              drop-shadow(0 0 4px rgba(255, 235, 100, 0.4));
            transform: scale(1);
            opacity: 0.9;
          }
        }

        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        @keyframes princess-glow {
          0% {
            transform: scale(1);
            filter: drop-shadow(0 0 2px rgba(255, 170, 255, 0.4))
              drop-shadow(0 0 4px rgba(255, 190, 255, 0.3));
            opacity: 0.9;
          }
          50% {
            transform: scale(1.08);
            filter: drop-shadow(0 0 4px rgba(255, 170, 255, 0.5))
              drop-shadow(0 0 7px rgba(255, 200, 255, 0.4));
            opacity: 1;
          }
          100% {
            transform: scale(1);
            filter: drop-shadow(0 0 2px rgba(255, 170, 255, 0.4))
              drop-shadow(0 0 4px rgba(255, 190, 255, 0.3));
            opacity: 0.9;
          }
        }

        .animate-princess {
          animation: princess-glow 2.2s ease-in-out infinite;
        }
      `}</style>
    </aside>
  );
}
