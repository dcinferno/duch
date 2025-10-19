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
      const res = await fetch("/api/category");
      const data = await res.json();
      setCategories(data);
    }
    fetchCategories();
  }, []);

  const handleClick = (categoryId) => {
    if (categoryId === "all") {
      router.push("/videos");
    } else {
      router.push(`/videos?category=${categoryId}`);
    }
  };

  return (
    <aside className="w-64 bg-gray-900 text-white h-full px-4 pt-16 md:pt-4">
      <h2 className="font-semibold text-lg mb-3">Categories</h2>
      <ul className="space-y-2">
        <li
          className={`cursor-pointer ${!selectedCategory ? "font-bold" : ""}`}
          onClick={() => handleClick("all")}
        >
          All
        </li>
        {categories.map((cat) => (
          <li
            key={cat._id}
            className={`cursor-pointer ${
              selectedCategory === cat._id ? "font-bold" : ""
            }`}
            onClick={() => handleClick(cat.name)}
          >
            {cat.name}
          </li>
        ))}
      </ul>
    </aside>
  );
}
