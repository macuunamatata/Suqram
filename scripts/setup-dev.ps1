# Setup script for local development
# Creates .dev.vars file with ADMIN_API_KEY

Write-Host "Setting up local development environment..." -ForegroundColor Cyan
Write-Host ""

$devVarsPath = ".dev.vars"

# Check if .dev.vars already exists
if (Test-Path $devVarsPath) {
    Write-Host ".dev.vars already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Overwrite? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Skipping .dev.vars creation" -ForegroundColor Yellow
        exit 0
    }
}

# Prompt for ADMIN_API_KEY
Write-Host ""
Write-Host "Enter ADMIN_API_KEY (press Enter for default 'kuk'):" -ForegroundColor Cyan
$adminKey = Read-Host

if ([string]::IsNullOrWhiteSpace($adminKey)) {
    $adminKey = "kuk"
    Write-Host "Using default: kuk" -ForegroundColor Yellow
}

# Write .dev.vars file
$content = "ADMIN_API_KEY=$adminKey"
Set-Content -Path $devVarsPath -Value $content -NoNewline

Write-Host ""
Write-Host "✓ Created .dev.vars with ADMIN_API_KEY" -ForegroundColor Green
Write-Host ""
Write-Host "Now restart: npm run dev" -ForegroundColor Cyan
Write-Host ""
