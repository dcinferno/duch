"use client";

import BundleCard from "@/components/BundleCard";
import VideoGridClient from "@/components/VideoGridClient";
import { startCheckout } from "@/lib/startCheckout";

export default function CreatorGrid({ videos = [], bundles = [], creatorHeader }) {
  const hasVideos = videos.length > 0;
  const hasBundles = bundles.length > 0;
  const shouldCollapseBundles = bundles.length > 2;

  const bundleHeader = hasBundles ? (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
      {bundles.map((bundle) => (
        <BundleCard
          key={bundle._id}
          bundle={bundle}
          onBuy={() =>
            startCheckout({
              type: "bundle",
              bundleId: bundle._id,
            })
          }
          shouldCollapse={shouldCollapseBundles}
        />
      ))}
    </div>
  ) : null;

  return (
    <>
      {hasVideos ? (
        <VideoGridClient
          videos={videos}
          showCreatorPageLink={false}
          headerContent={<>{creatorHeader}{bundleHeader}</>}
        />
      ) : (
        <VideoGridClient
          videos={[]}
          showCreatorPageLink={false}
          headerContent={<>{creatorHeader}{bundleHeader}</>}
        />
      )}
    </>
  );
}
