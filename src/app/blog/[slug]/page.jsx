import { connectToDB } from "../../../lib/mongodb";
import Blog from "../../../models/blogs";

export const dynamic = "force-dynamic";

export default async function BlogPostPage(props) {
  const { params } = await props; // await here

  const { slug } = await params;

  await connectToDB();
  const post = await Blog.findOne({ slug }).lean();

  if (!post) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">Post Not Found</h1>
        <p>The blog post you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt={post.title}
          className="w-full h-auto mb-6 rounded"
        />
      )}
      <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
        {post.content}
      </div>
      <p className="mt-6 text-sm text-gray-500">
        Published: {new Date(post.publishedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
