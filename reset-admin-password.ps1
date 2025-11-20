# Reset Admin Password Script
# This script helps you reset your admin password easily

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Admin Password Reset Tool" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Get admin email
$email = Read-Host "Enter admin email (press Enter for sayanbanik66@gmail.com)"
if ([string]::IsNullOrWhiteSpace($email)) {
    $email = "sayanbanik66@gmail.com"
}

# Get new password
$password = Read-Host "Enter new password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

Write-Host ""
Write-Host "Updating password for: $email" -ForegroundColor Yellow
Write-Host ""

# Create SQL command
$sql = @"
UPDATE admin_users 
SET password_hash = crypt('$passwordPlain', gen_salt('bf')),
    updated_at = now()
WHERE email = '$email';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'Password updated successfully!'
        ELSE 'Error: Admin user not found'
    END as result
FROM admin_users 
WHERE email = '$email';
"@

# Save to temp file
$tempFile = "temp_reset_password.sql"
$sql | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "SQL file created: $tempFile" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to your Supabase Dashboard" -ForegroundColor White
Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
Write-Host "3. Copy and paste the contents of '$tempFile'" -ForegroundColor White
Write-Host "4. Click 'Run'" -ForegroundColor White
Write-Host ""
Write-Host "Or use this direct SQL:" -ForegroundColor Cyan
Write-Host $sql -ForegroundColor Gray
Write-Host ""

# Offer to open the SQL file
$openFile = Read-Host "Open the SQL file now? (y/n)"
if ($openFile -eq "y") {
    Start-Process notepad.exe $tempFile
}

Write-Host ""
Write-Host "Password reset prepared!" -ForegroundColor Green
Write-Host "After running the SQL, you can login with:" -ForegroundColor Yellow
Write-Host "  Email: $email" -ForegroundColor White
Write-Host "  Password: [the password you just entered]" -ForegroundColor White
Write-Host ""
