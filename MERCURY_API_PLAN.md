# Mercury API Integration Plan
## HOF Broker Fact Find → Mercury Nexus CRM

Based on Mercury API documentation provided in PDF files.

---

## API Credentials & Environment

### Production Environment
- **Base URL:** `https://apis.connective.com.au/mercury/v1`
- **Front-end URL:** `https://login.connective.com.au/`
- **Authentication:** API Key + API Token (both required)
- **Headers:** `x-api-key: {API_KEY_VALUE}`

### Rate Limits
- **Max requests per second:** 20
- **Daily quota:** 144,000 requests

### Important Notes
- API credentials only visible with **Partner Level access**
- Credentials have been rotated (as confirmed by user)
- Store credentials as environment variables (never in code)

---

## Available API Operations

Based on the Getting Started PDF, Mercury API supports:

### Opportunities
- **Create** opportunities, assets, liabilities, related parties
- **Update** opportunities, assets, liabilities, related parties  
- **Fetch** opportunities, assets, liabilities, related parties
- **Delete** opportunities, assets, liabilities, related parties
- **Search** opportunities and contacts

### Contacts (Person Records)
- **Create** contacts, addresses, incomes, expenses, employment
- **Update** contacts, addresses, incomes, expenses, employment
- **Fetch** contacts, addresses, incomes, expenses, employment
- **Delete** contacts, addresses, incomes, expenses, employment

### Key Limitations
- **No endpoints for Connective products database** (noted in PDF)

---

## Fact Find → Mercury Mapping Strategy

### Step 1: Search for Existing Contact (CRM Lookup)

**Endpoint:** `GET /mercury/v1/contacts?search=true&searchParams={query}`

**Purpose:** Check if applicant already exists in Mercury CRM

