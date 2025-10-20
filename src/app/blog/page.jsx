export const dynamic = 'force-dynamic'; // make it dynamic (for DB fetch)

import BlogList from '../../components/BlogList';
import { connectToDB } from '../../lib/mongodb';
import Blog from '../../models/blogs';

export default async function BlogPage() {
  await connectToDB();
  const posts = await Blog.find().sort({ publishedAt: -1 }).lean();

  const safePosts = posts.map((post) => ({
    ...post,
    _id: post._id.toString(),
    publishedAt: post.publishedAt.toISOString(),
  }));

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Blog Posts</h1>
      <BlogList posts={safePosts} />
    </div>
  );
}
