"use client";

import { useEffect, useState } from "react";
import VideoGridClient from "@/components/VideoGridClient";

export default function TelegramApp() {
  const [error, setError] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    try {
      const tg = window?.Telegram?.WebApp;

      if (!tg) {
        setError("Not running inside Telegram. window.Telegram is undefined.");
        return;
      }

      tg.ready();
      tg.expand();

      console.log("✅ Telegram WebApp initialized:", tg);

      const user = tg.initDataUnsafe?.user || null;
      setTelegramUser(user);

      // Example: send initData to backend (optional verification)
      const initData = tg.initData;
      fetch("/api/verify-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            console.log("✅ Telegram user verified:", user);
          } else {
            console.warn("⚠️ Verification failed:", data);
          }
        })
        .catch((err) => {
          console.error("❌ Verification error:", err);
          setError("Verification failed: " + err.message);
        });
    } catch (err) {
      console.error("❌ Telegram Mini App error:", err);
      setError(err.message || String(err));
    }
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-700 p-6 text-center">
        <h1 className="font-bold text-lg mb-2">❌ App Error</h1>
        <p className="text-sm mb-1">{error}</p>
        <p className="text-gray-500 text-xs mt-1">Check console for details</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-center text-2xl font-bold mb-4">
        🎥 Telegram VideoStore
      </h1>

      {telegramUser && (
        <p className="text-center text-gray-600 mb-4">
          Hello, {telegramUser.first_name}!
        </p>
      )}

      <VideoGridClient videos={videos} />
    </div>
  );
}
