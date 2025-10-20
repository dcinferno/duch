// app/videos/layout.js
export const cacheComponents = true;

export default function VideosLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
