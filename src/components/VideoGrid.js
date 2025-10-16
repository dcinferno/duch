export default function VideoGrid({ videos }) {
  if (!videos.length) return <p>No videos found.</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {videos.map((video) => (
        <div key={video._id} className="rounded shadow overflow-hidden">
          <img
            src={video.thumbnail || "/placeholders/thumbnail.jpg"}
            alt={video.title}
            className="w-full h-48 object-cover"
          />
          <div className="p-2">
            <h2 className="text-sm font-semibold">{video.title}</h2>
            <h3 className="text-sm">{video.category}</h3>
            {video.price !== undefined && (
              <p className="text-xs text-green-600 font-semibold">
                ${video.price.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
