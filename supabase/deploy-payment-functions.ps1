# Payment Edge Functions Deployment Script
# This script deploys the PayPal payment functions to Supabase using npx

Write-Host "Deploying Payment Edge Functions..." -ForegroundColor Cyan
Write-Host ""

# Check if npx is available
try {
    $npxVersion = npx --version 2>&1
    Write-Host "npx detected: $npxVersion" -ForegroundColor Green
}
catch {
    Write-Host "npx not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploying functions..." -ForegroundColor Cyan
Write-Host ""

# Deploy process-paypal-payment
Write-Host "1. Deploying process-paypal-payment..." -ForegroundColor Yellow
try {
    npx supabase functions deploy process-paypal-payment --no-verify-jwt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Success!" -ForegroundColor Green
    }
    else {
        Write-Host "   Failed!" -ForegroundColor Red
    }
}
catch {
    Write-Host "   Failed!" -ForegroundColor Red
}

Write-Host ""

# Deploy capture-paypal-payment
Write-Host "2. Deploying capture-paypal-payment..." -ForegroundColor Yellow
try {
    npx supabase functions deploy capture-paypal-payment --no-verify-jwt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Success!" -ForegroundColor Green
    }
    else {
        Write-Host "   Failed!" -ForegroundColor Red
    }
}
catch {
    Write-Host "   Failed!" -ForegroundColor Red
}

Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host ""
