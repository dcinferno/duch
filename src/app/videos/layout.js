// app/videos/layout.js

import Sidebar from "../../components/Sidebar";

export default function VideosLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
