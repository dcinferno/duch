// app/api/videos/route.js
import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";
import Creators from "../../../models/creators.js"; // <-- import your Creator model

export async function GET() {
  try {
    await connectToDB();
    const videos = await Videos.find({}).sort({ createdAt: -1 }); // newest first
    return Response.json(videos);
  } catch (err) {
    console.error("Failed to fetch videos:", err);
    return Response.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectToDB();
    const { title, description, thumbnail, price, creatorName, url } =
      await request.json();

    // Fetch the creator's socialMediaUrl automatically
    const creator = await Creators.findOne({ name: creatorName });

    if (!creator) {
      return Response.json({ error: "Creator not found" }, { status: 400 });
    }

    const socialMediaUrl = creator.socialMediaUrl;

    // Create video record
    const video = await Videos.create({
      title,
      description,
      thumbnail,
      price,
      creatorName,
      socialMediaUrl, // pulled from creator
      url,
    });

    return Response.json(video, { status: 201 });
  } catch (err) {
    console.error("Failed to create video:", err);
    return Response.json({ error: "Failed to create video" }, { status: 500 });
  }
}
