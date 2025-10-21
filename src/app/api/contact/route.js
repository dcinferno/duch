// pages/api/contact.js
import { connectToDB } from "../../../lib/mongodb";
import Contact from "../../../models/contacts";
import { NextResponse } from "next/server";
// GET /api/contact
export async function GET() {
  await connectToDB();

  try {
    const contacts = await Contact.find({});
    return NextResponse.json(contacts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

// POST support (optional for admin)
export async function POST(req) {
  await connectToDB();
  const body = await req.json();

  try {
    const newContact = await Contact.create(body);
    return NextResponse.json(newContact);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
