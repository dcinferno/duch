"use client";

import { useState, useRef } from "react";

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}
function normalizeTelegram(input) {
  if (!input) return "";

  let value = input.trim();

  // Already a full URL
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  // @username → https://t.me/username
  if (value.startsWith("@")) {
    return `https://t.me/${value.slice(1)}`;
  }

  // bare username → https://t.me/username
  return `https://t.me/${value}`;
}

export default function CreatorSignupPage() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [uploadSecret, setUploadSecret] = useState("");

  const [urlHandle, setUrlHandle] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [profileUrl, setProfileUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fileInputRef = useRef(null);

  // --- Upload to /api/upload ---
  const handleUploadProfile = async (file, folder) => {
    if (!uploadSecret) {
      throw new Error("Upload access key required");
    }

    const res = await fetch("/api/uploadUrl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: uploadSecret,
        fileName: file.name,
        contentType: file.type,
        folder,
        isPublic: true,
      }),
    });

    if (!res.ok) {
      throw new Error("Invalid upload access key");
    }

    const { uploadUrl, key } = await res.json();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error("Upload failed");
    }

    return key; // store key only
  };

  // --- Submit handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name) return alert("Please enter a name");
    if (!urlHandle) return alert("Please enter a handle");
    if (!profileFile) return alert("Please select a profile picture");
    if (url) {
      const cleaned = url.replace(/^https?:\/\/t\.me\//, "").trim();
      if (!/^@?[a-zA-Z0-9_]{3,32}$/.test(cleaned)) {
        return alert("Invalid Telegram username");
      }
    }
    setSubmitting(true);
    try {
      const folderSlug = slugify(name);

      // Upload profile image
      setUploading(true);
      const uploadedProfileUrl = await handleUploadProfile(
        profileFile,
        `${folderSlug}/profile`
      );
      setProfileUrl(uploadedProfileUrl);
      setUploading(false);
      const normalizedUrl = normalizeTelegram(url);
      // Save creator info to DB
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url: normalizedUrl,
          urlHandle,
          photo: uploadedProfileUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to create creator");

      setSuccessMessage("✅ Creator profile created successfully!");
      setName("");
      setUrl("");
      setUrlHandle("");
      setProfileFile(null);
      setProfilePreview(null);
      setProfileUrl(null);

      if (fileInputRef.current) fileInputRef.current.value = "";

      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("❌ Error creating creator:", err);
      alert("❌ Creation failed — see console for details");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  // --- Image selection ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileFile(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Creator Signup</h1>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <input
          type="text"
          placeholder="Creator Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        {/* URL */}
        <input
          type="text"
          placeholder="Telegram username (ex: @saucy4real)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-3 border rounded"
        />
        {/* Handle */}
        <input
          type="text"
          placeholder="urlHandle"
          value={urlHandle}
          onChange={(e) => setUrlHandle(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        {/* Profile Picture */}
        <div>
          <span className="block mb-1 font-medium">Profile Picture</span>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 transition"
          >
            {profileFile ? profileFile.name : "Select Profile Picture"}
          </button>

          {profilePreview && (
            <div className="mt-3">
              <img
                src={profilePreview}
                alt="Profile preview"
                className="w-32 h-32 object-cover rounded-full border"
              />
            </div>
          )}
        </div>

        {/* Upload state */}
        {uploading && (
          <p className="text-sm text-gray-600 italic">Uploading image...</p>
        )}

        {/* Uploaded URL */}
        {profileUrl && (
          <p className="text-sm text-gray-700 break-all">
            <strong>Profile Image:</strong>{" "}
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 underline"
            >
              {profileUrl}
            </a>
          </p>
        )}
        <input
          type="string"
          placeholder="Upload Access Key"
          value={uploadSecret}
          onChange={(e) => setUploadSecret(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 transition"
        >
          {submitting ? "Creating..." : "Create Creator"}
        </button>
      </form>
    </div>
  );
}
