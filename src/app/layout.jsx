// app/layout.jsx
export const dynamic = "force-dynamic";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";
import BetaBanner from "../components/BetaBanner";
import RootLayoutClient from "../components/RootLayoutClient";
import ClientOnly from "../components/ClientOnly";
import SidebarLayout from "../components/SidebarLayout";
import Image from "next/image";
import Link from "next/link";
import logo from "../app/logo.svg"; // adjust path if needed

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Video Store";
const siteDescription = `${process.env.NEXT_PUBLIC_LATEST_VIDEO_TYPE} Video Store`;

export const metadata = {
  title: siteName,
  description: siteDescription,
};

export default async function RootLayout({ children }) {
  let settings = null;

  try {
    // Use no-store to avoid caching issues during dynamic render
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/site-settings/age_verification`,
      { cache: "no-store" }
    );
    if (res.ok) settings = await res.json();
  } catch (err) {
    console.warn("Could not fetch site settings (build-safe):", err);
    settings = null;
  }

  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-col">
        <header
          role="banner"
          className="w-full flex justify-center items-center py-4 border-b border-gray-200"
        >
          <GoogleAnalytics gaId="G-QNL24T0P74" />
          <Link href="/">
            <Image
              src={logo}
              alt="App logo — go to homepage"
              width={96}
              height={96}
            />
          </Link>
        </header>
        <BetaBanner />
        {/* RootLayoutClient wraps Sidebar + main content */}
        <RootLayoutClient settings={settings} className="flex-1 flex">
          <ClientOnly>
            <SidebarLayout>{children}</SidebarLayout>
          </ClientOnly>
        </RootLayoutClient>
         <Analytics />
      </body>
    </html>
  );
}
