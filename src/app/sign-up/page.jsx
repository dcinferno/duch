"use client";

export default function PricingCard() {
  return (
    <div className="flex justify-center py-12">
      <div className="max-w-sm w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 text-center">
          {/* Plan Title */}
          <h2 className="text-2xl font-bold mb-2">Featured Creator Signup</h2>

          {/* Price / Contact */}
          <p className="text-3xl font-extrabold mb-4">Contact For Pricing</p>

          {/* Features */}
          <ul className="text-gray-700 mb-6 space-y-2">
            <li>✅ Featured on Sidebar</li>
            <li>✅ Personalized URL Handle</li>
            <li>✅ Submit Website Feature Requests</li>
          </ul>

          {/* Telegram Button */}
          <a
            href="https://t.me/dcinferno94"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}
