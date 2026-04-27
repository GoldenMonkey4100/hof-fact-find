/**
 * Mercury Nexus API Service
 * Handles all API interactions with Mercury CRM
 * 
 * Environment Variables Required:
 * - MERCURY_API_KEY: Your API key from Mercury Admin > Integrations
 * - MERCURY_API_TOKEN: Your API token from Mercury Admin > Integrations
 */

// API Configuration
const MERCURY_CONFIG = {
  baseURL: 'https://apis.connective.com.au/mercury/v1',
  sandboxURL: 'https://uatapis.connective.com.au/mercury/v1', // For testing
  frontendURL: 'https://login.connective.com.au/',
  rateLimit: {
    maxPerSecond: 20,
    dailyQuota: 144000
  }
};

/**
 * Base API Request Handler
 */
async function mercuryRequest(endpoint, options = {}) {
  const apiKey = process.env.MERCURY_API_KEY;
  const apiToken = process.env.MERCURY_API_TOKEN;

  if (!apiKey || !apiToken) {
    throw new Error('Mercury API credentials not configured. Set MERCURY_API_KEY and MERCURY_API_TOKEN environment variables.');
  }

  const url = `${MERCURY_CONFIG.baseURL}${endpoint}`;
  
  const defaultHeaders = {
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  };

  const requestOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Mercury API Error: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Mercury API Request Failed:', error);
    throw error;
  }
}

/**
 * Search for existing contact in Mercury CRM
 * @param {string} email - Email address
 * @param {string} phone - Phone number
 * @returns {Promise<Array>} - Array of matching contacts
 */
export async function searchContact(email, phone) {
  const searchParams = {};
  
  if (email) searchParams.email = email;
  if (phone) searchParams.mobile = phone;

  const queryString = encodeURIComponent(JSON.stringify(searchParams));
  
  return await mercuryRequest(`/contacts?search=true&searchParams=${queryString}`, {
    method: 'GET'
  });
}

/**
 * Create a new person/contact in Mercury
 * @param {Object} personData - Person data from fact find
 * @returns {Promise<Object>} - Created contact response
 */
