"use client";

import { useState, useEffect } from "react";

export default function PricingCard() {
  const [telegramLink, setTelegramLink] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/site-settings/featured_creator_signup");
        const data = await res.json();
        if (data.extra?.telegramLink) {
          setTelegramLink(data.extra.telegramLink);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }

    loadSettings();
  }, []);

  return (
    <div className="flex justify-center py-12">
      <div className="max-w-sm w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">
            {/* Optional: data.title */}Featured Creator Signup
          </h2>
          <p className="text-3xl font-extrabold mb-4">Contact For Pricing</p>

          <ul className="text-gray-700 mb-6 space-y-2">
            <li>✅ Featured on Sidebar</li>
            <li>✅ Personalized URL Handle</li>
            <li>✅ Submit Website Feature Requests</li>
          </ul>

          <a
            href={telegramLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-block py-3 px-6 rounded-lg font-semibold transition-colors text-white ${
              telegramLink
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}
