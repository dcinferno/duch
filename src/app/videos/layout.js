// app/videos/layout.js
import { Suspense } from "react";
import Sidebar from "../../components/Sidebar";
export const cacheComponents = true;

export default function VideosLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
