# AI Edge Functions Deployment Script
# This script deploys all three AI Edge Functions to Supabase

Write-Host "🚀 Deploying AI Edge Functions to Supabase..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "✅ Supabase CLI detected: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📋 Deploying functions in order..." -ForegroundColor Cyan
Write-Host ""

# Deploy medgemma-chat (Primary)
Write-Host "1️⃣  Deploying medgemma-chat (Primary - Hugging Face MedGemma)..." -ForegroundColor Yellow
try {
    supabase functions deploy medgemma-chat
    Write-Host "   ✅ medgemma-chat deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  medgemma-chat deployment failed (will use fallback)" -ForegroundColor Yellow
}

Write-Host ""

# Deploy doc-chat (Secondary)
Write-Host "2️⃣  Deploying doc-chat (Secondary - Lovable AI with Vision)..." -ForegroundColor Yellow
try {
    supabase functions deploy doc-chat
    Write-Host "   ✅ doc-chat deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  doc-chat deployment failed (will use fallback)" -ForegroundColor Yellow
}

Write-Host ""

# Deploy med-ai (Final Fallback)
Write-Host "3️⃣  Deploying med-ai (Fallback - OpenAI GPT-3.5)..." -ForegroundColor Yellow
try {
    supabase functions deploy med-ai
    Write-Host "   ✅ med-ai deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ med-ai deployment failed - this is the final fallback!" -ForegroundColor Red
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✨ Deployment Complete!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Reminder about environment variables
Write-Host "📝 IMPORTANT: Configure Environment Variables" -ForegroundColor Yellow
Write-Host ""
Write-Host "Go to Supabase Dashboard → Settings → Edge Functions → Environment Variables" -ForegroundColor White
Write-Host ""
Write-Host "Required variables (configure at least one):" -ForegroundColor White
Write-Host "  • HF_TOKEN           - For medgemma-chat (Hugging Face)" -ForegroundColor Gray
Write-Host "  • LOVABLE_API_KEY    - For doc-chat (Lovable AI)" -ForegroundColor Gray
Write-Host "  • OPENAI_API_KEY     - For med-ai (OpenAI)" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed setup instructions, see:" -ForegroundColor White
Write-Host "  📄 supabase/AI_SETUP.md" -ForegroundColor Cyan
Write-Host "  📄 supabase/AI_QUICK_REFERENCE.md" -ForegroundColor Cyan
Write-Host ""

# Test option
Write-Host "Would you like to test the functions now? (Y/N)" -ForegroundColor Yellow
$test = Read-Host

if ($test -eq "Y" -or $test -eq "y") {
    Write-Host ""
    Write-Host "🧪 Testing AI functions..." -ForegroundColor Cyan
    Write-Host ""
    
    $testMessage = '{"message":"Hello, I have a headache. What should I do?"}'
    
    Write-Host "Testing doc-chat..." -ForegroundColor Yellow
    try {
        supabase functions invoke doc-chat --body $testMessage
        Write-Host "✅ doc-chat test passed" -ForegroundColor Green
    } catch {
        Write-Host "❌ doc-chat test failed" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "For more comprehensive testing, see AI_SETUP.md" -ForegroundColor White
}

Write-Host ""
Write-Host "🎉 All done! Your AI Diagnostic Assistant is ready." -ForegroundColor Green
Write-Host ""
