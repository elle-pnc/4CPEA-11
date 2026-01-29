# Firebase Cloud Functions Pricing

## Yes, you need Blaze Plan (Pay-as-you-go)

Firebase Cloud Functions requires the **Blaze plan** (pay-as-you-go), BUT it has a **very generous free tier** that covers most apps.

## Free Tier (Included with Blaze Plan)

### What you get for FREE:

1. **Function Invocations:**
   - ✅ **2 million invocations per month** (FREE)
   - After: $0.40 per million

2. **Compute Time:**
   - ✅ **400,000 GB-seconds per month** (FREE)
   - ✅ **200,000 CPU-seconds per month** (FREE)
   - After: Based on usage

3. **Network Egress:**
   - ✅ **First 5 GB per month** (FREE)
   - After: $0.12 per GB

## Cost Estimate for Your 2FA App

### Typical Usage:
- Small app: ~100-1,000 logins/month = **FREE** ✅
- Medium app: ~5,000-10,000 logins/month = **FREE** ✅
- Large app: ~50,000 logins/month = **FREE** ✅

### Example Calculation:
- **100 logins/month** = 100 function calls
- Cost: **$0.00** (well under 2 million free tier)

- **1,000 logins/month** = 1,000 function calls
- Cost: **$0.00** (still well under 2 million free tier)

- **10,000 logins/month** = 10,000 function calls
- Cost: **$0.00** (still well under 2 million free tier)

- **100,000 logins/month** = 100,000 function calls
- Cost: **$0.00** (still under 2 million free tier)

### When you start paying:
- Only if you exceed **2 million invocations/month**
- That's 2,000,000 login attempts per month!
- Even then, it's only $0.40 per million after that

## What This Means

### For Your Use Case:
- ✅ **Student project / small app**: Almost certainly **FREE**
- ✅ **Testing / development**: **FREE**
- ✅ **Most production apps**: **FREE**

### You'll likely pay:
- **$0.00** for typical usage
- Even with 100,000+ logins per month, you'll stay in the free tier

## How to Enable Blaze Plan

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `cpe11-48f3f`
3. Click **"Upgrade"** or **"View billing account"**
4. Add a payment method (credit card)
5. **You won't be charged unless you exceed free tier**
6. Firebase will notify you if you approach limits

## Important Notes

- ⚠️ You **must** add a payment method to enable Blaze plan
- ✅ But you **won't be charged** for free tier usage
- ✅ Firebase will **warn you** before you exceed free tier
- ✅ You can **set spending limits** to prevent unexpected charges
- ✅ You can **disable functions** if you want to stop all charges

## Cost Protection

Set a **budget alert** in Firebase Console:
1. Go to Firebase Console → Usage and Billing
2. Set a budget limit (e.g., $5/month)
3. Get email alerts before you reach it

## Alternative (If you don't want to enable Blaze)

If you absolutely don't want to enable Blaze plan, you have these options:

1. **Use a free email service** (e.g., SendGrid - 100 emails/day free)
2. **Custom backend** (Node.js on free hosting like Railway, Render)
3. **Local testing only** (functions run on your computer)

But honestly, the Firebase free tier is so generous, you'll likely never pay anything.

## Recommendation

✅ **Enable Blaze plan** - The free tier will cover your needs, and you'll have access to all Firebase features. You can set spending limits and alerts to protect yourself.

## Summary

- **Requires**: Blaze plan (pay-as-you-go)
- **Free Tier**: 2 million invocations/month
- **Your Usage**: Likely ~100-10,000 logins/month
- **Your Cost**: **$0.00** (well within free tier)
- **Risk**: Very low (set spending alerts if worried)
