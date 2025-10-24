import { connectToDB } from "../../../../lib/mongodb";
import Blog from "../../../../models/blogs";

// GET /api/blog/[slug]
export async function GET(_, { params }) {
  await connectToDB();
  const post = await Blog.findOne({ slug: params.slug });

  if (!post) return new Response("Not found", { status: 404 });

  return Response.json(post);
}

// PUT /api/blog/[slug]
export async function PUT(request, { params }) {
  await connectToDB();

  const { slug } = await params;
  const data = await request.json();

  try {
    const updatedPost = await Blog.findOneAndUpdate({ slug }, data, {
      new: true,
    });

    if (!updatedPost) {
      return new Response("Post not found", { status: 404 });
    }

    return Response.json(updatedPost);
  } catch (error) {
    return new Response("Failed to update post", { status: 500 });
  }
}

// DELETE /api/blog/[slug]
export async function DELETE(_, { params }) {
  await connectToDB();
  const { slug } = await params;
  try {
    const deletedPost = await Blog.findOneAndDelete({ slug });

    if (!deletedPost) {
      return new Response("Post not found", { status: 404 });
    }

    return new Response("Post deleted", { status: 200 });
  } catch (error) {
    return new Response("Failed to delete post", { status: 500 });
  }
}
