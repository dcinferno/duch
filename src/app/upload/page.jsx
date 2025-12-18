"use client";

import { useState, useEffect, useRef } from "react";

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

function generateFullVideoFileName(title, creatorName, originalFile) {
  const creatorSlug = slugify(creatorName);
  const titleSlug = slugify(title);
  const ext = originalFile.name.split(".").pop();
  const timestamp = Date.now();

  // 🔒 Full videos live under /{creatorSlug}/
  return `${creatorSlug}/${titleSlug}-${timestamp}.${ext}`;
}

export default function UploadPage() {
  // --- State ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);

  const [creatorName, setCreatorName] = useState("");
  const [creators, setCreators] = useState([]);

  const [socialMediaUrl, setSocialMediaUrl] = useState("");
  const [tags, setTags] = useState("");

  const [previewFile, setPreviewFile] = useState(null);
  const [fullFile, setFullFile] = useState(null);
  const [customThumb, setCustomThumb] = useState(null);

  const [previewProgress, setPreviewProgress] = useState(0);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [fullProgress, setFullProgress] = useState(0);

  const [secretKey, setSecretKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [thumbUrl, setThumbUrl] = useState(null);
  const [fullKey, setFullKey] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");

  const previewInputRef = useRef(null);
  const thumbInputRef = useRef(null);
  const fullInputRef = useRef(null);

  // Fetch creators
  useEffect(() => {
    async function fetchCreators() {
      try {
        const res = await fetch("/api/creators");
        const data = await res.json();
        setCreators(data);
      } catch (err) {
        console.error("Failed to fetch creators", err);
      }
    }
    fetchCreators();
  }, []);

  // Generate thumbnail from preview video
  const generateThumbnail = (file) =>
    new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.currentTime = 3;

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) =>
            resolve(new File([blob], "thumb.jpg", { type: "image/jpeg" })),
          "image/jpeg"
        );
      };

      video.onerror = reject;
    });

  // Upload helper (presigned PUT)
  const uploadToPresigned = async (file, options, setProgress) => {
    const res = await fetch("/api/uploadUrl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        fileName: file.name,
        contentType: file.type,
        ...options, // type + folder OR customKey
      }),
    });

    const { uploadUrl, publicUrl, key } = await res.json();
    if (!uploadUrl) throw new Error("Failed to get upload URL");

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      xhr.onload = () =>
        xhr.status < 300 ? resolve() : reject(xhr.responseText);
      xhr.onerror = reject;
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });

    return { publicUrl, key };
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice(0);
    setCreatorName("");
    setSocialMediaUrl("");
    setTags("");

    setPreviewFile(null);
    setFullFile(null);
    setCustomThumb(null);

    setPreviewProgress(0);
    setThumbProgress(0);
    setFullProgress(0);

    setPreviewUrl(null);
    setThumbUrl(null);
    setFullKey(null);

    setSuccessMessage("");

    if (previewInputRef.current) previewInputRef.current.value = "";
    if (thumbInputRef.current) thumbInputRef.current.value = "";
    if (fullInputRef.current) fullInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!previewFile) return alert("Preview video required.");

    setSubmitting(true);

    try {
      const creator = creators.find((c) => c.name === creatorName);
      const creatorSlug = slugify(creatorName);

      // 1️⃣ Thumbnail
      const thumbFile = customThumb || (await generateThumbnail(previewFile));
      const thumbUpload = await uploadToPresigned(
        thumbFile,
        {
          type: "thumbnail",
          folder: `${creatorSlug}/thumbnails`,
        },
        setThumbProgress
      );
      setThumbUrl(thumbUpload.publicUrl);

      // 2️⃣ Preview video
      const previewUpload = await uploadToPresigned(
        previewFile,
        {
          type: "preview",
          folder: `${creatorSlug}/videos`,
        },
        setPreviewProgress
      );
      setPreviewUrl(previewUpload.publicUrl);

      // 3️⃣ Full video (secure, optional)
      let fullKeyValue = null;

      if (creator?.pay && fullFile) {
        const fullPath = generateFullVideoFileName(
          title,
          creatorName,
          fullFile
        );

        const fullUpload = await uploadToPresigned(
          fullFile,
          {
            type: "full",
            customKey: fullPath,
          },
          setFullProgress
        );

        fullKeyValue = fullUpload.key;
        setFullKey(fullUpload.key);
      }

      // 4️⃣ Save metadata
      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price,
          creatorName,
          socialMediaUrl: socialMediaUrl || creator?.socialMediaUrl,
          thumbnail: thumbUpload.publicUrl,
          url: previewUpload.publicUrl,
          fullKey: fullKeyValue,
          tags: tagArray,
        }),
      });

      setSuccessMessage("✅ Upload successful!");
      resetForm();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error(err);
      alert("Upload failed — see console");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCreator = creators.find((c) => c.name === creatorName);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>

      {successMessage && (
        <div className="p-3 mb-4 bg-green-100 border border-green-400 text-green-800 rounded">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          className="w-full p-3 border rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          placeholder="Description"
          className="w-full p-3 border rounded"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Price"
          className="w-full p-3 border rounded"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          min={0}
        />

        <select
          className="w-full p-3 border rounded"
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
          required
        >
          <option value="">Select creator</option>
          {creators.map((c) => (
            <option key={c._id} value={c.name}>
              {c.name} {c.pay ? "💰" : ""}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Tags (comma separated)"
          className="w-full p-3 border rounded"
          value={tags}
          onChange={(e) => setTags(e.target.value.toLowerCase())}
        />

        {/* Preview */}
        <button
          type="button"
          onClick={() => previewInputRef.current?.click()}
          className="w-full bg-green-600 text-white p-3 rounded"
        >
          {previewFile ? previewFile.name : "Select Preview Video"}
        </button>
        <input
          type="file"
          accept="video/*"
          ref={previewInputRef}
          hidden
          onChange={(e) => setPreviewFile(e.target.files[0])}
        />

        {/* Full (secure) */}
        {selectedCreator?.pay && (
          <>
            <button
              type="button"
              onClick={() => fullInputRef.current?.click()}
              className="w-full bg-purple-600 text-white p-3 rounded"
            >
              {fullFile ? fullFile.name : "Upload Full Video (Optional)"}
            </button>
            <input
              type="file"
              accept="video/*"
              ref={fullInputRef}
              hidden
              onChange={(e) => setFullFile(e.target.files[0])}
            />
          </>
        )}

        {/* Thumbnail */}
        <button
          type="button"
          onClick={() => thumbInputRef.current?.click()}
          className="w-full bg-blue-600 text-white p-3 rounded"
        >
          {customThumb ? customThumb.name : "Upload Custom Thumbnail"}
        </button>
        <input
          type="file"
          accept="image/*"
          ref={thumbInputRef}
          hidden
          onChange={(e) => setCustomThumb(e.target.files[0])}
        />

        <input
          type="text"
          placeholder="Secret Key"
          className="w-full p-3 border rounded"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-700 text-white p-3 rounded"
        >
          {submitting ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
