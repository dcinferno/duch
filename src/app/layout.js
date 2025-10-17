import "./globals.css";
export const cacheComponents = true;
export const metadata = {
  title: "BigDuch",
  description: "Responsive video store using Next.js and MongoDB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
