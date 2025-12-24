// lib/fetchActiveDiscounts.js
export async function fetchActiveDiscounts() {
  const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/discount/active`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch active discounts");
  }

  return res.json();
}
