import "./globals.css";
import SidebarLayout from "../components/SidebarLayout";

export const metadata = {
  title: "BestPlay Previews",
  description: "Responsive video store",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen flex">
        <SidebarLayout>{children}</SidebarLayout>
      </body>
    </html>
  );
}
