"use client";

import { useEffect, useState } from "react";
import { UploadButton } from "@uploadthing/react";

export default function AdminUI() {
  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    imageUrl: "",
  });

  // Fetch all posts
  useEffect(() => {
    async function fetchPosts() {
      const res = await fetch("/api/blog");
      const data = await res.json();
      setPosts(data);
    }
    fetchPosts();
  }, []);

  function handleChange(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const url = editingPost ? `/api/blog/${editingPost._id}` : "/api/blog";
    const method = editingPost ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setFormData({ title: "", content: "", imageUrl: "" });
      setEditingPost(null);

      // Refresh posts
      const refreshed = await fetch("/api/blog").then((res) => res.json());
      setPosts(refreshed);
    } else {
      alert("Failed to save post");
    }
  }

  function startEdit(post) {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl || "",
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Manage Posts</h2>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 border p-4 rounded mb-8"
      >
        <input
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Title"
          required
          className="w-full border px-3 py-2 rounded"
        />

        <textarea
          name="content"
          value={formData.content}
          onChange={handleChange}
          placeholder="Content"
          required
          className="w-full border px-3 py-2 rounded"
        />

        {/* Upload Button */}
        <div className="mb-2">
          <UploadButton
            endpoint="imageUploader" // your uploadthing endpoint name
            appearance={{
              button: {
                backgroundColor: "#333",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
                "&:hover": {
                  backgroundColor: "#555",
                },
              },
              container: {
                marginTop: "1rem",
              },
              allowedContent: {
                color: "#a1a1aa",
              },
            }}
            onClientUploadComplete={(res) => {
              if (res && res[0]?.url) {
                setFormData((prev) => ({ ...prev, imageUrl: res[0].url }));
              }
            }}
            onUploadError={(error) => {
              alert("Upload failed: " + error.message);
            }}
          />
        </div>

        {/* Image URL field (optional: to show/edit the URL manually) */}
        <input
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          placeholder="Image URL"
          className="w-full border px-3 py-2 rounded"
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {editingPost ? "Update Post" : "Create Post"}
        </button>
      </form>

      {/* Posts List */}
      <ul className="space-y-2">
        {posts.map((post) => (
          <li
            key={post._id}
            className="border p-3 rounded flex justify-between items-center"
          >
            <span>{post.title}</span>
            <button
              onClick={() => startEdit(post)}
              className="text-blue-600 hover:underline"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