**Implementation:**
```javascript
async function searchContact(email, phone) {
  const searchParams = {
    email: email,
    mobile: phone
  };
  
  const response = await fetch(
    `https://apis.connective.com.au/mercury/v1/contacts?search=true&searchParams=${encodeURIComponent(JSON.stringify(searchParams))}`,
    {
      headers: {
        'x-api-key': process.env.MERCURY_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

**When to Use:**
- As soon as user enters email/phone in Step 1 (Applicants)
- Debounce the search (wait 500ms after user stops typing)
- If match found, show "Existing Client Found" badge
- Pre-fill form with existing data
- Track what's changed for update operations

---

### Step 2: Create or Update Person Records

**Endpoint:** `POST /mercury/v1/contacts` or `PUT /mercury/v1/contacts/{id}`

**Mapping: Fact Find → Mercury Person**

| Fact Find Field | Mercury API Field | Notes |
|----------------|------------------|-------|
| `firstName` | `firstName` | Required |
| `lastName` | `lastName` | Required |
| `dob` | `dateOfBirth` | Format: YYYY-MM-DD |
| `email` | `email` | Required |
| `phone` | `mobile` | Format validation needed |
| `address` | Address object (separate) | See below |
| `gender` | `gender` | Male/Female |
| `maritalStatus` | `maritalStatus` | Single/Married/De Facto/Divorced/Widowed |
| `residencyStatus` | `residency` | Citizen/Permanent/Temporary |
| `visaNumber` | `visaNumber` | Only if Temporary Resident |

**Example Request:**
```javascript
async function createContact(applicantData) {
  const payload = {
    firstName: applicantData.firstName,
    lastName: applicantData.lastName,
    dateOfBirth: applicantData.dob,
    email: applicantData.email,
    mobile: applicantData.phone,
    gender: applicantData.gender,
    maritalStatus: applicantData.maritalStatus,
    residency: applicantData.residencyStatus,
    visaNumber: applicantData.visaNumber || null
  };
  
  const response = await fetch(
    'https://apis.connective.com.au/mercury/v1/contacts',
    {
      method: 'POST',
      headers: {
        'x-api-key': process.env.MERCURY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
  
  return await response.json();
}
```

---

### Step 3: Create Address Records

**Endpoint:** `POST /mercury/v1/contacts/{contactId}/addresses`

**Mapping:**
- Parse `address` string into components
- Street, City, State, Postcode
- Type: Residential / Postal / Previous

**Example:**
```javascript
async function createAddress(contactId, addressString) {
  // Parse address (basic implementation - enhance as needed)
  const parsed = parseAddress(addressString);
  
  const payload = {
    street: parsed.street,
    city: parsed.city,
    state: parsed.state,
    postcode: parsed.postcode,
    country: 'Australia',
    addressType: 'Residential'
  };
  
  const response = await fetch(
    `https://apis.connective.com.au/mercury/v1/contacts/${contactId}/addresses`,
    {
      method: 'POST',
      headers: {
        'x-api-key': process.env.MERCURY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
  
  return await response.json();
}
```

---

### Step 4: Create Employment Records

**Endpoint:** `POST /mercury/v1/contacts/{contactId}/employment`

**Mapping: Employment History → Mercury**

| Fact Find Field | Mercury API Field |
|----------------|------------------|
| `employmentType` | `employmentType` |
| `employer` | `employerName` |
| `role` | `position` |
| `startDate` | `startDate` |
| `endDate` | `endDate` (null for current) |
| `abn` | `abn` (if self-employed) |

**Implementation:**
```javascript
async function createEmployment(contactId, employmentData) {
  const payload = {
    employmentType: employmentData.employmentType,
    employerName: employmentData.employer,
    position: employmentData.role,
    startDate: employmentData.startDate,
    endDate: employmentData.endDate || null,
    abn: employmentData.abn || null,
    isCurrent: !employmentData.endDate
  };
  
  const response = await fetch(
    `https://apis.connective.com.au/mercury/v1/contacts/${contactId}/employment`,
    {
      method: 'POST',
      headers: {
        'x-api-key': process.env.MERCURY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
  
  return await response.json();
}
```

---

### Step 5: Create Opportunity Record

**Endpoint:** `POST /mercury/v1/opportunities`

**Mapping: Loan Strategy → Mercury Opportunity**

| Fact Find Field | Mercury API Field | Notes |
|----------------|------------------|-------|
| `securities[0].address` | `propertyAddress` | Primary security |
| `securities[0].propertyValue` | `propertyValue` | |
| `securities[0].loanAmount` | `loanAmount` | |
| `securities[0].lvr` | `lvr` | Auto-calculated |
| `securities[0].primaryTransactionTypes` | `transactionType` | Join array |
| `securities[0].intendedOccupancy` | `occupancyType` | Owner Occupied / Investment |
| `securities[0].applicationType` | `applicationType` | Full Doc / Low Doc / Alt Doc |
| `lenderPreference` | `preferredLender` | |
| `brokerNotes` | `notes` | |
| `brokerEmail` | `brokerId` | Link to broker |

**Example:**
```javascript
async function createOpportunity(formData, contactIds) {
  const payload = {
    // Link to contacts
    primaryApplicantId: contactIds[0],
    coApplicantIds: contactIds.slice(1),
    
    // Property details (primary security)
    propertyAddress: formData.securities[0].address,
    propertyValue: parseFloat(formData.securities[0].propertyValue),
    loanAmount: parseFloat(formData.securities[0].loanAmount),
    lvr: parseFloat(formData.securities[0].lvr),
    
    // Transaction details
    transactionType: formData.securities[0].primaryTransactionTypes.join(', '),
    occupancyType: formData.securities[0].intendedOccupancy,
    applicationType: formData.securities[0].applicationType,
    
    // Loan structure
    loanTerm: parseInt(formData.securities[0].loanTerm),
    loanType: formData.securities[0].loanType,
    repaymentType: formData.securities[0].repaymentType,
    
    // Preferences
    preferredLender: formData.lenderPreference,
    
    // Broker details
    brokerId: formData.brokerEmail,
    brokerNotes: formData.brokerNotes,
    
    // Status
    status: 'New',
    stage: 'Fact Find Complete'
  };
  
  const response = await fetch(
    'https://apis.connective.com.au/mercury/v1/opportunities',
    {
      method: 'POST',
      headers: {
        'x-api-key': process.env.MERCURY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
  
  return await response.json();
}
```

---

### Step 6: Link Assets & Liabilities to Opportunity

**Assets Endpoint:** `POST /mercury/v1/opportunities/{opportunityId}/assets`
**Liabilities Endpoint:** `POST /mercury/v1/opportunities/{opportunityId}/liabilities`

**Asset Mapping:**

| Fact Find | Mercury Field |
|-----------|--------------|
| Real Property | Asset type: Real Estate |
| Savings | Asset type: Bank Account |
| Superannuation | Asset type: Superannuation |
| Shares | Asset type: Investments |
| Vehicles | Asset type: Motor Vehicle |

**Liability Mapping:**

| Fact Find | Mercury Field |
|-----------|--------------|
| Credit Cards | Liability type: Credit Card |
| Personal Loans | Liability type: Personal Loan |
| HECS | Liability type: HECS/HELP |
| Other | Liability type: Other |

**Example:**
```javascript
async function linkAssets(opportunityId, assets) {
  // Real Property
  for (const property of assets.realProperty) {
    await fetch(
      `https://apis.connective.com.au/mercury/v1/opportunities/${opportunityId}/assets`,
      {
        method: 'POST',
        headers: {
          'x-api-key': process.env.MERCURY_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assetType: 'Real Estate',
          description: property.address,
          value: parseFloat(property.estimatedValue),
          ownershipPercentage: parseFloat(property.ownershipPercentage),
          encumbered: parseFloat(property.mortgageOwing) > 0,
          mortgageOwing: parseFloat(property.mortgageOwing)
        })
      }
    );
  }
  
  // Savings accounts
  for (const account of assets.savings) {
    await fetch(
      `https://apis.connective.com.au/mercury/v1/opportunities/${opportunityId}/assets`,
      {
        method: 'POST',
        headers: {
          'x-api-key': process.env.MERCURY_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assetType: 'Bank Account',
          description: `${account.institution} - ${account.accountType}`,
          value: parseFloat(account.balance)
        })
      }
    );
  }
  
  // Continue for other asset types...
}

async function linkLiabilities(opportunityId, liabilities) {
  // Credit cards
  for (const card of liabilities.creditCards) {
    await fetch(
      `https://apis.connective.com.au/mercury/v1/opportunities/${opportunityId}/liabilities`,
      {
        method: 'POST',
        headers: {
          'x-api-key': process.env.MERCURY_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          liabilityType: 'Credit Card',
          institution: card.institution,
          limit: parseFloat(card.limit),
          balance: parseFloat(card.balance),
          monthlyRepayment: parseFloat(card.monthlyRepayment)
        })
      }
    );
  }
  
  // Continue for other liability types...
}
```

---

## Complete Submission Flow

```javascript
async function submitFactFindToMercury(formData) {
  try {
    const contactIds = [];
    
    // 1. Create/Update each applicant
    for (const applicant of formData.applicants) {
      // 1a. Search for existing contact
      const existing = await searchContact(applicant.email, applicant.phone);
      
      let contactId;
      if (existing && existing.length > 0) {
        // Update existing contact
        contactId = existing[0].id;
        await updateContact(contactId, applicant);
      } else {
        // Create new contact
        const contact = await createContact(applicant);
        contactId = contact.id;
      }
      
      contactIds.push(contactId);
      
      // 1b. Create address
      await createAddress(contactId, applicant.address);
      
      // 1c. Create employment history
      const employment = formData.employment.find(e => e.applicantId === applicant.id);
      if (employment) {
        // Current employment
        await createEmployment(contactId, employment.currentEmployment);
        
        // Previous employments
        for (const prevEmp of employment.previousEmployments) {
          await createEmployment(contactId, prevEmp);
        }
      }
    }
    
    // 2. Create Opportunity
    const opportunity = await createOpportunity(formData, contactIds);
    const opportunityId = opportunity.id;
    
    // 3. Link Assets
    await linkAssets(opportunityId, formData.assets);
    
    // 4. Link Liabilities
    await linkLiabilities(opportunityId, formData.liabilities);
    
    // 5. Return success with Mercury opportunity ID
    return {
      success: true,
      opportunityId: opportunityId,
      contactIds: contactIds,
      message: 'Fact find successfully submitted to Mercury Nexus'
    };
    
  } catch (error) {
    console.error('Mercury submission error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## Error Handling

### Common Error Scenarios

1. **Authentication Failed (401)**
   - Check API key and token are correct
   - Verify Partner Level access
   - Check credentials haven't expired

2. **Rate Limit Exceeded (429)**
   - Implement exponential backoff
   - Queue requests if submitting multiple applicants
   - Max 20 requests/second

3. **Validation Errors (400)**
   - Required fields missing
   - Invalid data format (dates, emails, phones)
   - Field length exceeded

4. **Duplicate Records**
   - Use search before create
   - Handle "already exists" responses gracefully
   - Offer to update instead of create

### Implementation
```javascript
async function mercuryApiCall(url, options, retries = 3) {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429 && retries > 0) {
      // Rate limited - wait and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return mercuryApiCall(url, options, retries - 1);
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mercury API Error: ${error.message || response.statusText}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

---

## Environment Variables Setup

**For Vercel Deployment:**

```bash
MERCURY_API_KEY=your_api_key_here
MERCURY_API_TOKEN=your_api_token_here
MERCURY_BASE_URL=https://apis.connective.com.au/mercury/v1
```

**Access in Next.js API routes:**
```javascript
const apiKey = process.env.MERCURY_API_KEY;
const apiToken = process.env.MERCURY_API_TOKEN;
```

---

## Testing Strategy

### Sandbox Environment
- **Sandbox Mercury URL:** `https://democrm.connective.com.au`
- **Sandbox API URL:** `https://uatapis.connective.com.au/mercury/v1`
- Use sandbox for all development and testing
- Only use production when ready for live deployment

### Test Cases
1. ✅ Create new contact (single applicant)
2. ✅ Create new contact (multiple applicants)
3. ✅ Update existing contact
4. ✅ Create opportunity with multiple securities
5. ✅ Link assets and liabilities
6. ✅ Handle rate limiting
7. ✅ Handle validation errors
8. ✅ Handle duplicate records

---

## Next Steps

1. **Create API Service Layer** (`/lib/mercuryApi.js`)
   - Centralized API functions
   - Error handling
   - Rate limiting logic

2. **Create Next.js API Routes** (`/pages/api/submit-fact-find.js`)
   - Secure server-side API calls
   - Never expose API keys to client

3. **Update FactFindApp Submit Handler**
   - Call Next.js API route
   - Handle loading states
   - Show success/error messages

4. **Add CRM Lookup Feature**
   - Real-time search as user types email/phone
   - Pre-fill form with existing data
   - Highlight what's changed

5. **Implement Validation**
   - Required field checking
   - Format validation (email, phone, dates)
   - Mercury-specific constraints

---

## Security Checklist

- [ ] API credentials stored as environment variables
- [ ] Never expose credentials in client-side code
- [ ] All API calls made from server-side (Next.js API routes)
- [ ] Input validation before sending to Mercury
- [ ] Sanitize user input to prevent injection
- [ ] HTTPS only for all API calls
- [ ] Log API errors (but not sensitive data)
- [ ] Implement request signing if required
- [ ] Rate limiting on client side
- [ ] Error messages don't expose system details

---

## Documentation References

- Mercury API Integration Guide: `/mnt/project/Mercury_API_1.pdf`
- Getting Started with Mercury API: `/mnt/project/Mercury_API_2.pdf`
- Swagger Documentation: `https://swagger.io/docs/` (referenced in PDF)
- Mercury Helpdesk: `helpdesk@connective.com.au`

---

**Status:** Planning complete, ready for implementation
**Last Updated:** April 27, 2026
