# AI Assistant - Quick Setup Reference

## Required Environment Variables

Add these to **Supabase → Settings → Edge Functions → Environment Variables**:

### Option 1: Minimal Setup (Choose One)
```env
# Option A: Use Lovable AI (Recommended for development)
LOVABLE_API_KEY=your_lovable_key

# Option B: Use OpenAI (Most reliable)
OPENAI_API_KEY=sk-your_openai_key
```

### Option 2: Full Production Setup (All Three)
```env
# Primary: Hugging Face MedGemma (Best medical accuracy)
HF_TOKEN=hf_your_hugging_face_token

# Secondary: Lovable AI (Vision-capable, image analysis)
LOVABLE_API_KEY=your_lovable_key

# Fallback: OpenAI GPT-3.5 (Most reliable)
OPENAI_API_KEY=sk-your_openai_key
```

## Get API Keys

| Service | URL | Notes |
|---------|-----|-------|
| Hugging Face | https://huggingface.co/settings/tokens | Free tier: 1K requests/month |
| Lovable AI | Check your Lovable dashboard | Usually included in subscription |
| OpenAI | https://platform.openai.com/api-keys | Pay-as-you-go, ~$0.002/request |

## Deploy Functions

```bash
# Deploy all three functions
supabase functions deploy medgemma-chat
supabase functions deploy doc-chat
supabase functions deploy med-ai
```

## Test

```bash
# Quick test
supabase functions invoke doc-chat --body '{"message":"Hello"}'
```

## Fallback Chain

```
User Message
    ↓
medgemma-chat (HF_TOKEN) ──✗──→ doc-chat (LOVABLE_API_KEY) ──✗──→ med-ai (OPENAI_API_KEY)
    ↓                              ↓                                  ↓
  Success                        Success                            Success
    ↓                              ↓                                  ↓
  Response ←─────────────────────────────────────────────────────────┘
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| "HF_TOKEN not configured" | Add HF_TOKEN or let it fall back to doc-chat |
| "LOVABLE_API_KEY not configured" | Add LOVABLE_API_KEY or let it fall back to med-ai |
| "OPENAI_API_KEY not configured" | Add OPENAI_API_KEY (required for final fallback) |
| "All AI functions failed" | Check at least one API key is configured correctly |

## Features by Function

| Feature | medgemma-chat | doc-chat | med-ai |
|---------|---------------|----------|--------|
| Text chat | ✅ | ✅ | ✅ |
| Medical knowledge | ✅✅✅ | ✅✅ | ✅ |
| Image analysis | ❌ | ✅✅✅ | ❌ |
| Conversation history | ✅ | ✅ | ✅ |
| Diagnosis tracking | ❌ | ✅ | ❌ |
| Emergency detection | ✅ | ✅ | ✅ |

## Recommended Setup

**Development**: `LOVABLE_API_KEY` only  
**Production**: All three for maximum reliability

---

For detailed setup, see [AI_SETUP.md](./AI_SETUP.md)
