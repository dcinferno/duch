"use client";

import { useState, useEffect, useRef } from "react";

// Slugify helper
function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // replace spaces with dashes
    .replace(/[^\w-]/g, ""); // remove invalid chars
}

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [creatorName, setCreatorName] = useState("");
  const [socialMediaUrl, setSocialMediaUrl] = useState(""); // optional if fetching from creator
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [secretKey, setSecretKey] = useState("");
  const [videoProgress, setVideoProgress] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [creators, setCreators] = useState([]);

  const videoInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  useEffect(() => {
    async function fetchCreators() {
      try {
        const res = await fetch("/api/creators");
        const data = await res.json();
        setCreators(data);
      } catch (err) {
        console.error("Failed to load creators:", err);
      }
    }
    fetchCreators();
  }, []);

  // Upload helper with folder prepending
  const handleUploadFile = async (file, folder, setProgress) => {
    const res = await fetch("/api/uploadUrl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        fileName: `${folder}/${file.name}`,
        contentType: file.type,
      }),
    });

    if (!res.ok) throw new Error("Failed to get upload URL");
    const { url } = await res.json();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setProgress(percent);
        }
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(file.name);
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));

      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!videoFile) return alert("Please select a video file!");
    if (!creatorName) return alert("Please select your creator account!");
    if (!secretKey) return alert("Please enter the secret key!");

    setSubmitting(true);

    try {
      // Slugify the creator name for folder
      const folderSlug = slugify(creatorName);

      if (thumbnailFile) {
        await handleUploadFile(
          thumbnailFile,
          `${folderSlug}/thumbnails`,
          setThumbnailProgress
        );
      }
      await handleUploadFile(
        videoFile,
        `${folderSlug}/videos`,
        setVideoProgress
      );

      // Send metadata to videos API
      const socialUrl =
        socialMediaUrl ||
        creators.find((c) => c.name === creatorName)?.socialMediaUrl;

      const videoRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price,
          creatorName,
          socialMediaUrl: socialUrl,
          thumbnail: thumbnailFile?.name
            ? `${folderSlug}/thumbnails/${thumbnailFile.name}`
            : null,
          url: `${folderSlug}/videos/${videoFile.name}`,
        }),
      });

      if (!videoRes.ok) throw new Error("Failed to create video record");

      alert("✅ Upload successful!");

      // Reset form
      setTitle("");
      setDescription("");
      setPrice(0);
      setCreatorName("");
      setSocialMediaUrl("");
      setVideoFile(null);
      setThumbnailFile(null);
      setSecretKey("");
      setVideoProgress(0);
      setThumbnailProgress(0);
    } catch (err) {
      console.error(err);
      alert("❌ Upload failed. See console for details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />
        {/* Description */}
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />
        {/* Price */}
        <input
          type="number"
          placeholder="Video Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full p-3 border rounded"
          min={0}
        />
        {/* Creator */}
        <select
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
          className="w-full p-3 border rounded"
          required
        >
          <option value="">Select your creator account</option>
          {creators.map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Optional social media URL */}
        <input
          type="text"
          placeholder="Social Media URL (optional)"
          value={socialMediaUrl}
          onChange={(e) => setSocialMediaUrl(e.target.value)}
          className="w-full p-3 border rounded mb-4"
        />

        {/* Video and Thumbnail File Inputs */}
        <label className="w-full block mb-4 relative cursor-pointer">
          <span className="block mb-1 font-medium">Select Video</span>
          <input
            type="file"
            accept="video/*"
            ref={videoInputRef}
            onChange={(e) => setVideoFile(e.target.files[0])}
            style={{
              opacity: 0,
              position: "absolute",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              cursor: "pointer",
            }}
          />
          <div className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded text-center shadow-md hover:shadow-lg">
            {videoFile ? videoFile.name : "Select Video"}
          </div>
        </label>

        {videoProgress > 0 && (
          <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
            <div
              className="bg-green-600 h-2 rounded"
              style={{ width: `${videoProgress}%` }}
            />
          </div>
        )}

        <label className="w-full block mb-4 relative cursor-pointer">
          <span className="block mb-1 font-medium">Thumbnail (optional)</span>
          <input
            type="file"
            accept="image/*"
            ref={thumbInputRef}
            onChange={(e) => setThumbnailFile(e.target.files[0])}
            style={{
              opacity: 0,
              position: "absolute",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              cursor: "pointer",
            }}
          />
          <div className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded text-center shadow-md hover:shadow-lg">
            {thumbnailFile ? thumbnailFile.name : "Select Thumbnail"}
          </div>
        </label>

        {thumbnailProgress > 0 && (
          <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
            <div
              className="bg-green-600 h-2 rounded"
              style={{ width: `${thumbnailProgress}%` }}
            />
          </div>
        )}

        {/* Secret Key */}
        <input
          type="text"
          placeholder="Enter Secret Key"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          required
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          {submitting ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
