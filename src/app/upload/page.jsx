"use client";

import { useState, useEffect, useRef } from "react";

/* ---------------------------------
   Helpers
--------------------------------- */
function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

function generateFullVideoFileName(title, creatorName, file) {
  const creatorSlug = slugify(creatorName);
  const titleSlug = slugify(title);
  const ext = file?.name?.split(".").pop() || "mp4";
  return `${creatorSlug}/${titleSlug}-${Date.now()}.${ext}`;
}

/* ---------------------------------
   Component
--------------------------------- */
export default function UploadPage() {
  // --- State ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(null);
  const [creatorName, setCreatorName] = useState("");
  const [socialMediaUrl, setSocialMediaUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null); // preview
  const [fullVideoFile, setFullVideoFile] = useState(null); // full
  const [videoProgress, setVideoProgress] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [fullProgress, setFullProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [creators, setCreators] = useState([]);
  const [secretKey, setSecretKey] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [fullKey, setFullKey] = useState(null); // ✅ REQUIRED
  const [successMessage, setSuccessMessage] = useState("");
  const [tags, setTags] = useState("");
  const [customThumbnailFile, setCustomThumbnailFile] = useState(null);

  const videoInputRef = useRef(null);
  const fullVideoInputRef = useRef(null);
  const customThumbnailInputRef = useRef(null);

  /* ---------------------------------
     Fetch creators
  --------------------------------- */
  useEffect(() => {
    fetch("/api/creators")
      .then((r) => r.json())
      .then(setCreators)
      .catch(console.error);
  }, []);

  /* ---------------------------------
     Generate thumbnail
  --------------------------------- */
  const generateThumbnail = (file) =>
    new Promise((resolve, reject) => {
      if (!file) return reject(new Error("No video file"));

      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.currentTime = 3;

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        canvas
          .getContext("2d")
          .drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(
                  new File([blob], "thumbnail.jpg", {
                    type: "image/jpeg",
                  })
                )
              : reject(new Error("Thumbnail generation failed")),
          "image/jpeg"
        );
      };

      video.onerror = reject;
    });

  /* ---------------------------------
     Upload → PUSHR (preview + thumb)
  --------------------------------- */
  const uploadToPushr = async (file, folder, setProgress) => {
    if (!file) throw new Error("Missing file");

    const res = await fetch("/api/uploadUrl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        fileName: file.name,
        contentType: file.type,
        folder,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.uploadUrl) {
      throw new Error(data?.error || "Pushr init failed");
    }

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) =>
        e.lengthComputable &&
        typeof setProgress === "function" &&
        setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () =>
        xhr.status < 300 ? resolve() : reject(xhr.responseText);
      xhr.onerror = reject;
      xhr.open("PUT", data.uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });

    return data.publicUrl;
  };

  /* ---------------------------------
     Upload → Bunny (full video)
  --------------------------------- */
  const uploadToBunny = async (file, fullPath) => {
    if (!file) throw new Error("Missing full video file");

    const res = await fetch("/api/bunny-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        fileName: fullPath,
        contentType: file.type,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.uploadUrl) {
      throw new Error(data?.error || "Bunny init failed");
    }

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) =>
        e.lengthComputable &&
        setFullProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () =>
        xhr.status < 300 ? resolve() : reject(xhr.responseText);
      xhr.onerror = reject;
      xhr.open("PUT", data.uploadUrl);
      Object.entries(data.headers || {}).forEach(([k, v]) =>
        xhr.setRequestHeader(k, v)
      );
      xhr.send(file);
    });

    return data.key;
  };

  /* ---------------------------------
     Submit
  --------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile || !creatorName || !secretKey) return;

    setSubmitting(true);

    try {
      const creator = creators.find((c) => c.name === creatorName);
      const slug = slugify(creatorName);

      const thumbFile =
        customThumbnailFile || (await generateThumbnail(videoFile));

      const thumbUrl = await uploadToPushr(
        thumbFile,
        `${slug}/thumbnails`,
        setThumbnailProgress
      );
      setThumbnailUrl(thumbUrl);

      const previewUrl = await uploadToPushr(
        videoFile,
        `${slug}/videos`,
        setVideoProgress
      );
      setVideoUrl(previewUrl);

      let fullKeyValue = null;
      if (creator?.pay && fullVideoFile) {
        const fullPath = generateFullVideoFileName(
          title,
          creatorName,
          fullVideoFile
        );
        fullKeyValue = await uploadToBunny(fullVideoFile, fullPath);
        setFullKey(fullKeyValue);
      }

      await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price,
          creatorName,
          socialMediaUrl: socialMediaUrl || creator?.url || "",
          thumbnail: thumbUrl,
          url: previewUrl,
          fullKey: fullKeyValue,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      setSuccessMessage("✅ Upload successful!");
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed — see console");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------------
     UI
  --------------------------------- */
  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        <input
          type="number"
          placeholder="Price"
          value={price ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setPrice(val === "" ? null : Number(val));
          }}
          className="w-full p-3 border rounded"
          min={0}
        />

        <select
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
          className="w-full p-3 border rounded"
          required
        >
          <option value="">Select creator</option>
          {creators.map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value.toLowerCase())}
          className="w-full p-3 border rounded"
        />

        {/* Preview */}
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 transition"
        >
          {videoFile ? videoFile.name : "Select Preview Video"}
        </button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => setVideoFile(e.target.files[0] || null)}
        />

        {/* Full */}
        <button
          type="button"
          onClick={() => fullVideoInputRef.current?.click()}
          className="w-full bg-purple-600 text-white py-3 rounded hover:bg-purple-700 transition"
        >
          {fullVideoFile ? fullVideoFile.name : "Upload Full Video (Optional)"}
        </button>
        <input
          ref={fullVideoInputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => setFullVideoFile(e.target.files[0] || null)}
        />

        {/* Thumbnail */}
        <button
          type="button"
          onClick={() => customThumbnailInputRef.current?.click()}
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition"
        >
          {customThumbnailFile
            ? customThumbnailFile.name
            : "Upload Thumbnail (Optional)"}
        </button>
        <input
          ref={customThumbnailInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setCustomThumbnailFile(e.target.files[0] || null)}
        />

        {/* Progress Bars */}
        {thumbnailProgress > 0 && (
          <div className="w-full bg-gray-200 h-2 rounded">
            <div
              className="bg-blue-600 h-2"
              style={{ width: `${thumbnailProgress}%` }}
            />
          </div>
        )}

        {videoProgress > 0 && (
          <div className="w-full bg-gray-200 h-2 rounded">
            <div
              className="bg-green-600 h-2"
              style={{ width: `${videoProgress}%` }}
            />
          </div>
        )}

        {fullProgress > 0 && (
          <div className="w-full bg-gray-200 h-2 rounded">
            <div
              className="bg-purple-600 h-2"
              style={{ width: `${fullProgress}%` }}
            />
          </div>
        )}

        {thumbnailUrl && (
          <p className="text-sm break-all">
            <strong>Thumbnail:</strong>{" "}
            <a
              href={thumbnailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 underline"
            >
              {thumbnailUrl}
            </a>
          </p>
        )}

        {videoUrl && (
          <p className="text-sm break-all">
            <strong>Preview:</strong>{" "}
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 underline"
            >
              {videoUrl}
            </a>
          </p>
        )}

        {typeof fullKey === "string" && (
          <p className="text-sm break-all">
            <strong>Full Video Key:</strong>{" "}
            <span className="font-mono">{fullKey}</span>
          </p>
        )}

        <input
          type="text"
          placeholder="Secret Key"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 transition"
        >
          {submitting ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
