"use client";

import { useSearchParams, useRouter } from "next/navigation";
import SuccessView from "../../components/SuccessView";
export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const videoId = searchParams.get("videoId");

  return <SuccessView videoId={videoId} urlHandle={null} router={router} />;
}
