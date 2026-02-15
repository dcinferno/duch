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
import { headers } from "next/headers";
import logo from "../app/logo.svg"; // adjust path if needed

const baseName = process.env.NEXT_PUBLIC_SITE_NAME || "Video Store";
const siteDescription = `${process.env.NEXT_PUBLIC_LATEST_VIDEO_TYPE} Video Store`;

export async function generateMetadata() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const prefix = process.env.NODE_ENV === "development"
    ? "Local"
    : host.startsWith("beta.")
    ? "Beta"
    : null;
  const siteName = prefix ? `${prefix} - ${baseName}` : baseName;

  return {
    title: siteName,
    description: siteDescription,
    openGraph: {
      title: siteName,
      description: siteDescription,
      images: ["/preview.jpg"],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: siteDescription,
      images: ["/preview.jpg"],
    },
  };
}

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
      <body className="h-full flex flex-col bg-[#0a0a0a] text-[#ededed]">
        <header
          role="banner"
          className="hidden md:flex w-full justify-center items-center py-4 border-b border-gray-700"
        >
          <GoogleAnalytics gaId="G-QNL24T0P74" />
          <Link href="/">
            <Image
              src={logo}
              alt="App logo — go to homepage"
              width={96}
              height={96}
              className="w-20 h-20 md:w-24 md:h-24"
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
