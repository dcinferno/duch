import { connectToDB } from "@/lib/mongodb";
import Creators from "@/models/creators";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default async function sitemap() {
  await connectToDB();

  const creators = await Creators.find(
    { urlHandle: { $exists: true, $ne: null } },
    { urlHandle: 1, _id: 0 }
  ).lean();

  const creatorEntries = creators.map((c) => ({
    url: `${BASE_URL}/${c.urlHandle}`,
  }));

  return [
    { url: BASE_URL },
    ...creatorEntries,
  ];
}
