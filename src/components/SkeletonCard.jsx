export default function SkeletonCard() {
  return (
    <div className="bg-gray-900 shadow-lg rounded-xl overflow-hidden flex flex-col animate-pulse">
      {/* Thumbnail placeholder */}
      <div className="w-full h-64 sm:h-72 bg-gray-800" />

      {/* Content placeholder */}
      <div className="p-3 flex flex-col flex-1">
        {/* Title */}
        <div className="h-5 bg-gray-800 rounded w-3/4 mb-2" />
        {/* Date */}
        <div className="h-3 bg-gray-800 rounded w-1/4 mb-3" />
        {/* Description lines */}
        <div className="h-3 bg-gray-800 rounded w-full mb-1.5" />
        <div className="h-3 bg-gray-800 rounded w-5/6 mb-1.5" />
        <div className="h-3 bg-gray-800 rounded w-2/3 mb-3" />
        {/* Views row */}
        <div className="h-3 bg-gray-800 rounded w-1/3 mb-3" />
        {/* Tags */}
        <div className="flex gap-1 mb-3">
          <div className="h-5 bg-gray-800 rounded-full w-14" />
          <div className="h-5 bg-gray-800 rounded-full w-16" />
        </div>
        {/* Creator + price row */}
        <div className="flex justify-between mb-3">
          <div className="h-4 bg-gray-800 rounded w-1/3" />
          <div className="h-4 bg-gray-800 rounded w-1/4" />
        </div>
        {/* Button */}
        <div className="mt-auto">
          <div className="h-9 bg-gray-800 rounded-lg w-full" />
        </div>
      </div>
    </div>
  );
}
