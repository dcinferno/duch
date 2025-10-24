"use client";

import { useState, useEffect, useRef } from "react";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [creatorName, setCreatorName] = useState("");
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

  // Upload helper
  const handleUploadFile = (file, setProgress, folder) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setProgress(percent);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(file.name);
          } else {
            reject(new Error("Upload failed"));
          }
        }
      };

      fetch("/api/uploadUrl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: secretKey,
          fileName: file.name,
          contentType: file.type,
          folder,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.upload_url) throw new Error("Failed to get upload URL");
          xhr.open("PUT", data.upload_url);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        })
        .catch(reject);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) return alert("Please select a video file!");
    if (!creatorName) return alert("Please select your creator account!");
    if (!secretKey) return alert("Please enter the secret key!");

    setSubmitting(true);

    try {
      if (thumbnailFile)
        await handleUploadFile(
          thumbnailFile,
          setThumbnailProgress,
          "thumbnails",
        );
      await handleUploadFile(videoFile, setVideoProgress, "videos");

      alert("Upload successful!");

      // Reset form
      setTitle("");
      setDescription("");
      setPrice(0);
      setCreatorName("");
      setVideoFile(null);
      setThumbnailFile(null);
      setSecretKey("");
      setVideoProgress(0);
      setThumbnailProgress(0);
    } catch (err) {
      console.error(err);
      alert("Upload failed, see console for details.");
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

        {/* Video File */}
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

        {/* Thumbnail File */}
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
