"use client";

import { useEffect, useState } from "react";
import VideoGridClient from "@/components/VideoGridClient";

export default function TelegramApp() {
  const [telegramUser, setTelegramUser] = useState(null);
  const [authStatus, setAuthStatus] =
    (useState < "loading") | "success" | "error" | (null > null);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      console.warn("⚠️ Telegram WebApp SDK not found — open inside Telegram.");
      alert("❌ Error initializing Telegram WebApp: " + err.message);
      return;
    }
    tg.showAlert("✅ Telegram WebApp is working!");
    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;
    setTelegramUser(user || null);

    const initData = tg.initData; // signed payload from Telegram

    // Send initData to your backend to verify signature
    const verifyUser = async () => {
      setAuthStatus("loading");
      try {
        const res = await fetch("/api/verify-telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        if (!res.ok) throw new Error("Verification failed");
        const data = await res.json();

        if (data.ok) {
          setAuthStatus("success");
          console.log("✅ Telegram user verified:", user);

          // Fetch videos personalized for Telegram user
          const vids = await fetch(`/api/videos?userId=${user?.id || ""}`).then(
            (r) => r.json()
          );
          setVideos(vids);
        } else {
          throw new Error("Invalid response");
        }
      } catch (err) {
        console.error("❌ Telegram auth failed:", err);
        setAuthStatus("error");
      }
    };

    verifyUser();
  }, []);

  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center text-gray-600">
          <svg
            className="animate-spin h-6 w-6 mx-auto mb-2 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          <p>Verifying Telegram user...</p>
        </div>
      </div>
    );
  }

  if (authStatus === "error") {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50 text-red-600">
        <div className="text-center">
          <p className="font-semibold text-lg">
            ❌ Telegram verification failed
          </p>
          <p className="text-sm mt-2">
            Please open this app from your Telegram bot.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4">
      <header className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          🎥 VideoStore Mini App
        </h1>
        {telegramUser && (
          <p className="text-gray-600 mt-2">
            Welcome,{" "}
            <span className="font-medium">
              {telegramUser.first_name} {telegramUser.last_name || ""}
            </span>{" "}
            👋
          </p>
        )}
      </header>

      <VideoGridClient videos={videos} />
    </div>
  );
}
