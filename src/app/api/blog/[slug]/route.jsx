import { connectToDB } from "../../../../lib/mongodb";
import Blog from "../../../../models/blogs";

export async function GET(_, { params }) {
  await connectToDB();
  const post = await Blog.findOne({ slug: params.slug });

  if (!post) return new Response("Not found", { status: 404 });

  return Response.json(post);
}
