"use client";

import { useState } from "react";
import ImageUpload from "../../../components/ImageUpload";

export default function NewPostPage() {
  const [form, setForm] = useState({
    title: "",
    content: "",
    author: "",
    tags: "",
    imageUrl: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()),
      }),
    });

    if (res.ok) {
      alert("Post created!");
      setForm({ title: "", content: "", author: "", tags: "", imageUrl: "" });
    } else {
      alert("Failed to create post.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />
      <input
        type="text"
        placeholder="Author"
        value={form.author}
        onChange={(e) => setForm({ ...form, author: e.target.value })}
      />
      <textarea
        placeholder="Content"
        value={form.content}
        onChange={(e) => setForm({ ...form, content: e.target.value })}
      />
      <input
        type="text"
        placeholder="Tags (comma separated)"
        value={form.tags}
        onChange={(e) => setForm({ ...form, tags: e.target.value })}
      />

      <p>Upload an image (optional):</p>
      <ImageUpload
        onUploadComplete={(url) =>
          setForm((prev) => ({ ...prev, imageUrl: url }))
        }
      />

      {form.imageUrl && (
        <img
          src={form.imageUrl}
          alt="Preview"
          style={{ maxWidth: "200px", marginTop: "10px" }}
        />
      )}

      <button type="submit">Create Post</button>
    </form>
  );
}
