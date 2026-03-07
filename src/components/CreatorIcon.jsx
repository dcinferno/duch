"use client";

export default function CreatorIcon({ icon }) {
  const renderIcon = () => {
    switch (icon) {
      case "arrow-heart":
        return (
          <span className="text-orange-500 text-xl animate-flicker">💘</span>
        );
      case "devil":
        return (
          <span className="text-red-600 text-lg animate-pulse">😈</span>
        );
      case "main-duo":
        return (
          <div className="flex gap-1">
            <span className="animate-spin-slow">❄️</span>
            <span className="text-pink-400 text-lg animate-bounce">🐰</span>
          </div>
        );
      case "bowing-man":
        return <span className="text-2xl animate-bow">🙇🏿‍♂️</span>;
      case "cherry":
        return (
          <span className="text-red-500 text-lg animate-cherry inline-block">
            🍒
          </span>
        );
      case "princess":
        return (
          <span className="text-pink-300 text-2xl animate-princess inline-block">
            🧝🏻‍♀️
          </span>
        );
      case "crown":
        return (
          <span className="text-yellow-300 text-2xl animate-shimmer inline-block">
            👑
          </span>
        );
      case "honey":
        return (
          <span className="text-yellow-400 text-xl animate-honey inline-block">
            🍯
          </span>
        );
      case "fire":
        return (
          <span className="text-orange-500 text-xl animate-fire inline-block">
            🔥
          </span>
        );
      case "fox":
        return (
          <span className="text-orange-400 text-xl animate-fox inline-block">
            🦊
          </span>
        );
      case "hot":
        return (
          <span className="text-red-400 text-xl animate-hot inline-block">
            🥵
          </span>
        );
      case "peach-queen":
        return (
          <div className="flex gap-1 items-center">
            <span className="text-pink-400 text-xl animate-kiss inline-block">
              🍑
            </span>
            <span className="text-yellow-300 text-xl animate-shimmer inline-block">
              👑
            </span>
          </div>
        );
      default:
        return (
          <span className="text-yellow-400 text-lg animate-pulse inline-block">
            ⭐
          </span>
        );
    }
  };

  return (
    <>
      {renderIcon()}
      <style jsx global>{`
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

        .animate-honey {
          animation: honey-pulse 2s ease-in-out infinite;
        }
        @keyframes honey-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }

        .animate-fire {
          animation: fire-pulse 1.2s ease-in-out infinite;
        }
        @keyframes fire-pulse {
          0%,
          100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.25);
            filter: brightness(1.3);
          }
        }

        .animate-hot {
          animation: hot-pulse 1.5s ease-in-out infinite;
        }
        @keyframes hot-pulse {
          0%,
          100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.2);
            filter: brightness(1.2) saturate(1.4);
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
    </>
  );
}