export async function createPerson(personData) {
  const payload = mapPersonDataToMercury(personData);
  
  return await mercuryRequest('/contacts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Update an existing person/contact in Mercury
 * @param {string} contactId - Mercury contact ID
 * @param {Object} personData - Updated person data
 * @returns {Promise<Object>} - Updated contact response
 */
export async function updatePerson(contactId, personData) {
  const payload = mapPersonDataToMercury(personData);
  
  return await mercuryRequest(`/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

/**
 * Create a new opportunity in Mercury
 * @param {Object} opportunityData - Opportunity data from fact find
 * @returns {Promise<Object>} - Created opportunity response
 */
export async function createOpportunity(opportunityData) {
  const payload = mapOpportunityDataToMercury(opportunityData);
  
  return await mercuryRequest('/opportunities', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Map fact find person data to Mercury Person schema
 */
function mapPersonDataToMercury(personData) {
  return {
    // Basic Information
    firstName: personData.firstName,
    lastName: personData.lastName,
    dateOfBirth: personData.dob, // Format: YYYY-MM-DD
    email: personData.email,
    mobile: personData.phone,
    gender: personData.gender,
    maritalStatus: personData.maritalStatus,
    
    // Address
    ...(personData.address && {
      addresses: [{
        addressType: 'Residential',
        fullAddress: personData.address
      }]
    }),
    
    // Residency
    residencyStatus: personData.residencyStatus,
    ...(personData.visaNumber && {
      visaNumber: personData.visaNumber
    }),
    
    // Dependants
    ...(personData.numDependants && {
      numberOfDependants: parseInt(personData.numDependants)
    })
  };
}

/**
 * Map fact find data to Mercury Opportunity schema
 */
function mapOpportunityDataToMercury(factFindData) {
  const opportunity = {
    // Basic Opportunity Info
    brokerName: factFindData.brokerName,
    brokerEmail: factFindData.brokerEmail,
    clientType: factFindData.clientType,
    leadSource: factFindData.leadSource,
    
    // Loan Structure
    loanAmount: calculateTotalLoanAmount(factFindData.securities),
    lenderPreference: factFindData.lenderPreference,
    
    // Securities (Properties)
    assets: factFindData.securities.map(security => ({
      assetType: 'Real Property',
      address: security.address,
      estimatedValue: parseFloat(security.propertyValue) || 0,
      loanAmount: parseFloat(security.loanAmount) || 0,
      lvr: parseFloat(security.lvr) || 0,
      transactionTypes: [
        ...security.primaryTransactionTypes,
        ...security.secondaryTransactionTypes
      ],
      intendedOccupancy: security.intendedOccupancy,
      applicationType: security.applicationType,
      loanTerm: parseInt(security.loanTerm) || 0,
      loanType: security.loanType,
      repaymentType: security.repaymentType,
      ...(security.interestOnlyPeriod && {
        interestOnlyPeriod: parseInt(security.interestOnlyPeriod)
      }),
      ratePreference: security.ratePreference,
      hasOffset: security.hasOffset,
      hasRedraw: security.hasRedraw
    })),
    
    // Related Parties (Applicants)
    relatedParties: factFindData.applicants ? factFindData.applicants.map(applicant => ({
      role: applicant.role,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      email: applicant.email,
      phone: applicant.phone,
      relationshipToApplicant1: applicant.relationshipToApplicant1
    })) : [],
    
    // Notes
    notes: factFindData.brokerNotes || ''
  };

  return opportunity;
}

/**
 * Helper: Calculate total loan amount across all securities
 */
function calculateTotalLoanAmount(securities) {
  return securities.reduce((total, security) => {
    return total + (parseFloat(security.loanAmount) || 0);
  }, 0);
}

/**
 * Main submission function - orchestrates the complete fact find submission
 * @param {Object} factFindData - Complete fact find form data
 * @returns {Promise<Object>} - Submission result
 */
export async function submitFactFind(factFindData) {
  const results = {
    success: false,
    contacts: [],
    opportunity: null,
    errors: []
  };

  try {
    console.log('Starting Mercury API submission...');

    // Step 1: Create or update all applicants/contacts
    for (const applicant of factFindData.applicants || []) {
      try {
        // Search for existing contact
        const existingContacts = await searchContact(applicant.email, applicant.phone);
        
        let contactResult;
        if (existingContacts && existingContacts.length > 0) {
          // Update existing contact
          console.log(`Updating existing contact: ${applicant.email}`);
          contactResult = await updatePerson(existingContacts[0].id, applicant);
        } else {
          // Create new contact
          console.log(`Creating new contact: ${applicant.email}`);
          contactResult = await createPerson(applicant);
        }
        
        results.contacts.push(contactResult);
      } catch (error) {
        console.error(`Failed to process applicant ${applicant.email}:`, error);
        results.errors.push({
          applicant: `${applicant.firstName} ${applicant.lastName}`,
          error: error.message
        });
      }
    }

    // Step 2: Create opportunity
    try {
      console.log('Creating opportunity in Mercury...');
      results.opportunity = await createOpportunity(factFindData);
      results.success = true;
      console.log('Mercury submission completed successfully!');
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      results.errors.push({
        step: 'Opportunity Creation',
        error: error.message
      });
    }

    return results;
  } catch (error) {
    console.error('Mercury submission failed:', error);
    results.errors.push({
      step: 'General',
      error: error.message
    });
    return results;
  }
}

/**
 * Test connection to Mercury API
 * @returns {Promise<boolean>} - True if connection successful
 */
export async function testMercuryConnection() {
  try {
    // Simple test request to verify credentials
    await mercuryRequest('/contacts?search=true&searchParams={}', {
      method: 'GET'
    });
    return true;
  } catch (error) {
    console.error('Mercury connection test failed:', error);
    return false;
  }
}

// Export configuration for testing
export const getMercuryConfig = () => MERCURY_CONFIG;
