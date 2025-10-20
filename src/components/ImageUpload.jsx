'use client';

import { UploadButton } from '@uploadthing/react';
import '@uploadthing/react/styles.css';

export default function ImageUpload({ onUploadComplete }) {
  return (
    <UploadButton
      endpoint="blogImageUploader"
      onClientUploadComplete={(res) => {
        if (res && res[0]?.url) {
          onUploadComplete(res[0].url);
        }
      }}
      onUploadError={(err) => {
        console.error('Upload error:', err);
        alert(`Upload failed: ${err.message}`);
      }}
    />
  );
}