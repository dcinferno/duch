"use client";

import { useState, useEffect, useRef } from "react";

/* ------------------------------------
   Helpers
------------------------------------ */
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

  return `${creatorSlug}/${titleSlug}-${timestamp}.${ext}`;
}

/* ------------------------------------
   Component
------------------------------------ */
export default function UploadPage() {
  // ---- State
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

  /* ------------------------------------
     Fetch creators
  ------------------------------------ */
  useEffect(() => {
    fetch("/api/creators")
      .then((r) => r.json())
      .then(setCreators)
      .catch(console.error);
  }, []);

  /* ------------------------------------
     Thumbnail generator
  ------------------------------------ */
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
            resolve(
              new File([blob], `thumb-${Date.now()}.jpg`, {
                type: "image/jpeg",
              })
            ),
          "image/jpeg"
        );
      };

      video.onerror = reject;
    });

  /* ------------------------------------
     Pushr upload (preview + thumbnail)
  ------------------------------------ */
  const uploadToPushr = async (file, payload, setProgress) => {
    const res = await fetch("/api/uploadUrl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        fileName: file.name,
        contentType: file.type,
        ...payload,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Pushr init failed");

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () =>
        xhr.status < 300 ? resolve() : reject(xhr.responseText);
      xhr.onerror = reject;

      xhr.open("PUT", data.uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });

    return { publicUrl: data.publicUrl };
  };

  /* ------------------------------------
     Bunny upload (full video)
  ------------------------------------ */
  const uploadToBunny = async (file, fullPath, setProgress) => {
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
    if (!res.ok) throw new Error(data.error || "Bunny init failed");

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () =>
        xhr.status < 300 ? resolve() : reject(xhr.responseText);
      xhr.onerror = reject;

      xhr.open("PUT", data.uploadUrl);
      Object.entries(data.headers).forEach(([k, v]) =>
        xhr.setRequestHeader(k, v)
      );
      xhr.send(file);
    });

    return { key: data.key };
  };

  /* ------------------------------------
     Submit
  ------------------------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!previewFile) return alert("Preview video required");

    setSubmitting(true);

    try {
      const creator = creators.find((c) => c.name === creatorName);
      const creatorSlug = slugify(creatorName);

      // Thumbnail → Pushr
      const thumbFile = customThumb || (await generateThumbnail(previewFile));
      const thumb = await uploadToPushr(
        thumbFile,
        { type: "thumbnail", folder: `${creatorSlug}/thumbnails` },
        setThumbProgress
      );
      setThumbUrl(thumb.publicUrl);

      // Preview → Pushr
      const preview = await uploadToPushr(
        previewFile,
        { type: "preview", folder: `${creatorSlug}/videos` },
        setPreviewProgress
      );
      setPreviewUrl(preview.publicUrl);

      // Full → Bunny
      let fullKeyValue = null;
      if (creator?.pay && fullFile) {
        const fullPath = generateFullVideoFileName(
          title,
          creatorName,
          fullFile
        );
        const full = await uploadToBunny(fullFile, fullPath, setFullProgress);
        fullKeyValue = full.key;
        setFullKey(full.key);
      }

      // Save metadata
      await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price,
          creatorName,
          socialMediaUrl: socialMediaUrl || creator?.socialMediaUrl,
          thumbnail: thumb.publicUrl,
          url: preview.publicUrl,
          fullKey: fullKeyValue,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      setSuccessMessage("✅ Upload successful!");
    } catch (err) {
      console.error(err);
      alert("Upload failed — check console");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCreator = creators.find((c) => c.name === creatorName);

  /* ------------------------------------
     UI
  ------------------------------------ */
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
          className="w-full p-3 border rounded"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          className="w-full p-3 border rounded"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <input
          className="w-full p-3 border rounded"
          type="number"
          placeholder="Price"
          value={price}
          min={0}
          onChange={(e) => setPrice(Number(e.target.value))}
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
          className="w-full p-3 border rounded"
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <button
          type="button"
          className="w-full bg-green-600 text-white p-3 rounded"
          onClick={() => previewInputRef.current.click()}
        >
          {previewFile?.name || "Select Preview Video"}
        </button>
        <input
          ref={previewInputRef}
          hidden
          type="file"
          accept="video/*"
          onChange={(e) => setPreviewFile(e.target.files[0])}
        />

        {selectedCreator?.pay && (
          <>
            <button
              type="button"
              className="w-full bg-purple-600 text-white p-3 rounded"
              onClick={() => fullInputRef.current.click()}
            >
              {fullFile?.name || "Upload Full Video"}
            </button>
            <input
              ref={fullInputRef}
              hidden
              type="file"
              accept="video/*"
              onChange={(e) => setFullFile(e.target.files[0])}
            />
          </>
        )}

        <button
          type="button"
          className="w-full bg-blue-600 text-white p-3 rounded"
          onClick={() => thumbInputRef.current.click()}
        >
          {customThumb?.name || "Upload Custom Thumbnail"}
        </button>
        <input
          ref={thumbInputRef}
          hidden
          type="file"
          accept="image/*"
          onChange={(e) => setCustomThumb(e.target.files[0])}
        />

        <input
          className="w-full p-3 border rounded"
          placeholder="Upload Secret"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          required
        />

        <button
          disabled={submitting}
          className="w-full bg-green-700 text-white p-3 rounded"
        >
          {submitting ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
