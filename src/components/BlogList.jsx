'use client';

export default function BlogList({ posts }) {
  return (
    <div className="grid gap-6">
      {posts.map((post) => (
        <div key={post._id} className="border p-4 rounded shadow bg-white">
          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt={post.title}
className="w-full h-48 object-cover object-center rounded mb-3"            />
          )}
          <h2 className="text-xl font-semibold">{post.title}</h2>
          <p className="mt-2 line-clamp-3 text-gray-800">{post.content}</p>
          <a href={`/blog/${post.slug}`} className="text-blue-600 mt-2 inline-block">
            Read more →
          </a>
        </div>
      ))}
    </div>
  );
}
