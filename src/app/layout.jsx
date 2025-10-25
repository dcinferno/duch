export const dynamic = "force-dynamic";
import "./globals.css";
import RootLayoutClient from "../components/RootLayoutClient";
import ClientOnly from "../components/ClientOnly";
import SidebarLayout from "../components/SidebarLayout";
import Image from "next/image";
import Link from "next/link";
import logo from "../app/logo.svg"; // adjust path if needed

export default async function RootLayout({ children }) {
  // Fetch site settings
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/site-settings/age_verification`
  );
  const settings = res.ok ? await res.json() : null;

  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-col">
        {/* Top header with logo */}
        <header className="w-full flex justify-center items-center py-4 border-b border-gray-200">
          <Link href="/">
            <Image src={logo} alt="App Logo" width={96} height={96} />
          </Link>
        </header>

        {/* RootLayoutClient wraps Sidebar + main content */}
        <RootLayoutClient settings={settings} className="flex-1 flex">
          <ClientOnly>
            <SidebarLayout>{children}</SidebarLayout>
          </ClientOnly>
        </RootLayoutClient>
      </body>
    </html>
  );
}
