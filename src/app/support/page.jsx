"use client";

import { useState } from "react";

export default function SupportPage() {
  const [copied, setCopied] = useState(false);

  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

  const telegramSupport = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM || "";

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Purchase Support</h1>

        <p className="text-gray-400 mb-6">
          This page covers common purchase and access issues. Most problems
          resolve automatically.
        </p>

        {/* Common Issues */}
        <div className="space-y-4 mb-10">
          <SupportItem
            title="I was charged, but the video is still locked"
            text="This usually resolves automatically within a minute. If not, refresh the page or reopen the video."
          />
          <SupportItem
            title="Payment went through but I can’t download or watch"
            text="Make sure you're using the same browser/device you used during checkout."
          />
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Contact Support</h2>

          {supportEmail && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Email:</span>
              <button
                onClick={() => copyText(supportEmail)}
                className="text-blue-400 underline"
              >
                {supportEmail}
              </button>
              {copied && (
                <span className="text-sm text-green-600">Copied!</span>
              )}
            </div>
          )}

          {telegramSupport && (
            <a
              href={telegramSupport}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              Contact via Telegram
            </a>
          )}
        </div>

        <p className="text-gray-500 text-sm mt-12">
          Support is typically answered within 24 hours.
        </p>
      </div>
    </div>
  );
}

function SupportItem({ title, text }) {
  return (
    <div className="border border-gray-700 rounded-lg p-4">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  );
}
