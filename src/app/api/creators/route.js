import { connectToDB } from "../../../lib/mongodb";
import Creators from "../../../models/creators";
import { NextResponse } from "next/server";

// GET /api/creators
export async function GET() {
  await connectToDB();

  try {
    const CDN = process.env.CDN_URL;
    const creators = await Creators.find({});

    // 🔥 Prepend CDN to creator.photo if it's a relative path
    const formatted = creators.map((creator) => {
      const c = creator.toObject();

      if (typeof c.photo === "string" && c.photo.startsWith("/")) {
        c.photo = CDN + c.photo;
      }

      return c;
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch creators:", error);
    return NextResponse.json(
      { error: "Failed to fetch creators" },
      { status: 500 }
    );
  }
}

// POST /api/creators
export async function POST(req) {
  await connectToDB();
  const body = await req.json();

  try {
    // Trim strings
    body.name = body.name?.trim();
    body.url = body.url?.trim();
    body.urlHandle = body.urlHandle?.trim();

    // Validation
    if (!body.name || !body.url) {
      return NextResponse.json(
        { error: "Name and URL are required" },
        { status: 400 }
      );
    }

    // Prevent duplicate urlHandle if provided
    if (body.urlHandle) {
      const existing = await Creators.findOne({ urlHandle: body.urlHandle });
      if (existing) {
        return NextResponse.json(
          { error: "This handle is already in use" },
          { status: 400 }
        );
      }
    }

    // Create new creator
    const newCreator = await Creators.create({
      name: body.name,
      url: body.url,
      urlHandle: body.urlHandle || "",
      premium: body.premium ?? false,
      secret: body.secret ?? false,
      photo: body.photo || "",
      createdAt: new Date(),
    });

    return NextResponse.json(newCreator);
  } catch (error) {
    console.error("Failed to create creator:", error);
    return NextResponse.json(
      { error: "Failed to create creator" },
      { status: 500 }
    );
  }
}
