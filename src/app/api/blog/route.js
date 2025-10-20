import { connectToDB } from "../../../lib/mongodb.js";
import Blog from "../../../models/blogs.js";

export async function GET() {
  await connectToDB();
  const posts = await Blog.find({}).sort({ publishedAt: -1 });
  return Response.json(posts);
}

export async function POST(request) {
  await connectToDB();
  const { title, content, author, tags, imageUrl } = await request.json();

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const post = await Blog.create({
    title,
    slug,
    content,
    author,
    tags,
    imageUrl, // <-- Store it if provided
  });

  return Response.json(post, { status: 201 });
}
