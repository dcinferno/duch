"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Sidebar() {
  const [categories, setCategories] = useState([]);
  const [contacts, setContacts] = useState([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category");

  // Fetch categories and contact links
  useEffect(() => {
    async function fetchData() {
      try {
        const [categoryRes, contactRes] = await Promise.all([
          fetch("/api/category"),
          fetch("/api/contact"),
        ]);

        const categoryData = await categoryRes.json();
        const contactData = await contactRes.json();

        setCategories(categoryData);
        setContacts(contactData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    }

    fetchData();
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
    <aside className="w-64 bg-gray-900 text-white h-screen px-4 pt-16 md:pt-4 overflow-y-auto flex flex-col">
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
      {contacts.length > 0 && (
        <div className="mt-4 md:mt-auto border-t border-gray-700 pt-4">
          <h2 className="text-lg font-semibold mb-3">Contact Me</h2>
          <ul className="space-y-2">
            {contacts.map((contact) => (
              <li key={contact._id}>
                <a
                  href={contact.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:underline ${
                    contact.color || "text-blue-400"
                  }`}
                >
                  {contact.platform}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
