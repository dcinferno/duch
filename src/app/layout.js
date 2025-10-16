import "./globals.css";

export const metadata = {
  title: "Video Store",
  description: "Responsive video store using Next.js and MongoDB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
