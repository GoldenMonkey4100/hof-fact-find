# Mercury API Integration - Complete Guide
## HOF Broker Fact Find → Mercury Nexus CRM

---

## 🎯 Overview

This guide walks you through integrating the polished HOF Broker Fact Find with Mercury Nexus CRM API.

**What this does:**
- Submits completed fact finds directly to Mercury CRM
- Creates/updates Person records for all applicants
- Creates Opportunity records with all loan details
- Handles errors gracefully with user feedback

---

## 📋 Prerequisites

### 1. Mercury API Credentials

You need two credentials from Mercury Nexus:

1. **API Key**
2. **API Token**

**How to get them:**
1. Log in to Mercury Nexus at `https://login.connective.com.au/`
2. Open the **Admin** app
3. Select **Integrations** from the left menu
4. Find the **Mercury API** tab
5. Copy your **API Key** and **API Token**

**Important:** API credentials are only visible with **Partner Level access**. If you don't see them, contact your business owner or administrator.

---

## ⚙️ Setup Instructions

### Step 1: Install Dependencies

Your React project needs these packages:

```bash
npm install dotenv
```

### Step 2: Configure Environment Variables

Create a `.env` file in your project root:

```bash
# .env
MERCURY_API_KEY=your_api_key_here
MERCURY_API_TOKEN=your_api_token_here

# For testing, use sandbox environment:
# MERCURY_ENV=sandbox
```

**Security Note:** Never commit `.env` to version control! Add it to `.gitignore`:

```bash
# .gitignore
.env
.env.local
.env.production
```

### Step 3: Copy Files to Your Project

Copy these files from `/home/claude/fact-find/` to your React project:

```
src/
├── services/
│   └── mercuryApiService.js        # Mercury API service layer
├── components/
│   ├── FactFindApp-Polished.jsx    # Main app
│   ├── Step0-LoanStrategy-Polished.jsx
│   ├── Step1-Applicants-Polished.jsx
│   ├── Step2-Employment-Polished.jsx
│   ├── Step3-AssetsLiabilities-Polished.jsx
│   └── Step4-Review-Polished.jsx
└── styles/
    └── styles.css                   # Design system
```

### Step 4: Update Main App to Use Mercury API

In `FactFindApp-Polished.jsx`, import and use the Mercury service:

```javascript
import { submitFactFind, testMercuryConnection } from './services/mercuryApiService';

// Inside your component:
const handleSubmit = async () => {
  try {
    setSubmitting(true);
    
    const result = await submitFactFind(formData);
    
    if (result.success) {
      alert('✅ Fact Find submitted successfully to Mercury!');
      // Optionally redirect or reset form
    } else {
      alert('⚠️ Submission completed with some errors. Check console for details.');
      console.error('Submission errors:', result.errors);
    }
  } catch (error) {
    alert('❌ Failed to submit fact find. Please try again.');
    console.error('Submission error:', error);
  } finally {
    setSubmitting(false);
  }
};
```

---

## 🧪 Testing

### Test 1: Connection Test

Before submitting real data, test your API connection:

```javascript
import { testMercuryConnection } from './services/mercuryApiService';

async function testConnection() {
  const connected = await testMercuryConnection();
  
  if (connected) {
    console.log('✅ Mercury API connection successful!');
  } else {
    console.error('❌ Mercury API connection failed. Check credentials.');
  }
}

// Run this when your app starts
testConnection();
```

### Test 2: Sandbox Environment

For safe testing, use the Mercury Sandbox environment:

```javascript
// In mercuryApiService.js, temporarily change baseURL:
const MERCURY_CONFIG = {
  baseURL: process.env.MERCURY_ENV === 'sandbox' 
    ? 'https://uatapis.connective.com.au/mercury/v1'
    : 'https://apis.connective.com.au/mercury/v1',
  // ... rest of config
};
```

Then set in `.env`:
```bash
MERCURY_ENV=sandbox
```

### Test 3: Submit Test Fact Find

Create a test fact find with dummy data:

