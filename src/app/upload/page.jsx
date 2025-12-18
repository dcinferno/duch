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
  const ext = file.name.split(".").pop();
  return `${creatorSlug}/${titleSlug}-${Date.now()}.${ext}`;
}

/* ---------------------------------
   Component
--------------------------------- */
export default function UploadPage() {
  // --- State ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [creatorName, setCreatorName] = useState("");
  const [socialMediaUrl, setSocialMediaUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null); // preview
  const [fullVideoFile, setFullVideoFile] = useState(null); // 🆕 full
  const [videoProgress, setVideoProgress] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [fullProgress, setFullProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [creators, setCreators] = useState([]);
  const [secretKey, setSecretKey] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
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
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.currentTime = 3;

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas
          .getContext("2d")
          .drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) =>
            resolve(new File([blob], "thumbnail.jpg", { type: "image/jpeg" })),
          "image/jpeg"
        );
      };

      video.onerror = reject;
    });

  /* ---------------------------------
     Upload → PUSHR (preview + thumb)
  --------------------------------- */
  const uploadToPushr = async (file, folder, setProgress) => {
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

    const { uploadUrl, publicUrl } = await res.json();
    if (!uploadUrl) throw new Error("Failed to init Pushr upload");

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) =>
        e.lengthComputable &&
        setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () =>
        xhr.status < 300 ? resolve() : reject(xhr.responseText);
      xhr.onerror = reject;
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });

    return publicUrl;
  };

  /* ---------------------------------
     Upload → Bunny (full video)
  --------------------------------- */
  const uploadToBunny = async (file, fullPath) => {
    const res = await fetch("/api/bunny-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        fileName: fullPath,
        contentType: file.type,
      }),
    });

    const { uploadUrl, headers, key } = await res.json();
    if (!uploadUrl) throw new Error("Failed to init Bunny upload");

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) =>
        e.lengthComputable &&
        setFullProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () =>
        xhr.status < 300 ? resolve() : reject(xhr.responseText);
      xhr.onerror = reject;
      xhr.open("PUT", uploadUrl);
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.send(file);
    });

    return key;
  };

  /* ---------------------------------
     Submit
  --------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
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

      let fullKey = null;
      if (creator?.pay && fullVideoFile) {
        const fullPath = generateFullVideoFileName(
          title,
          creatorName,
          fullVideoFile
        );
        fullKey = await uploadToBunny(fullVideoFile, fullPath);
      }

      await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price,
          creatorName,
          socialMediaUrl: socialMediaUrl || creator?.url, // ✅ keep creator.url
          thumbnail: thumbUrl,
          url: previewUrl,
          fullKey,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      setSuccessMessage("✅ Upload successful!");
    } catch (err) {
      console.error(err);
      alert("Upload failed — see console");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCreator = creators.find((c) => c.name === creatorName);

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

        {/* Tags */}
        <input
          type="text"
          placeholder="Enter tags separated by commas"
          value={tags}
          onChange={(e) => setTags(e.target.value.toLowerCase())}
          className="w-full p-3 border rounded"
        />

        {/* Preview Video (Pushr) */}
        <div>
          <span className="block mb-1 font-medium">Preview Video</span>
          <input
            type="file"
            accept="video/*"
            ref={videoInputRef}
            className="hidden"
            onChange={(e) => setVideoFile(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 transition"
          >
            {videoFile ? videoFile.name : "Select Preview Video"}
          </button>
        </div>

        {/* Full Video (Bunny) */}
        <div>
          <span className="block mb-1 font-medium">
            Full Video (Paid / Bunny)
          </span>
          <input
            type="file"
            accept="video/*"
            ref={fullVideoInputRef}
            className="hidden"
            onChange={(e) => setFullVideoFile(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => fullVideoInputRef.current?.click()}
            className="w-full bg-purple-600 text-white py-3 rounded hover:bg-purple-700 transition"
          >
            {fullVideoFile
              ? fullVideoFile.name
              : "Upload Full Video (Optional)"}
          </button>
        </div>

        {/* Thumbnail */}
        <div>
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
            className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition"
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

        {/* Progress Bars */}
        {thumbnailProgress > 0 && (
          <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
            <div
              className="bg-blue-600 h-2"
              style={{ width: `${thumbnailProgress}%` }}
            />
          </div>
        )}

        {videoProgress > 0 && (
          <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
            <div
              className="bg-green-600 h-2"
              style={{ width: `${videoProgress}%` }}
            />
          </div>
        )}

        {fullProgress > 0 && (
          <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
            <div
              className="bg-purple-600 h-2"
              style={{ width: `${fullProgress}%` }}
            />
          </div>
        )}

        {/* URLs */}
        {thumbnailUrl && (
          <p className="text-sm text-gray-700 break-all">
            <strong>Thumbnail:</strong>
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
            <strong>Preview:</strong>
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

        {fullKey && (
          <p className="text-sm text-gray-700 break-all">
            <strong>Full Video Key:</strong>
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
