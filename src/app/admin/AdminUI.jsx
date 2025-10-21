"use client";

import { useEffect, useState } from "react";
import { UploadButton } from "@uploadthing/react";

export default function AdminUI() {
  const [contacts, setContacts] = useState([]);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({
    platform: "",
    url: "",
    color: "",
  });
  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    imageUrl: "",
  });

  useEffect(() => {
    async function fetchData() {
      const [blogRes, contactRes] = await Promise.all([
        fetch("/api/blog"),
        fetch("/api/contact"),
      ]);
      const blogData = await blogRes.json();
      const contactData = await contactRes.json();

      setPosts(blogData);
      setContacts(contactData);
    }
    fetchData();
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
      const refreshed = await fetch("/api/blog").then((res) => res.json());
      setPosts(refreshed);
    } else {
      alert("Failed to save post");
    }
  }

  function handleContactChange(e) {
    setContactForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    const url = editingContact
      ? `/api/contact/${editingContact._id}`
      : "/api/contact";
    const method = editingContact ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });

    if (res.ok) {
      setContactForm({ platform: "", url: "", color: "" });
      setEditingContact(null);
      const refreshed = await fetch("/api/contact").then((res) => res.json());
      setContacts(refreshed);
    } else {
      alert("Failed to save contact link");
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

  function startEditContact(contact) {
    setEditingContact(contact);
    setContactForm({
      platform: contact.platform,
      url: contact.url,
      color: contact.color || "",
    });
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-4">Manage Posts</h2>

      {/* Post Form */}
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

        <div className="mb-2">
          <UploadButton
            endpoint="imageUploader"
            appearance={{
              button: {
                backgroundColor: "#333",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
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
            onUploadBegin={(name) => {
              // Do something once upload begins
              alert("Uploading: ", name);
            }}
          />
        </div>

        <input
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          placeholder="Image URL"
          className="w-full border px-3 py-2 rounded"
        />

        <button
          type="submit"
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {editingPost ? "Update Post" : "Create Post"}
        </button>
      </form>

      <h2 className="text-2xl font-bold mb-4 mt-12">Manage Contact Links</h2>

      {/* Contact Form */}
      <form
        onSubmit={handleContactSubmit}
        className="space-y-4 border p-4 rounded mb-8"
      >
        <input
          name="platform"
          value={contactForm.platform}
          onChange={handleContactChange}
          placeholder="Platform (e.g., Telegram)"
          required
          className="w-full border px-3 py-2 rounded"
        />

        <input
          name="url"
          value={contactForm.url}
          onChange={handleContactChange}
          placeholder="URL (e.g., https://t.me/yourusername)"
          required
          className="w-full border px-3 py-2 rounded"
        />

        <input
          name="color"
          value={contactForm.color}
          onChange={handleContactChange}
          placeholder="Tailwind color class (optional)"
          className="w-full border px-3 py-2 rounded"
        />

        <button
          type="submit"
          className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {editingContact ? "Update Contact" : "Add Contact"}
        </button>
      </form>

      {/* Contact List */}
      <ul className="space-y-2">
        {contacts.map((contact) => (
          <li
            key={contact._id}
            className="border p-3 rounded flex flex-col sm:flex-row justify-between sm:items-center gap-2"
          >
            <span className="break-words">{contact.platform}</span>
            <button
              onClick={() => startEditContact(contact)}
              className="text-green-600 hover:underline self-start sm:self-auto"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>

      {/* Posts List */}
      <ul className="space-y-2 mt-8">
        {posts.map((post) => (
          <li
            key={post._id}
            className="border p-3 rounded flex flex-col sm:flex-row justify-between sm:items-center gap-2"
          >
            <span className="break-words">{post.title}</span>
            <button
              onClick={() => startEdit(post)}
              className="text-blue-600 hover:underline self-start sm:self-auto"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
