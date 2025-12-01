"use client";

import { useState, useEffect, useRef } from "react";

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

export default function UploadPage() {
  // --- State ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [creatorName, setCreatorName] = useState("");
  const [socialMediaUrl, setSocialMediaUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [creators, setCreators] = useState([]);
  const [secretKey, setSecretKey] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [tags, setTags] = useState("");
  const [customThumbnailFile, setCustomThumbnailFile] = useState(null); // 🆕 NEW

  const videoInputRef = useRef(null);
  const customThumbnailInputRef = useRef(null); // 🆕 NEW

  // --- Fetch creators ---
  useEffect(() => {
    async function fetchCreators() {
      try {
        const res = await fetch("/api/creators");
        const data = await res.json();
        setCreators(data);
      } catch (err) {
        console.error("Failed to fetch creators:", err);
      }
    }
    fetchCreators();
  }, []);

  // --- Generate thumbnail from video ---
  const generateThumbnail = (file) =>
    new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.currentTime = 3;

      video.onloadeddata = () => {
        video.currentTime = 3;
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) =>
            resolve(new File([blob], "thumbnail.jpg", { type: "image/jpeg" })),
          "image/jpeg"
        );
      };

      video.onerror = (err) => reject(err);
    });

  // --- Upload to S3 presigned URL ---
  const handleUploadFile = async (file, folder, setProgress) => {
    if (!file) throw new Error("No file provided");

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

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to get upload URL: ${res.status} - ${text}`);
    }

    const { uploadUrl, publicUrl, key } = await res.json();

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`)
          );
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });

    return { publicUrl, key };
  };

  // --- Reset form ---
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice(0);
    setCreatorName("");
    setSocialMediaUrl("");
    setVideoFile(null);
    setCustomThumbnailFile(null); // 🆕 RESET
    setVideoProgress(0);
    setThumbnailProgress(0);
    setVideoUrl(null);
    setThumbnailUrl(null);
    setSecretKey("");
    setTags("");
    setSuccessMessage("");

    if (videoInputRef.current) videoInputRef.current.value = "";
    if (customThumbnailInputRef.current)
      customThumbnailInputRef.current.value = ""; // 🆕 RESET
  };

  // --- Submit handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!videoFile) return alert("Select a video!");
    if (!creatorName) return alert("Select a creator!");
    if (!secretKey) return alert("Enter secret key!");

    setSubmitting(true);
    try {
      const folderSlug = slugify(creatorName);

      // 1️⃣ Custom thumbnail OR generated thumbnail
      let thumbFile;
      if (customThumbnailFile) {
        thumbFile = customThumbnailFile;
      } else {
        thumbFile = await generateThumbnail(videoFile);
      }

      const uploadedThumbnail = await handleUploadFile(
        thumbFile,
        `${folderSlug}/thumbnails`,
        setThumbnailProgress
      );
      setThumbnailUrl(uploadedThumbnail.publicUrl);

      // 2️⃣ Upload video
      const uploadedVideo = await handleUploadFile(
        videoFile,
        `${folderSlug}/videos`,
        setVideoProgress
      );
      setVideoUrl(uploadedVideo.publicUrl);

      // 3️⃣ Derive social media URL
      const socialUrl =
        socialMediaUrl ||
        creators.find((c) => c.name === creatorName)?.socialMediaUrl;

      // 4️⃣ Parse tags
      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // 5️⃣ Save metadata
      await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price,
          creatorName,
          socialMediaUrl: socialUrl,
          thumbnail: uploadedThumbnail.publicUrl,
          url: uploadedVideo.publicUrl,
          tags: tagArray,
        }),
      });

      setSuccessMessage("✅ Upload successful!");
      resetForm();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("❌ Upload failed — see console for details");
    } finally {
      setSubmitting(false);
    }
  };

  // --- UI ---
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
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full p-3 border rounded"
          min={0}
        />

        {/* Creator Dropdown */}
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

        {/* Tags Input */}
        <input
          type="text"
          placeholder="Enter tags separated by commas"
          value={tags}
          onChange={(e) => setTags(e.target.value.toLowerCase())}
          className="w-full p-3 border rounded"
        />

        {/* Select Video Button */}
        <div className="mb-4">
          <span className="block mb-1 font-medium">Select Video</span>
          <input
            type="file"
            accept="video/*"
            ref={videoInputRef}
            onChange={(e) => setVideoFile(e.target.files[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="w-full bg-green-600 text-white py-3 rounded text-center hover:bg-green-700 transition"
          >
            {videoFile ? videoFile.name : "Select Video"}
          </button>
        </div>

        {/* Optional Thumbnail Upload */}
        <div className="mb-4">
          <span className="block mb-1 font-medium">Thumbnail (Optional)</span>

          <input
            type="file"
            accept="image/*"
            ref={customThumbnailInputRef}
            className="hidden"
            onChange={(e) => setCustomThumbnailFile(e.target.files[0])}
          />

          <button
            type="button"
            onClick={() => customThumbnailInputRef.current?.click()}
            className="w-full bg-green-600 text-white py-3 rounded text-center hover:bg-blue-700 transition"
          >
            {customThumbnailFile
              ? customThumbnailFile.name
              : "Upload Thumbnail (Optional)"}
          </button>

          {customThumbnailFile && (
            <p className="text-sm mt-2 text-green-700">
              Custom thumbnail selected — automatic screenshot disabled.
            </p>
          )}
        </div>

        {/* Progress bars */}
        {thumbnailProgress > 0 && (
          <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
            <div
              className="bg-green-600 h-2 rounded"
              style={{ width: `${thumbnailProgress}%` }}
            />
          </div>
        )}

        {videoProgress > 0 && (
          <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
            <div
              className="bg-green-600 h-2 rounded"
              style={{ width: `${videoProgress}%` }}
            />
          </div>
        )}

        {/* URLs */}
        {thumbnailUrl && (
          <p className="text-sm text-gray-700 break-all">
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
          <p className="text-sm text-gray-700 break-all">
            <strong>Video:</strong>{" "}
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
