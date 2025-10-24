// app/api/pushrVideos/route.js
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      `${process.env.PUSHR_BASE_URL}/v1/buckets/${process.env.PUSHR_BUCKET_ID}/files`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PUSHR_API_KEY}`,
        },
      },
    );

    if (!res.ok) {
      throw new Error("Failed to fetch files from Pushr");
    }

    const data = await res.json();

    // Transform data to match your Videos schema
    const videos = data.map((file) => ({
      title: file.metadata?.title || file.name,
      description: file.metadata?.description || "",
      url: file.download_url, // S3/Pushr direct link
      previewUrl: file.preview_url, // if Pushr generates previews
      thumbnail: file.thumbnail_url || "/default-thumbnail.png",
      price: 0, // videos not sold on-site
      creatorName: file.metadata?.creatorName || "Unknown",
      socialMediaUrl: file.metadata?.creatorUrl || "#",
    }));

    return NextResponse.json(videos);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not fetch videos from Pushr" },
      { status: 500 },
    );
  }
}
