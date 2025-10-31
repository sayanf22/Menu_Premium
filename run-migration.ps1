# PowerShell script to run the admin dashboard migration
# This uses the Supabase REST API to execute SQL

$projectId = "pnakpaqvjxzoekrneumk"
$accessToken = "sbp_0e4f20e9ed1240ac83796bdf2ce6dd17d62281e2"
$apiUrl = "https://api.supabase.com/v1/projects/$projectId/database/query"

# Read the SQL migration file
$sqlContent = Get-Content -Path "supabase/migrations/add_admin_dashboard_schema.sql" -Raw

# Create the request body
$body = @{
    query = $sqlContent
} | ConvertTo-Json

# Set headers
$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

Write-Host "Executing migration..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body
    Write-Host "✅ Migration executed successfully!" -ForegroundColor Green
    Write-Host $response
} catch {
    Write-Host "❌ Error executing migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.ErrorDetails.Message
}

Write-Host "`nNext step: Generate TypeScript types" -ForegroundColor Cyan
Write-Host "Run: npx supabase gen types typescript --project-id $projectId > src/integrations/supabase/types.ts"