```javascript
const testFactFind = {
  brokerName: 'Test Broker',
  brokerEmail: 'test@example.com',
  clientType: 'New',
  numApplicants: 1,
  applicants: [{
    id: 1,
    firstName: 'Test',
    lastName: 'Client',
    email: 'testclient@example.com',
    phone: '0400000000',
    dob: '1990-01-01'
  }],
  securities: [{
    id: 1,
    address: '123 Test St, Sydney NSW 2000',
    propertyValue: '750000',
    loanAmount: '600000',
    lvr: '80.00',
    primaryTransactionTypes: ['Purchase'],
    secondaryTransactionTypes: [],
    intendedOccupancy: 'Owner Occupied',
    applicationType: 'Full Doc'
  }]
};

const result = await submitFactFind(testFactFind);
console.log('Test result:', result);
```

---

## 📊 API Data Flow

### Complete Submission Flow

```
1. User completes fact find
   ↓
2. Clicks "Submit to Processing"
   ↓
3. For each applicant:
   a. Search if contact exists (by email/phone)
   b. If exists: UPDATE contact
   c. If not: CREATE new contact
   ↓
4. Create Opportunity with:
   - All security properties (assets)
   - Loan structure details
   - Related parties (applicants)
   - Broker notes
   ↓
5. Return success/error result
   ↓
6. Show user confirmation
```

### Data Mapping

**Person (Applicant) → Mercury Contact:**
```javascript
{
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  mobile: "0400000000",
  dateOfBirth: "1990-01-01",
  maritalStatus: "Married",
  residencyStatus: "Australian Citizen",
  numberOfDependants: 2
}
```

**Fact Find → Mercury Opportunity:**
```javascript
{
  brokerName: "Jane Broker",
  brokerEmail: "jane@broker.com",
  loanAmount: 600000,
  lenderPreference: "ANZ",
  assets: [{
    assetType: "Real Property",
    address: "123 Main St",
    estimatedValue: 750000,
    loanAmount: 600000,
    lvr: 80,
    transactionTypes: ["Purchase"],
    intendedOccupancy: "Owner Occupied"
  }],
  relatedParties: [...]
}
```

---

## 🚨 Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API credentials | Check API Key/Token in .env |
| `403 Forbidden` | Insufficient permissions | Verify Partner Level access |
| `429 Too Many Requests` | Rate limit exceeded | Implement request throttling |
| `400 Bad Request` | Invalid data format | Check required fields |
| `404 Not Found` | Wrong endpoint | Verify baseURL configuration |

### Error Response Format

```javascript
{
  success: false,
  contacts: [...], // Successfully created contacts
  opportunity: null, // Failed opportunity creation
  errors: [
    {
      applicant: "John Smith",
      error: "Email already exists"
    },
    {
      step: "Opportunity Creation",
      error: "Missing required field: loanAmount"
    }
  ]
}
```

### Implementing User-Friendly Error Messages

```javascript
const handleSubmit = async () => {
  try {
    const result = await submitFactFind(formData);
    
    if (result.success) {
      showSuccess('Fact find submitted successfully!');
    } else {
      // Show specific errors to user
      const errorMessages = result.errors.map(e => 
        e.applicant 
          ? `${e.applicant}: ${e.error}`
          : `${e.step}: ${e.error}`
      ).join('\n');
      
      showError(`Some errors occurred:\n${errorMessages}`);
    }
  } catch (error) {
    showError('Failed to connect to Mercury CRM. Please try again.');
  }
};
```

---

## 🔒 Security Best Practices

### 1. Never Expose API Credentials

**❌ DON'T:**
```javascript
const apiKey = "your_actual_key_here"; // NEVER do this!
```

**✅ DO:**
```javascript
const apiKey = process.env.MERCURY_API_KEY; // Use environment variables
```

### 2. Use HTTPS Only

The Mercury API service is already configured to use HTTPS:
```javascript
baseURL: 'https://apis.connective.com.au/mercury/v1'
```

### 3. Validate Data Before Submission

