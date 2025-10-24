import { connectToDB } from "../../../lib/mongodb";
import Creators from "../../../models/creators";
import { NextResponse } from "next/server";

// GET /api/creators
export async function GET() {
  await connectToDB();

  try {
    const creators = await Creators.find({});
    return NextResponse.json(creators);
  } catch (error) {
    console.error("Failed to fetch creators:", error);
    return NextResponse.json(
      { error: "Failed to fetch creators" },
      { status: 500 },
    );
  }
}

// POST /api/creators
export async function POST(req) {
  await connectToDB();
  const body = await req.json();

  try {
    const newCreator = await Creators.create(body);
    return NextResponse.json(newCreator);
  } catch (error) {
    console.error("Failed to create creator:", error);
    return NextResponse.json(
      { error: "Failed to create creator" },
      { status: 500 },
    );
  }
}
