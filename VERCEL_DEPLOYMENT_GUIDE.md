# 🚀 Vercel Deployment Guide - Simple Steps
## Deploy Your Fact Find & Test Mercury Integration

---

## 📋 What We're Doing

Putting your fact find online so you can:
1. Test it like a real broker would use it
2. Verify Mercury API connection works
3. See the complete workflow in action

**Time:** 20 minutes total
**Cost:** $0 (Vercel is free for this use case)

---

## ✅ Step 1: Create Vercel Account (2 minutes)

### What to do:
1. Go to: https://vercel.com/signup
2. Click **"Continue with GitHub"** (easiest option)
3. If you don't have GitHub:
   - Click "Continue with Email" instead
   - Enter your email
   - Check your inbox for verification email
   - Click the link to verify
4. You're in! ✅

**What you should see:** Vercel dashboard with "Create a New Project" button

---

## ✅ Step 2: Prepare Your Project Files (Already Done!)

Your fact find files are ready in `/home/claude/fact-find/`:
- ✅ All 5 polished step components
- ✅ Main app component
- ✅ Mercury API service
- ✅ Design system (styles.css)

**You're all set for this step!** ✅

---

## ✅ Step 3: Upload to GitHub (5 minutes)

Since we built everything in Claude, we need to get the files into GitHub so Vercel can deploy them.

### Option A: Use GitHub Desktop (Easier)
1. Download GitHub Desktop: https://desktop.github.com/
2. Install and sign in with your GitHub account
3. Click "Create a New Repository"
4. Name it: `hof-fact-find`
5. Choose location on your computer
6. Click "Create Repository"
7. Copy all files from `/home/claude/fact-find/` to this folder
8. GitHub Desktop will show the files as "changes"
9. Click "Commit to main"
10. Click "Publish repository"
11. Done! ✅

### Option B: Use GitHub Website (Quick but manual)
1. Go to: https://github.com/new
2. Repository name: `hof-fact-find`
3. Make it Private (recommended)
4. Click "Create repository"
5. Click "uploading an existing file"
6. Drag all files from `/home/claude/fact-find/` into the upload area
7. Click "Commit changes"
8. Done! ✅

**What you should have:** A GitHub repository with all your fact find files

---

## ✅ Step 4: Connect Vercel to GitHub (3 minutes)

### What to do:
1. Go back to Vercel dashboard: https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. You'll see "Import Git Repository"
4. Click **"Connect GitHub"** (if not already connected)
5. Allow Vercel to access your GitHub
6. You should see your `hof-fact-find` repository listed
7. Click **"Import"** next to it

**What you should see:** Project configuration screen

---

## ✅ Step 5: Configure Project (2 minutes)

On the configuration screen:

