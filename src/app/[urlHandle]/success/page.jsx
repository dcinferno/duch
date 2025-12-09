"use client";

import { useSearchParams, useParams, useRouter } from "next/navigation";
import SuccessView from "../../../components/SuccessView";

export default function CreatorSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlHandle = params.urlHandle;
  const videoId = searchParams.get("videoId");

  return (
    <SuccessView videoId={videoId} urlHandle={urlHandle} router={router} />
  );
}
