"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Sidebar() {
  const [categories, setCategories] = useState([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category");

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/category");
        const data = await res.json();
        setCategories(data);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    }

    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryId) => {
    if (categoryId === "all") {
      router.push("/videos");
    } else {
      router.push(`/videos?category=${categoryId}`);
    }
  };

  const handleBlogClick = () => {
    router.push("/blog");
  };

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen px-4 pt-16 md:pt-4">
      <nav className="space-y-4">
        {/* Blog Link */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Navigation</h2>
          <ul>
            <li
              onClick={handleBlogClick}
              className="cursor-pointer hover:underline text-blue-300"
            >
              Blog
            </li>
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Video Categories</h2>
          <ul className="space-y-2">
            <li
              className={`cursor-pointer hover:underline ${
                !selectedCategory ? "font-bold text-yellow-300" : ""
              }`}
              onClick={() => handleCategoryClick("all")}
            >
              All
            </li>
            {categories.map((cat) => (
              <li
                key={cat._id}
                className={`cursor-pointer hover:underline ${
                  selectedCategory === cat.name
                    ? "font-bold text-yellow-300"
                    : ""
                }`}
                onClick={() => handleCategoryClick(cat.name)}
              >
                {cat.name}
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