### Framework Preset:
- Select **"React"** (or **"Next.js"** if that's what you used)

### Root Directory:
- Leave as `.` (root)

### Build Command:
- Leave as default (usually `npm run build`)

### Output Directory:
- Leave as default (usually `build` or `dist`)

### Environment Variables:
**IMPORTANT:** Add your Mercury API credentials here!

Click **"Environment Variables"** section and add:

1. **Name:** `MERCURY_API_KEY`
   **Value:** [Paste your API Key from Mercury]

2. **Name:** `MERCURY_API_TOKEN`
   **Value:** [Paste your API Token from Mercury]

3. **Name:** `MERCURY_ENV`
   **Value:** `sandbox`

4. **Name:** `NEXT_PUBLIC_MERCURY_API_URL`
   **Value:** `https://uatapis.connective.com.au/mercury/v1`

### Then:
- Click **"Deploy"**

**What happens:** Vercel builds and deploys your fact find (takes 2-3 minutes)

---

## ✅ Step 6: Wait for Deployment (3 minutes)

You'll see a deployment progress screen with:
- ⏳ Installing dependencies
- ⏳ Building application
- ⏳ Deploying to production

**Wait for:** ✅ "Deployment Ready" message with confetti 🎉

**What you'll get:** A live URL like: `https://hof-fact-find-xyz123.vercel.app`

---

## ✅ Step 7: Test Your Fact Find! (5 minutes)

### Open your live fact find:
1. Click the URL Vercel gave you
2. You should see your beautiful polished fact find! 🎉

### Fill in test data:

**Step 0 - Loan Strategy:**
- Broker Name: Test Broker
- Broker Email: testbroker@example.com
- Client Type: New
- Number of Applicants: 1

**Security 1:**
- Address: 123 Test Property, Sydney NSW 2000
- Property Value: 750000
- Loan Amount: 600000
- Transaction Type: Purchase
- Occupancy: Owner Occupied
- Application Type: Full Doc

**Step 1 - Applicants:**
- Type: Natural Person
- First Name: John
- Last Name: TestClient
- Email: john.testclient@example.com
- Phone: 0400123456
- DOB: 15/01/1990
- Gender: Male
- Marital Status: Single
- Residency: Australian Citizen
- Address: 123 Test Street, Sydney NSW 2000

**Step 2 - Employment:**
- Status: Employed
- Type: PAYG Full Time
- Employer: Test Company Pty Ltd
- Position: Manager
- Start Date: 01/01/2020
- (You can skip income for now - just testing the submission)

**Step 3 - Assets & Liabilities:**
- (You can skip this for testing - just testing the submission)

**Step 4 - Review:**
- Check everything looks correct
- Click **"Submit to Processing"**

---

## ✅ Step 8: Watch for Success! (30 seconds)

After clicking Submit, you should see:

**If successful:**
```
✅ Fact Find Submitted Successfully!
Contact created: John TestClient
Opportunity created: $600,000 loan
```

**If error:**
You'll see specific error messages telling you what went wrong

---

## ✅ Step 9: Verify in Mercury Sandbox (2 minutes)

### Check the contact was created:
1. Go to: https://login.connective.com.au/
2. Log in to Mercury
3. **Make sure you're in SANDBOX** (look for sandbox indicator)
4. Go to **Contacts** section
5. Search for: `john.testclient@example.com`
6. You should see **John TestClient** ✅

### Check the opportunity was created:
1. Go to **Opportunities** section
2. Look for recent entries
3. You should see one with:
   - Property: 123 Test Property, Sydney NSW 2000
   - Loan: $600,000
   - Broker: Test Broker
   - LVR: 80%

**If you see both → SUCCESS!** 🎉

---

## 🚨 Troubleshooting

### Problem: "Environment variables not found"
**Solution:** 
1. Go to Vercel dashboard
2. Click on your project
3. Go to Settings → Environment Variables
4. Make sure all 4 variables are there
5. Redeploy the project

### Problem: "401 Unauthorized" error
**Solution:**
- Your API keys are wrong
- Double-check you copied them correctly
- Try getting fresh keys from Mercury

### Problem: "Cannot connect to Mercury"
**Solution:**
- Check you used the Sandbox URL (not production)
- Verify your internet connection
- Wait a minute and try again

### Problem: Nothing appears in Mercury
**Solution:**
- Make sure you're looking in **Sandbox**, not production
- Wait 30 seconds and refresh
- Check browser console for errors (F12)

---

## ✅ Success! What's Next?

Once testing passes:

### 1. Switch to Production (5 minutes)
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Update `MERCURY_ENV` to `production`
3. Update `NEXT_PUBLIC_MERCURY_API_URL` to `https://apis.connective.com.au/mercury/v1`
4. Use your **Production** API keys (not sandbox)
5. Redeploy

### 2. Get Your Permanent URL (1 minute)
1. In Vercel, go to Settings → Domains
2. Add a custom domain like: `factfind.houseoffinance.com.au`
3. Follow Vercel's DNS instructions
4. Done! You have a professional URL

### 3. Train Your Brokers (15 minutes)
1. Show them the URL
2. Walk them through filling in a fact find
3. Explain it submits directly to Mercury
4. Give them the URL to bookmark

### 4. You're Live! 🎉
- Brokers can now submit fact finds
- Data flows directly to Mercury
- No manual re-entry needed!

---

## 📊 Deployment Checklist

Mark each as you complete it:

- [ ] Created Vercel account
- [ ] Uploaded files to GitHub
- [ ] Connected Vercel to GitHub
- [ ] Configured project settings
- [ ] Added environment variables (API keys)
- [ ] Deployed successfully
- [ ] Tested fact find form
- [ ] Submitted test data
- [ ] Verified contact in Mercury Sandbox
- [ ] Verified opportunity in Mercury Sandbox
- [ ] **TESTING PASSED!** ✅

---

## 💡 Pro Tips

1. **Bookmark your Vercel dashboard** - Easy access to logs and settings
2. **Save your test data** - Use the same test data each time for consistency
3. **Check logs if something fails** - Vercel shows detailed error logs
4. **Test multiple times** - Make sure it works consistently
5. **Don't rush to production** - Test thoroughly in Sandbox first

---

## 🎓 Summary

**What we did:**
1. ✅ Created Vercel account (free)
2. ✅ Uploaded code to GitHub
3. ✅ Deployed fact find to web
4. ✅ Configured Mercury API credentials
5. ✅ Tested complete submission workflow
6. ✅ Verified data appeared in Mercury

**What you now have:**
- 🌐 Live fact find website
- 🔗 Direct Mercury CRM integration
- ✅ Tested and working
- 🚀 Ready for brokers to use!

---

**Ready to start?** Begin with Step 1: Create Vercel Account!

Let me know when you complete each step and I'll help if you get stuck! 🎯
