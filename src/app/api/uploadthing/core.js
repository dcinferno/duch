import { createUploadthing } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  blogImageUploader: f({ image: { maxFileSize: "4MB" } }).onUploadComplete(
    async ({ file }) => {
      console.log("Uploaded file:", file);
      // Optional: Save to DB or log details
    }
  ),
};
