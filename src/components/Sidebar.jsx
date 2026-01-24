"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "../app/logo.svg";

const PayBadge = () => (
  <span className="ml-1 text-xs font-semibold text-pink-400">– PAY</span>
);

export default function Sidebar({ creators, onClose }) {
  const premiumCreators = creators
    .filter((creator) => creator.premium)
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));

  const topCreators = creators.filter(
    (creator) => !creator.premium && creator.urlHandle && !creator.secret,
  );

  const handleClick = (e, creator) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    const url = creator?.urlHandle || creator?.url || "#";

    try {
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "creator_click", {
          event_category: "Creators",
          event_label: creator?.name,
          value: url,
          transport_type: "beacon",
        });
      }
    } catch {}

    setTimeout(() => {
      if (url && url !== "#") window.location.href = url;
      if (onClose) onClose(); // 👈 NEW
    }, 120);
  };

  return (
    <aside className="bg-gray-900 text-white flex flex-col fixed inset-y-0 left-0 z-40 w-64 h-dvh overflow-hidden sm:sticky sm:top-0 px-4 pt-1 sm:pt-2">
      {/* Logo */}
      <Link
        href="/"
        onClick={onClose}
        className="flex items-center justify-center mb-3"
      >
        <Image src={logo} alt="App Logo" width={96} height={96} />
      </Link>

      {/* Scrollable creators */}
      <div className="flex-1 overflow-y-auto pr-1">
        {/* Featured Creators */}
        <div className="mb-2">
          <h2 className="text-lg font-semibold mb-1">Featured Creators</h2>

          {premiumCreators.length ? (
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
                    <span className="flex items-center">
                      {creator.name}
                      {creator.pay && <PayBadge />}
                    </span>
                  </a>

                  <span>
                    {creator.icon === "fire" ? (
                      <span className="text-orange-500 text-xl animate-flicker">
                        🔥
                      </span>
                    ) : creator.icon === "devil" ? (
                      <span className="text-red-600 text-lg animate-pulse">
                        😈
                      </span>
                    ) : creator.icon === "main-duo" ? (
                      <div className="flex gap-1">
                        <span className="animate-spin-slow">❄️</span>
                        <span className="text-pink-400 text-lg animate-bounce">
                          🐰
                        </span>
                      </div>
                    ) : creator.icon === "bowing-man" ? (
                      <span className="text-2xl animate-bow">🙇🏿‍♂️</span>
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
                    ) : creator.icon === "fox" ? (
                      <span className="text-orange-400 text-xl animate-fox inline-block">
                        🦊
                      </span>
                    ) : creator.icon === "peach-queen" ? (
                      <div className="flex gap-1 items-center">
                        <span className="text-pink-400 text-xl animate-kiss inline-block">
                          🍑
                        </span>
                        <span className="text-yellow-300 text-xl animate-shimmer inline-block">
                          👑
                        </span>
                      </div>
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
          {topCreators.length ? (
            <ul className="space-y-2">
              {topCreators.map((creator) => (
                <li key={creator._id}>
                  <a
                    href={creator.urlHandle}
                    onClick={(e) => handleClick(e, creator)}
                    className="block text-sm text-gray-300 hover:text-yellow-400 transition-colors"
                  >
                    <span className="flex items-center">
                      {creator.name}
                      {creator.pay && <PayBadge />}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm mt-2">No top creators yet.</p>
          )}
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="shrink-0 mt-3 mb-4 space-y-3">
        <Link href="/upload">
          <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded flex items-center justify-center gap-2 shadow-md">
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

        <Link href="/support" onClick={onClose}>
          <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded flex items-center justify-center gap-2 shadow-md">
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
                d="M18.364 5.636l-1.414 1.414A7.962 7.962 0 0112 5a7.962 7.962 0 01-4.95 2.05L5.636 5.636A9.953 9.953 0 0012 3a9.953 9.953 0 006.364 2.636zM12 13v2m0 4h.01"
              />
            </svg>
            Support
          </button>
        </Link>
      </div>

      {/* Animations */}
      <style jsx>{`
        .animate-gradient-x {
          background-size: 200% auto;
          animation: gradient-x 3s linear infinite;
        }
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
        .animate-fox {
          animation: fox-pulse 2.1s ease-in-out infinite;
        }

        @keyframes fox-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.18);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-bow {
          animation: bow 2.5s ease-in-out infinite;
          transform-origin: bottom center;
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

        .animate-flicker {
          animation: flicker 1s infinite ease-in-out;
        }
        @keyframes flicker {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.75;
            transform: scale(1.1);
          }
        }

        .animate-cherry {
          animation: cherry-pulse 1.8s ease-in-out infinite;
        }
        @keyframes cherry-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
        }

        .animate-princess {
          animation: princess-glow 2.2s ease-in-out infinite;
        }
        @keyframes princess-glow {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }

        .animate-kiss {
          animation: kiss-pulse 1.9s ease-in-out infinite;
        }
        @keyframes kiss-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.25);
          }
        }
      `}</style>
    </aside>
  );
}
