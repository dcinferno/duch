import { connectToDB } from "../../../../lib/mongodb"; // your MongoDB connection helper
import SiteSetting from "../../../../models/siteSettings";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    await connectToDB(); // ensure MongoDB is connected
    const setting = await SiteSetting.findById(id).lean();

    if (!setting) {
      return new Response(JSON.stringify({ error: "Setting not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(setting), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
