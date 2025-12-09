/**
 * Cloudflare R2 Upload Utility
 * Secure image upload using presigned URLs
 */

import { supabase } from "@/integrations/supabase/client";

// Public URL from environment (safe to expose - only for reading images)
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || "https://pub-733cdd5e35b24ecaa9230ba7b85ffe49.r2.dev";

// Allowed file types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: JPEG, PNG, WebP, GIF`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename for upload
 */
function sanitizeFilename(filename: string): string {
  // Get extension
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  // Generate safe filename with timestamp
  const safeName = `image_${Date.now()}`;
  return `${safeName}.${ext}`;
}

/**
 * Get presigned URL from Edge Function
 */
async function getPresignedUrl(
  fileName: string,
  fileType: string,
  fileSize: number,
  folder: string = "menu-items"
): Promise<PresignedUrlResponse> {
  // Sanitize filename before sending
  const safeFileName = sanitizeFilename(fileName);
  
  const { data, error } = await supabase.functions.invoke("r2-presigned-url", {
    body: { fileName: safeFileName, fileType, fileSize, folder },
  });

  if (error) {
    throw new Error(error.message || "Failed to get upload URL");
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data as PresignedUrlResponse;
}

/**
 * Upload file to R2 using presigned URL
 */
export async function uploadToR2(
  file: File,
  folder: string = "menu-items",
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Get presigned URL
    const { uploadUrl, publicUrl } = await getPresignedUrl(
      file.name,
      file.type,
      file.size,
      folder
    );

    // Upload to R2
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    // Report 100% progress
    if (onProgress) {
      onProgress(100);
    }

    return { success: true, publicUrl };
  } catch (error: any) {
    console.error("R2 upload error:", error);
    return {
      success: false,
      error: error.message || "Upload failed. Please try again.",
    };
  }
}

/**
 * Upload with progress tracking using XMLHttpRequest
 */
export async function uploadToR2WithProgress(
  file: File,
  folder: string = "menu-items",
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Get presigned URL
    const { uploadUrl, publicUrl } = await getPresignedUrl(
      file.name,
      file.type,
      file.size,
      folder
    );

    // Upload with progress tracking
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: true, publicUrl });
        } else {
          resolve({ success: false, error: `Upload failed: ${xhr.statusText}` });
        }
      });

      xhr.addEventListener("error", () => {
        resolve({ success: false, error: "Network error during upload" });
      });

      xhr.addEventListener("abort", () => {
        resolve({ success: false, error: "Upload cancelled" });
      });

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  } catch (error: any) {
    console.error("R2 upload error:", error);
    return {
      success: false,
      error: error.message || "Upload failed. Please try again.",
    };
  }
}

/**
 * Get R2 public URL from key
 */
export function getR2PublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Check if URL is from R2
 */
export function isR2Url(url: string): boolean {
  return url.includes("r2.dev") || url.includes("r2.cloudflarestorage.com");
}

/**
 * Delete a single file from R2 storage
 * @param imageUrl - The public URL of the image to delete
 * @returns Promise with success status
 */
export async function deleteFromR2(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Skip if not an R2 URL
    if (!isR2Url(imageUrl)) {
      console.log("Skipping non-R2 URL:", imageUrl);
      return { success: true }; // Not an error, just skip
    }

    const { data, error } = await supabase.functions.invoke("r2-delete", {
      body: { imageUrl },
    });

    if (error) {
      console.error("R2 delete error:", error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      console.error("R2 delete error:", data.error);
      return { success: false, error: data.error };
    }

    console.log("✅ Deleted from R2:", imageUrl);
    return { success: true };
  } catch (err: any) {
    console.error("R2 delete exception:", err);
    return { success: false, error: err.message || "Failed to delete image" };
  }
}

/**
 * Delete multiple files from R2 storage
 * @param imageUrls - Array of public URLs to delete
 * @returns Promise with results for each URL
 */
export async function deleteMultipleFromR2(
  imageUrls: string[]
): Promise<{ success: boolean; results: { url: string; success: boolean; error?: string }[] }> {
  try {
    // Filter to only R2 URLs
    const r2Urls = imageUrls.filter(isR2Url);
    
    if (r2Urls.length === 0) {
      return { success: true, results: [] };
    }

    const { data, error } = await supabase.functions.invoke("r2-delete", {
      body: { imageUrls: r2Urls },
    });

    if (error) {
      console.error("R2 bulk delete error:", error);
      return { 
        success: false, 
        results: r2Urls.map(url => ({ url, success: false, error: error.message }))
      };
    }

    console.log(`✅ Bulk delete from R2: ${data?.results?.filter((r: any) => r.success).length}/${r2Urls.length} files`);
    return { 
      success: data?.success || false, 
      results: data?.results || [] 
    };
  } catch (err: any) {
    console.error("R2 bulk delete exception:", err);
    return { 
      success: false, 
      results: imageUrls.map(url => ({ url, success: false, error: err.message }))
    };
  }
}
