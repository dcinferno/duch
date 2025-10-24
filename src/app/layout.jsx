import "./globals.css";
import RootLayoutClient from "../components/RootLayoutClient";
import SidebarLayout from "../components/SidebarLayout";

export default async function RootLayout({ children }) {
  // Fetch age verification (or other site settings) from MongoDB
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/site-settings/age_verification`
  );
  const settings = res.ok ? await res.json() : null;

  return (
    <html lang="en" className="h-full">
      <body className="h-full flex">
        <RootLayoutClient settings={settings}>
          {/* SidebarLayout handles sidebar + main content flex */}
          <SidebarLayout>{children}</SidebarLayout>
        </RootLayoutClient>
      </body>
    </html>
  );
}
