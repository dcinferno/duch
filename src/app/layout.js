import "./globals.css";
import SidebarLayout from "../components/SidebarLayout";

export const metadata = {
  title: "BigDuch",
  description: "Responsive video store using Next.js and MongoDB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SidebarLayout>{children}</SidebarLayout>
      </body>
    </html>
  );
}
