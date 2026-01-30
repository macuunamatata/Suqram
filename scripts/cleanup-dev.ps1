# Cleanup script for Windows local development
# Kills processes on ports 8976 (OAuth callback) and 8787 (worker dev server)
# Deletes .wrangler/tmp directory to prevent bundling errors

Write-Host "Cleaning up local dev environment..." -ForegroundColor Yellow

# Function to kill process on a port
function Kill-Port {
    param([int]$Port)
    
    $connections = netstat -ano | findstr ":$Port"
    if ($connections) {
        Write-Host "Found processes on port $Port" -ForegroundColor Yellow
        $connections | ForEach-Object {
            $parts = $_ -split '\s+'
            $processId = $parts[-1]
            if ($processId -and $processId -ne '0') {
                try {
                    Write-Host "Killing process $processId on port $Port" -ForegroundColor Yellow
                    taskkill /PID $processId /F 2>$null
                } catch {
                    Write-Host "Could not kill process $processId (may already be terminated)" -ForegroundColor Gray
                }
            }
        }
    } else {
        Write-Host "No processes found on port $Port" -ForegroundColor Green
    }
}

# Kill processes on ports 8976 and 8787
Kill-Port -Port 8976
Kill-Port -Port 8787

# Delete .wrangler/tmp directory
$tmpDir = Join-Path $PSScriptRoot "..\.wrangler\tmp"
if (Test-Path $tmpDir) {
    Write-Host "Deleting .wrangler/tmp directory..." -ForegroundColor Yellow
    Remove-Item -Path $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Deleted .wrangler/tmp" -ForegroundColor Green
} else {
    Write-Host ".wrangler/tmp does not exist" -ForegroundColor Green
}

Write-Host "Cleanup complete!" -ForegroundColor Green
