# 🧪 Stage 4: Send Test Fact Find to Mercury
## Step-by-Step Testing Guide (Simple Version)

---

## 🎯 What This Test Does

Sends a **practice fact find** with fake data to Mercury's **Sandbox** (practice area) to verify:
1. ✅ Your API keys work
2. ✅ Data flows from fact find → Mercury
3. ✅ Contacts and opportunities are created correctly

**Safe to test:** Sandbox is Mercury's practice area - nothing you do here affects real client data!

---

## 📝 Test Data We'll Use

Here's the fake data we're sending:

### Test Applicant
- **Name:** John TestClient
- **Email:** john.testclient@example.com
- **Phone:** 0400 123 456
- **Date of Birth:** 15 Jan 1990
- **Address:** 123 Test Street, Sydney NSW 2000

### Test Property
- **Address:** 123 Test Property, Sydney NSW 2000
- **Property Value:** $750,000
- **Loan Amount:** $600,000
- **LVR:** 80%
- **Purpose:** Purchase
- **Occupancy:** Owner Occupied

### Test Broker
- **Name:** Test Broker
- **Email:** testbroker@example.com

---

## ⚙️ Testing Options

Since we can't test directly from the browser (CORS security), here are your options:

---

### 🥇 **Option A: Wait for Vercel Deployment** (RECOMMENDED)

**Why this is best:**
- Tests the COMPLETE workflow (exactly how brokers will use it)
- No technical setup required
- Tests everything at once (UI + API)
- Most realistic test

**What to do:**
1. We deploy your fact find to Vercel (15 minutes)
2. You open the live website
3. You fill in the test data above
4. You click "Submit to Processing"
5. We verify it worked in Mercury Sandbox

**Timeline:** Can do this today! Just say "let's deploy to Vercel"

---

### 🥈 **Option B: Manual API Testing** (Technical)

**What this involves:**
Using a tool called **Postman** to manually send API requests to Mercury.

**Steps:**
1. Download Postman (free): https://www.postman.com/downloads/
2. Install and open it
3. Create a new request
4. Configure it with your API keys
5. Send the test data
6. Check Mercury Sandbox

**Pros:** Tests API directly
**Cons:** Requires technical setup, doesn't test the actual form

**Do you want detailed Postman instructions?** (I can provide them if you choose this option)

---

### 🥉 **Option C: Skip to Production**

**What this means:**
- Skip testing entirely
- Deploy straight to production
- Test with your first real fact find

**Pros:** Fastest path to launch
**Cons:** No safety net, could have issues with first real submission

**Not recommended** unless you're okay with potential issues on first use.

---

## 🎯 My Recommendation

**Go with Option A: Deploy to Vercel**

Here's why:
- ✅ Tests the complete workflow
- ✅ No technical setup needed
- ✅ Exactly how brokers will use it
- ✅ Can test multiple times easily
- ✅ Ready to use immediately after testing passes

**Next steps if you choose Option A:**
1. I'll deploy your fact find to Vercel (15 minutes)
2. I'll give you a URL to test
3. You fill in the test data (takes 3 minutes)
4. You click submit
5. We check Mercury Sandbox together
6. If it works → we switch to production credentials
7. You're live! 🎉

---

## 📊 What Success Looks Like

After submitting the test fact find, you should see:

**In Mercury Sandbox:**
1. ✅ **New Contact:** John TestClient
   - Email: john.testclient@example.com
   - Phone: 0400 123 456
   - Address: 123 Test Street, Sydney NSW 2000

2. ✅ **New Opportunity:**
   - Property: 123 Test Property, Sydney NSW 2000
   - Loan Amount: $600,000
   - LVR: 80%
   - Broker: Test Broker

**On the screen:**
- Success message: "✅ Fact find submitted successfully!"
- Or detailed error if something went wrong

---

## 🚨 Common Issues & Solutions

### Issue: "Unauthorized" error
**Solution:** Double-check your API keys are correct

### Issue: "Forbidden" error
**Solution:** You need Partner Level access in Mercury

### Issue: Contact already exists
**Solution:** This is OK! Mercury will update the existing contact

### Issue: Nothing appears in Mercury
**Solution:** 
- Check you're looking in **Sandbox**, not production
- Wait 30 seconds and refresh
- Check the browser console for errors

---

## ✅ Your Decision Point

**Which option do you want to proceed with?**

**A.** Deploy to Vercel and test the complete workflow (15 min setup)
- ✅ Recommended
- ✅ Most realistic
- ✅ Tests everything

**B.** Manual API testing with Postman (30 min setup)
- Technical but thorough
- Tests API only

**C.** Skip testing and deploy to production
- Fastest but riskiest
- Not recommended

---

## 🎓 What Happens After Testing

Once testing passes:

1. ✅ **Switch to production credentials**
   - Update `.env` file with production API keys
   - Remove `MERCURY_ENV=sandbox` line

2. ✅ **Train your brokers**
   - Show them how to use the form
   - Explain the Mercury connection
   - Give them the URL

3. ✅ **Monitor first submissions**
   - Watch the first few submissions closely
   - Check Mercury to verify data arrives correctly
   - Gather broker feedback

4. ✅ **You're live!**
   - Brokers can now submit fact finds
   - Data flows directly to Mercury
   - No manual re-entry needed!

---

## 💬 Tell Me What You'd Like To Do

Just respond with:
- **"A"** - Let's deploy to Vercel and test (recommended)
- **"B"** - Show me the Postman testing steps
- **"C"** - I want to skip testing and go live
- **"Something else"** - Ask me any questions

I'll guide you through whichever you choose! 🚀

---

**Status:** Waiting for your choice
**Time to complete:** 15-30 minutes depending on option
**Next:** Your decision on testing approach
