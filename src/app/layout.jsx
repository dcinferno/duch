"use client";
import "./globals.css";
import SidebarLayout from "../components/SidebarLayout";
import { useState, useEffect } from "react";

export default function RootLayout({ children }) {
  const [showGrownPopup, setShowGrownPopup] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [settings, setSettings] = useState(null);

  // Check localStorage for grown flag
  useEffect(() => {
    const grown = localStorage.getItem("grown");
    if (!grown) {
      setShowGrownPopup(true);
      setTimeout(() => setFadeIn(true), 50);
    }
  }, []);

  // Fetch popup settings from API
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/site-settings/age_verification");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setSettings(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchSettings();
  }, []);

  const handleYes = () => {
    localStorage.setItem("grown", "true");
    setFadeIn(false);
    setTimeout(() => setShowGrownPopup(false), 300);
  };

  const handleNo = () => {
    window.location.href = settings?.redirectUrl || "https://www.google.com/";
  };

  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen flex flex-col md:flex-row relative">
        {showGrownPopup && settings && (
          <div
            className={`fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300 ${
              fadeIn ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="bg-white rounded-lg p-6 max-w-sm w-11/12 sm:w-auto text-center shadow-lg">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">
                {settings.title || "Welcome!"}
              </h2>
              <p className="text-gray-700">{settings.message}</p>
              <div className="flex flex-col sm:flex-row justify-around gap-4 mt-4">
                <button
                  onClick={handleYes}
                  className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded text-lg sm:text-base transition-all"
                >
                  {settings.yesText || "Continue"}
                </button>
                <button
                  onClick={handleNo}
                  className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded text-lg sm:text-base transition-all"
                >
                  {settings.noText || "Exit"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main app content, blurred if popup active */}
        <div
          className={
            showGrownPopup
              ? "blur-sm pointer-events-none transition-all duration-300"
              : ""
          }
        >
          <SidebarLayout>{children}</SidebarLayout>
        </div>
      </body>
    </html>
  );
}
