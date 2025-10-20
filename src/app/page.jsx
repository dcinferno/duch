'use client';

import BlogList from '../components/BlogList';
import { useEffect, useState } from 'react';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      try {
        const res = await fetch('/api/blog');
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Latest Blog Posts</h1>
      {loading ? <p>Loading posts...</p> : <BlogList posts={posts} />}
    </>
  );
}
