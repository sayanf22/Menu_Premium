// Cloudflare R2 Delete Edge Function
// Deletes files from R2 storage using S3-compatible API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// R2 credentials from environment
const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID")!;
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "addmenu-pre-image";

// S3-compatible endpoint for R2
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

/**
 * Extract the R2 key from a public URL
 * Handles both r2.dev and cloudflarestorage.com URLs
 */
function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Remove leading slash
    let path = urlObj.pathname.substring(1);
    
    // Handle URLs with bucket name in path
    if (path.startsWith(R2_BUCKET_NAME + "/")) {
      path = path.substring(R2_BUCKET_NAME.length + 1);
    }
    
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Generate AWS Signature V4 for S3-compatible API
 */
async function signRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  payload: string = ""
): Promise<Record<string, string>> {
  const urlObj = new URL(url);
  const host = urlObj.host;
  const path = urlObj.pathname;
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);
  
  const region = "auto";
  const service = "s3";
  
  // Create canonical request
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const payloadHash = await sha256Hex(payload);
  
  const canonicalRequest = [
    method,
    path,
    "", // query string
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
    signedHeaders,
    payloadHash,
  ].join("\n");
  
  // Create string to sign
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join("\n");
  
  // Calculate signature
  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = await hmacSha256Hex(kSigning, stringToSign);
  
  // Create authorization header
  const authorization = `${algorithm} Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    ...headers,
    "Host": host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    "Authorization": authorization,
  };
}

async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

async function hmacSha256Hex(key: ArrayBuffer, message: string): Promise<string> {
  const result = await hmacSha256(key, message);
  return Array.from(new Uint8Array(result))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client to verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { imageUrl, imageUrls } = await req.json();
    
    // Support both single URL and array of URLs
    const urlsToDelete: string[] = imageUrls || (imageUrl ? [imageUrl] : []);
    
    if (urlsToDelete.length === 0) {
      return new Response(
        JSON.stringify({ error: "No image URL(s) provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { url: string; success: boolean; error?: string }[] = [];

    for (const url of urlsToDelete) {
      // Skip if not an R2 URL
      if (!url.includes("r2.dev") && !url.includes("r2.cloudflarestorage.com")) {
        results.push({ url, success: false, error: "Not an R2 URL" });
        continue;
      }

      const key = extractKeyFromUrl(url);
      if (!key) {
        results.push({ url, success: false, error: "Could not extract key from URL" });
        continue;
      }

      try {
        // Build delete request URL
        const deleteUrl = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
        
        // Sign the request
        const signedHeaders = await signRequest("DELETE", deleteUrl, {});
        
        // Execute delete
        const response = await fetch(deleteUrl, {
          method: "DELETE",
          headers: signedHeaders,
        });

        if (response.ok || response.status === 204) {
          results.push({ url, success: true });
          console.log(`✅ Deleted from R2: ${key}`);
        } else {
          const errorText = await response.text();
          results.push({ url, success: false, error: `R2 error: ${response.status}` });
          console.error(`❌ Failed to delete ${key}: ${response.status} ${errorText}`);
        }
      } catch (err: any) {
        results.push({ url, success: false, error: err.message });
        console.error(`❌ Error deleting ${url}:`, err);
      }
    }

    const allSuccess = results.every(r => r.success);
    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: allSuccess,
        message: `Deleted ${successCount}/${results.length} files`,
        results 
      }),
      { 
        status: allSuccess ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("R2 delete error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
