"use client";

import { useState } from "react";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    premium: false,
    urlHandle: "",
    photo: "",
  });

  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = async (file) => {
    if (!file) return;

    setMessage("Uploading photo...");
    setUploading(true);

    const data = new FormData();
    data.append("file", file);

    // Upload to folder based on creator name
    if (formData.name) {
      const safeFolder = formData.name
        .trim()
        .replace(/\s+/g, "_")
        .toLowerCase();
      data.append("folder", safeFolder);
    }

    try {
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const result = await res.json();

      if (res.ok) {
        setFormData((prev) => ({ ...prev, photo: result.url }));
        setMessage("Photo uploaded!");
      } else {
        setMessage(`Upload failed: ${result.error}`);
      }
    } catch (err) {
      setMessage("Upload error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) {
      setMessage("Please wait for the photo to finish uploading.");
      return;
    }

    const res = await fetch("/api/creators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Signup successful! 🎉");
      setFormData({
        name: "",
        url: "",
        premium: false,
        urlHandle: "",
        photo: "",
      });
    } else {
      setMessage(`Error: ${data.error}`);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-gray-800 text-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Become a Creator</h1>
      {message && <p className="mb-4">{message}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          name="name"
          placeholder="Creator Name"
          required
          value={formData.name}
          onChange={handleChange}
          className="p-2 rounded bg-gray-700"
        />

        <input
          type="url"
          name="url"
          placeholder="Telegram ex: https://t.me/yourhandle"
          required
          value={formData.url}
          onChange={handleChange}
          className="p-2 rounded bg-gray-700"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="premium"
            checked={formData.premium}
            onChange={handleChange}
          />
          Featured?
        </label>

        {formData.premium && (
          <input
            type="text"
            name="urlHandle"
            placeholder="Premium Handle yourhandle"
            value={formData.urlHandle}
            onChange={handleChange}
            className="p-2 rounded bg-gray-700"
          />
        )}

        {!formData.photo && (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files[0])}
            className="p-2 rounded bg-gray-700"
          />
        )}

        {formData.photo && (
          <div className="flex flex-col items-center">
            <img
              src={formData.photo}
              alt="Preview"
              className="w-24 h-24 object-cover rounded mb-2"
            />
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, photo: "" }))}
              className="text-red-500 text-sm"
            >
              Remove
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className={`py-2 rounded font-semibold text-white ${
            uploading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {uploading ? "Uploading..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}
