import { connectToDB } from "../../../lib/mongodb";
import categories from "../../../models/categories.js";
import { NextResponse } from "next/server";

export async function GET() {
  await connectToDB();

  const category = await categories.find().sort({ name: 1 });

  return NextResponse.json(category);
}

export async function POST(req) {
  await connectToDB();
  const body = await req.json();

  const newCategory = await categories.create({ name: body.name });
  return NextResponse.json(newCategory);
}
