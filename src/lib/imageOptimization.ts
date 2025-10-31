/**
 * Image Optimization Utilities
 * Reduces storage and bandwidth costs while maintaining quality
 */

// Menu item images: High quality, reasonable size
export const MENU_MAX_DIMENSION = 1200; // 1200px for sharp display
export const MENU_QUALITY = 0.85; // 85% quality - excellent quality
export const MENU_TARGET_SIZE = 80 * 1024; // Target 80KB

// Logo images: Smaller, high quality
export const LOGO_MAX_DIMENSION = 500; // 500px for logos
export const LOGO_QUALITY = 0.90; // 90% quality - top quality for logos
export const LOGO_TARGET_SIZE = 50 * 1024; // Target 50KB

/**
 * Compress an image file with smart quality adjustment
 * Automatically finds the best quality/size balance
 */
export async function compressImage(
  file: File,
  type: 'menu' | 'logo' = 'menu'
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = async () => {
        const config = type === 'logo' 
          ? { maxDim: LOGO_MAX_DIMENSION, quality: LOGO_QUALITY, target: LOGO_TARGET_SIZE }
          : { maxDim: MENU_MAX_DIMENSION, quality: MENU_QUALITY, target: MENU_TARGET_SIZE };
        
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > config.maxDim || height > config.maxDim) {
          if (width > height) {
            height = Math.round((height / width) * config.maxDim);
            width = config.maxDim;
          } else {
            width = Math.round((width / height) * config.maxDim);
            height = config.maxDim;
          }
        }
        
        // Create canvas with high-quality rendering
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d', {
          alpha: false, // No transparency for better compression
          desynchronized: true,
        });
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw image with high quality
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try to compress to target size with quality adjustment
        let quality = config.quality;
        let attempts = 0;
        const maxAttempts = 5;
        
        const tryCompress = (currentQuality: number): Promise<Blob | null> => {
          return new Promise((resolveBlob) => {
            canvas.toBlob(
              (blob) => resolveBlob(blob),
              'image/jpeg',
              currentQuality
            );
          });
        };
        
        const findOptimalQuality = async (): Promise<Blob> => {
          let blob = await tryCompress(quality);
          
          // If first attempt is under target, we're done
          if (blob && blob.size <= config.target) {
            return blob;
          }
          
          // Binary search for optimal quality
          let minQuality = 0.5;
          let maxQuality = quality;
          
          while (attempts < maxAttempts && blob) {
            attempts++;
            
            if (blob.size > config.target * 1.2) {
              // Too large, reduce quality
              maxQuality = quality;
              quality = (minQuality + quality) / 2;
            } else if (blob.size < config.target * 0.8) {
              // Too small, increase quality
              minQuality = quality;
              quality = (quality + maxQuality) / 2;
            } else {
              // Close enough!
              break;
            }
            
            blob = await tryCompress(quality);
          }
          
          return blob!;
        };
        
        try {
          const finalBlob = await findOptimalQuality();
          
          if (!finalBlob) {
            reject(new Error('Could not compress image'));
            return;
          }
          
          // Create new file from blob
          const compressedFile = new File([finalBlob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          const originalKB = (file.size / 1024).toFixed(1);
          const compressedKB = (compressedFile.size / 1024).toFixed(1);
          const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(0);
          
          console.log(`📦 ${type.toUpperCase()} compressed: ${originalKB}KB → ${compressedKB}KB (${reduction}% reduction, quality: ${(quality * 100).toFixed(0)}%)`);
          
          resolve(compressedFile);
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }
  
  // Check file size (before compression)
  if (file.size > 5 * 1024 * 1024) { // 5MB max before compression
    return { valid: false, error: 'Image must be smaller than 5MB' };
  }
  
  return { valid: true };
}

/**
 * Get optimized image URL from Supabase Storage
 * Uses Supabase's image transformation API
 */
export function getOptimizedImageUrl(
  publicUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): string {
  const { width = 400, quality = 80 } = options;
  
  // Add transformation parameters
  const url = new URL(publicUrl);
  url.searchParams.set('width', width.toString());
  url.searchParams.set('quality', quality.toString());
  
  return url.toString();
}

/**
 * Preload critical images for better performance
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Calculate estimated storage cost
 */
export function estimateStorageCost(fileSizeBytes: number): {
  size: string;
  monthlyCost: number;
} {
  const sizeKB = fileSizeBytes / 1024;
  const sizeMB = sizeKB / 1024;
  
  // Supabase storage: $0.021 per GB/month
  const costPerMB = 0.021 / 1024;
  const monthlyCost = sizeMB * costPerMB;
  
  return {
    size: sizeMB < 1 ? `${sizeKB.toFixed(1)} KB` : `${sizeMB.toFixed(2)} MB`,
    monthlyCost: parseFloat(monthlyCost.toFixed(4)),
  };
}
