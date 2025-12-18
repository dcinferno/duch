async function bunnyFileExists(zone, fileName) {
  const checkUrl = `https://${zone}.b-cdn.net/${fileName}`;
  const res = await fetch(checkUrl, { method: "HEAD" });
  return res.status === 200;
}

export async function POST(req) {
  try {
    const { fileName, contentType, secret } = await req.json();

    // --------------------------------------------------
    // Basic validation
    // --------------------------------------------------
    if (!fileName || typeof fileName !== "string") {
      return Response.json({ error: "Invalid fileName" }, { status: 400 });
    }

    // --------------------------------------------------
    // Optional secret gate (recommended)
    // --------------------------------------------------
    if (process.env.UPLOAD_SECRET && secret !== process.env.UPLOAD_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const zone = process.env.BUNNY_STORAGE_ZONE;
    const accessKey = process.env.BUNNY_STORAGE_API_KEY;

    if (!zone || !accessKey) {
      console.error("❌ Missing Bunny env vars");
      return Response.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const exists = await bunnyFileExists(zone, fileName);
    if (exists) {
      return Response.json({ error: "File already exists" }, { status: 409 });
    }

    const uploadUrl = `https://storage.bunnycdn.com/${zone}/${fileName}`;

    return Response.json({
      uploadUrl,
      headers: {
        AccessKey: accessKey,
        "Content-Type": contentType || "application/octet-stream",
      },
      publicUrl: `https://${zone}.b-cdn.net/${fileName}`,
      key: fileName,
    });
  } catch (err) {
    console.error("❌ Bunny upload init error:", err);
    return Response.json(
      { error: "Failed to init Bunny upload" },
      { status: 500 }
    );
  }
}
