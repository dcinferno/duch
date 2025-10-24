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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

        <input
          type="url"
          name="photo"
          placeholder="Profile photo URL (optional)"
          value={formData.photo}
          onChange={handleChange}
          className="p-2 rounded bg-gray-700"
        />

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 py-2 rounded text-white font-semibold"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}
