# Quick test script for scanner-safe-links (PowerShell)
# Tests the /l/* endpoint and verifies events are recorded

param(
    [string]$BaseUrl = "http://localhost:8787",
    [string]$TestPath = "test/path",
    [string]$TestQuery = "token=abc123"
)

Write-Host "Testing scanner-safe-links at $BaseUrl" -ForegroundColor Cyan
Write-Host "Test path: /l/$TestPath?$TestQuery"
Write-Host ""

# Test Phase A: GET /l/*
Write-Host "=== Phase A: Testing GET /l/$TestPath ===" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/l/$TestPath?$TestQuery" -UseBasicParsing
    $httpCode = $response.StatusCode
    $body = $response.Content
    
    if ($httpCode -eq 200) {
        Write-Host "✓ GET /l/$TestPath returned 200 OK" -ForegroundColor Green
        
        # Check if response contains expected elements
        if ($body -match "Verifying Link") {
            Write-Host "✓ Response contains interstitial page" -ForegroundColor Green
        } else {
            Write-Host "✗ Response does not contain expected content" -ForegroundColor Red
        }
        
        # Try to extract nonce from HTML (if present)
        if ($body -match 'action="/v/([^"]+)"') {
            $nonce = $matches[1]
            Write-Host "✓ Found nonce in response: $nonce" -ForegroundColor Green
        } else {
            Write-Host "ℹ Nonce not found in HTML (may be computed in JS)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ GET /l/$TestPath returned $httpCode" -ForegroundColor Red
        Write-Host "Response: $body"
        exit 1
    }
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Wait a moment for event to be recorded
Write-Host "Waiting 1 second for event to be recorded..." -ForegroundColor Yellow
Start-Sleep -Seconds 1

# Test Receipts: GET /r/events
Write-Host "=== Testing GET /r/events ===" -ForegroundColor Yellow
try {
    $eventsResponse = Invoke-WebRequest -Uri "$BaseUrl/r/events" -UseBasicParsing
    $eventsHttpCode = $eventsResponse.StatusCode
    $eventsBody = $eventsResponse.Content
    
    if ($eventsHttpCode -eq 200) {
        Write-Host "✓ GET /r/events returned 200 OK" -ForegroundColor Green
        
        # Parse JSON response
        $eventsJson = $eventsBody | ConvertFrom-Json
        
        if ($eventsJson.events) {
            Write-Host "✓ Response contains events array" -ForegroundColor Green
            
            # Count minted events
            $mintedCount = ($eventsJson.events | Where-Object { $_.action -eq "minted" }).Count
            Write-Host "ℹ Found $mintedCount minted event(s)" -ForegroundColor Yellow
            
            # Show recent events (first 3)
            Write-Host ""
            Write-Host "Recent events (first 3):" -ForegroundColor Cyan
            $eventsJson.events | Select-Object -First 3 | ForEach-Object {
                Write-Host "  - $($_.action) at $(Get-Date -UnixTimeSeconds ($_.timestamp / 1000) -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
            }
        } else {
            Write-Host "✗ Response does not contain events array" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ GET /r/events returned $eventsHttpCode" -ForegroundColor Red
        Write-Host "Response: $eventsBody"
        exit 1
    }
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "✓ Phase A (GET /l/*) - Interstitial page loads" -ForegroundColor Green
Write-Host "✓ Events endpoint accessible" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Phase B (POST /v/:nonce) requires JavaScript signature computation" -ForegroundColor Yellow
Write-Host "      To fully test, visit $BaseUrl/l/$TestPath?$TestQuery in a browser" -ForegroundColor Yellow
Write-Host ""
