// core.js
import { createUploadthing } from "uploadthing/next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth"; // your auth config
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB" } })
    .middleware(async ({ req }) => {
      const session = await getServerSession(authOptions);

      if (!session || !session.user || !session.user.isAdmin) {
        throw new UploadThingError("Unauthorized");
      }

      return { userId: session.user.id }; // optional metadata
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for user:", metadata.userId, ufs.url);
    }),
};
