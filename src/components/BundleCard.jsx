"use client";

export default function BundleCard({ bundle, onBuy }) {
  return (
    <div className="rounded-2xl border border-zinc-300 overflow-hidden bg-zinc-600">
      {/* HEADER */}
      <div className="px-5 py-4 bg-zinc-600">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white break-words">
              {bundle.name}
            </h3>
            <p className="text-sm text-zinc-100 mt-0.5">
              {bundle.videoCount} videos included
            </p>
          </div>

          <span className="shrink-0 text-xs font-semibold text-purple-100 bg-purple-700/80 px-2 py-0.5 rounded-full">
            BUNDLE
          </span>
        </div>
      </div>

      {/* BODY */}
      <div className="px-5 py-4 bg-zinc-600">
        <ul className="space-y-1.5 text-sm text-white">
          {bundle.videos.map((video) => (
            <li key={video._id} className="break-words line-clamp-2">
              • {video.title}
            </li>
          ))}
        </ul>
      </div>

      {/* FOOTER */}
      <div className="px-5 py-4 bg-zinc-600 flex items-center justify-center">
        <button
          onClick={onBuy}
          className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-base font-semibold"
        >
          Pay ${Number(bundle.price).toFixed(2)}
        </button>
      </div>
    </div>
  );
}
