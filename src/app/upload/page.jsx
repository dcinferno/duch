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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [creatorName, setCreatorName] = useState("");
  const [socialMediaUrl, setSocialMediaUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [processedProgress, setProcessedProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [creators, setCreators] = useState([]);
  const [secretKey, setSecretKey] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);

  const videoInputRef = useRef(null);

  useEffect(() => {
    async function fetchCreators() {
      try {
        const res = await fetch("/api/creators");
        const data = await res.json();
        setCreators(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchCreators();
  }, []);

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

  const handleUploadFile = async (file, folder, setProgress) => {
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

    if (!res.ok) throw new Error("Failed to get upload URL");
    const { uploadUrl, publicUrl, key } = await res.json();

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable)
          setProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Upload failed ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });

    return { publicUrl, key };
  };

  const handleProcessVideo = async (key) => {
    const res = await fetch("/api/processVideo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        key,
      }),
    });

    if (!res.ok) throw new Error("Video processing failed");

    const { processedUrl } = await res.json();
    return processedUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) return alert("Select a video!");
    if (!creatorName) return alert("Select a creator!");
    if (!secretKey) return alert("Enter secret key!");

    setSubmitting(true);
    try {
      const folderSlug = slugify(creatorName);

      // Generate and upload thumbnail
      const thumbFile = await generateThumbnail(videoFile);
      const uploadedThumbnailUrl = await handleUploadFile(
        thumbFile,
        `${folderSlug}/thumbnails`,
        setThumbnailProgress
      );
      setThumbnailUrl(uploadedThumbnailUrl.publicUrl);

      // Upload raw video
      const uploadedVideo = await handleUploadFile(
        videoFile,
        `${folderSlug}/videos`,
        setVideoProgress
      );

      // Process video on server (ffmpeg + faststart)
      const processedVideoUrl = await handleProcessVideo(uploadedVideo.key);
      setVideoUrl(processedVideoUrl);

      const socialUrl =
        socialMediaUrl ||
        creators.find((c) => c.name === creatorName)?.socialMediaUrl;

      // Save video record to DB
      await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price,
          creatorName,
          socialMediaUrl: socialUrl,
          thumbnail: uploadedThumbnailUrl.publicUrl,
          url: processedVideoUrl,
        }),
      });

      alert("✅ Upload and processing successful!");
    } catch (err) {
      console.error(err);
      alert("❌ Upload or processing failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>
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
          placeholder="Social Media URL (optional)"
          value={socialMediaUrl}
          onChange={(e) => setSocialMediaUrl(e.target.value)}
          className="w-full p-3 border rounded"
        />

        <label className="block mb-4 relative cursor-pointer">
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
          <div className="w-full bg-green-600 text-white py-3 rounded text-center">
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
        {thumbnailProgress > 0 && (
          <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
            <div
              className="bg-green-600 h-2 rounded"
              style={{ width: `${thumbnailProgress}%` }}
            />
          </div>
        )}

        {videoUrl && (
          <p className="text-sm text-gray-700 break-all">
            <strong>Processed Video URL:</strong>{" "}
            <a
              href={videoUrl}
              target="_blank"
              className="text-green-700 underline"
            >
              {videoUrl}
            </a>
          </p>
        )}
        {thumbnailUrl && (
          <p className="text-sm text-gray-700 break-all">
            <strong>Thumbnail URL:</strong>{" "}
            <a
              href={thumbnailUrl}
              target="_blank"
              className="text-green-700 underline"
            >
              {thumbnailUrl}
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
          className="w-full bg-green-600 text-white py-3 rounded"
        >
          {submitting ? "Uploading & Processing..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
