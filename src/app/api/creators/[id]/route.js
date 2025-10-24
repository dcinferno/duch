import { connectToDB } from "../../../../lib/mongodb";
import Creators from "../../../../models/creators";
import { NextResponse } from "next/server";

// PUT /api/creators/[id]
export async function PUT(request, { params }) {
  await connectToDB();
  const { id } = params;
  const body = await request.json();

  try {
    const updated = await Creators.findByIdAndUpdate(id, body, { new: true });
    if (!updated) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating creator:", error);
    return NextResponse.json(
      { error: "Failed to update creator" },
      { status: 500 }
    );
  }
}

// DELETE /api/creators/[id]
export async function DELETE(request, { params }) {
  await connectToDB();
  const { id } = params;

  try {
    const deleted = await Creators.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Creator deleted successfully" });
  } catch (error) {
    console.error("Error deleting creator:", error);
    return NextResponse.json(
      { error: "Failed to delete creator" },
      { status: 500 }
    );
  }
}
