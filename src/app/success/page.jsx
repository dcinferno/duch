"use client";

import { useSearchParams, useRouter } from "next/navigation";
import SuccessView from "../../components/SuccessView";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const videoId = searchParams.get("videoId");

  const bundleId = searchParams.get("bundleId");

  const token = searchParams.get("token");

  return (
    <div className="h-full overflow-auto">
    <SuccessView
      // backward-compatible
      videoId={videoId}
      bundleId={bundleId}
      router={router}
      token={token}
    />
    </div>
  );
}
