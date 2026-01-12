"use client";

import { useSearchParams, useRouter } from "next/navigation";
import SuccessView from "../../components/SuccessView";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Existing param (single video)
  const videoId = searchParams.get("videoId");

  // Future bundle param (not used yet)
  const bundleId = searchParams.get("bundleId");

  return (
    <SuccessView
      // backward-compatible
      videoId={videoId}
      bundleId={bundleId}
      router={router}
    />
  );
}
