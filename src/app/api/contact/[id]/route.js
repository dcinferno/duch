import { connectToDB } from "../../../../lib/mongodb";
import Contact from "../../../../models/contacts";
import { NextResponse } from "next/server";

// PUT /api/contact/[id]
export async function PUT(request, { params }) {
  await connectToDB();
  const { id } = params;
  const body = await request.json();

  try {
    const updated = await Contact.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

// DELETE /api/contact/[id] (optional)
export async function DELETE(request, { params }) {
  await connectToDB();
  const { id } = params;

  try {
    await Contact.findByIdAndDelete(id);
    return NextResponse.json({ message: "Contact deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
