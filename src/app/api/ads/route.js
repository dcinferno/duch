// app/api/ads/route.js
import mongoose from "mongoose";
import Ads from "../../../models/ads";

const MONGO_URI = process.env.MONGO_URI;

async function connectToDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
}

export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const creatorNameParam = url.searchParams.get("creatorName"); // optional

    const pipeline = [
      {
        $lookup: {
          from: "creators", // must match the actual collection name
          localField: "creatorName",
          foreignField: "name",
          as: "creatorInfo",
        },
      },
      { $unwind: "$creatorInfo" },
      {
        $match: {
          $or: [
            creatorNameParam ? { "creatorInfo.name": creatorNameParam } : {},
            { "creatorInfo.premium": false },
          ],
        },
      },
      {
        $project: {
          title: 1,
          url: 1,
          creatorName: 1,
          creatorInfo: { name: 1, premium: 1, url: 1 },
        },
      },
    ];

    const ads = await Ads.aggregate(pipeline);

    return new Response(JSON.stringify({ ads }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Failed to fetch ads:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch ads" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}
