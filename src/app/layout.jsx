import "./globals.css";
import RootLayoutClient from "../components/RootLayoutClient";
import SidebarLayout from "../components/SidebarLayout";

export default async function RootLayout({ children }) {
  // Fetch age verification (or other site settings) from MongoDB
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/site-settings/age_verification`
  );
  const settings = (await res.ok) ? await res.json() : null;

  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen flex flex-col md:flex-row relative">
        {/* Pass settings as prop */}
        <RootLayoutClient settings={settings}>
          <SidebarLayout>{children}</SidebarLayout>
        </RootLayoutClient>
      </body>
    </html>
  );
}