```javascript
function validateFactFind(formData) {
  const errors = [];
  
  if (!formData.brokerEmail) errors.push('Broker email required');
  if (!formData.applicants || formData.applicants.length === 0) {
    errors.push('At least one applicant required');
  }
  
  return errors;
}

// Use before submission:
const errors = validateFactFind(formData);
if (errors.length > 0) {
  alert(`Please fix:\n${errors.join('\n')}`);
  return;
}
```

### 4. Implement Request Logging

```javascript
// Add to mercuryApiService.js for debugging:
async function mercuryRequest(endpoint, options = {}) {
  console.log(`[Mercury API] ${options.method || 'GET'} ${endpoint}`);
  
  const response = await fetch(url, requestOptions);
  
  console.log(`[Mercury API] Response: ${response.status}`);
  
  return await response.json();
}
```

---

## 📈 Rate Limiting

Mercury API has these limits:
- **20 requests per second**
- **144,000 requests per day**

For high-volume brokers, implement throttling:

```javascript
import pThrottle from 'p-throttle';

// Throttle to 15 requests/second (safe buffer)
const throttledRequest = pThrottle({
  limit: 15,
  interval: 1000
})(mercuryRequest);

// Use throttledRequest instead of mercuryRequest
```

---

## 🎨 User Interface Integration

### Add Loading State

```javascript
const [submitting, setSubmitting] = useState(false);

<button
  onClick={handleSubmit}
  disabled={submitting || !isValid}
  className="btn-success"
>
  {submitting ? (
    <>
      <span className="spinner" /> Submitting...
    </>
  ) : (
    'Submit to Processing →'
  )}
</button>
```

### Add Success/Error Modals

```javascript
const [submitResult, setSubmitResult] = useState(null);

{submitResult && submitResult.success && (
  <div className="modal success">
    <h3>✅ Success!</h3>
    <p>Fact find submitted to Mercury CRM</p>
    <button onClick={() => setSubmitResult(null)}>Close</button>
  </div>
)}

{submitResult && !submitResult.success && (
  <div className="modal error">
    <h3>⚠️ Submission Issues</h3>
    <ul>
      {submitResult.errors.map((err, i) => (
        <li key={i}>{err.error}</li>
      ))}
    </ul>
    <button onClick={() => setSubmitResult(null)}>Close</button>
  </div>
)}
```

---

## 🔄 Optional: Real-time Contact Search

Implement live contact search as user types email:

```javascript
import { searchContact } from './services/mercuryApiService';
import { debounce } from 'lodash';

const [existingContact, setExistingContact] = useState(null);

const handleEmailChange = debounce(async (email) => {
  if (email && email.includes('@')) {
    const results = await searchContact(email, null);
    
    if (results && results.length > 0) {
      setExistingContact(results[0]);
      // Show "Existing Client Found" badge
      // Optionally pre-fill form with existing data
    }
  }
}, 500);

<input
  type="email"
  onChange={(e) => {
    updateApplicant(index, 'email', e.target.value);
    handleEmailChange(e.target.value);
  }}
/>

{existingContact && (
  <div className="badge badge-info">
    ✓ Existing Client Found
  </div>
)}
```

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] API credentials configured as environment variables
- [ ] Tested connection with `testMercuryConnection()`
- [ ] Tested full submission in Sandbox environment
- [ ] Error handling implemented and tested
- [ ] Loading states added to UI
- [ ] Success/error messages user-friendly
- [ ] Rate limiting considered (if high volume)
- [ ] Logging enabled for debugging
- [ ] `.env` added to `.gitignore`
- [ ] Documentation updated with any customizations

---

## 📞 Support

### Mercury API Issues
- **Email:** helpdesk@connective.com.au
- **Documentation:** Refer to Mercury API PDFs provided

### Integration Issues
- Check browser console for detailed error messages
- Review `mercuryApiService.js` logs
- Test with Sandbox environment first

---

## 🎉 Summary

You now have:
- ✅ Complete Mercury API service layer
- ✅ Data mapping for Person and Opportunity
- ✅ Error handling and validation
- ✅ Connection testing utilities
- ✅ Security best practices
- ✅ Integration guide

**Next Step:** Test in Sandbox environment, then deploy to production!

---

**Status:** Ready for integration and testing
**Last Updated:** April 2026
