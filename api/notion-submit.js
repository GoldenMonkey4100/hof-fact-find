/**
 * Notion Pipeline Integration
 *
 * POST /api/notion-submit   { action: 'check', formData }
 *   → { exists: bool, matches: [{ id, url, title, status }] }
 *
 * POST /api/notion-submit   { action: 'submit', formData }
 *   → { success: true, pageId, pageUrl }
 *
 * Environment variable required:
 *   NOTION_API_KEY  — internal integration token from notion.so/my-integrations
 *   (The integration must be connected to both the Pipeline and Brokers databases)
 */

const NOTION_VERSION = '2022-06-28';
const PIPELINE_DB_ID = '264d5849ccf68068b10ffe2b2d18125f';
const BROKERS_DB_ID  = '87ea47cb17de4ca9856fbccd2c4f360a';

// ── Notion REST helper ────────────────────────────────────────────────────────
const notionFetch = async (path, method, body, apiKey) => {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Notion API ${res.status}: ${JSON.stringify(data)}`);
  return data;
};

// ── Broker lookup ─────────────────────────────────────────────────────────────
const findBrokerPageId = async (brokerName, apiKey) => {
  if (!brokerName) return null;
  try {
    const data = await notionFetch(`/databases/${BROKERS_DB_ID}/query`, 'POST', {
      filter: { property: 'Name', title: { equals: brokerName } }
    }, apiKey);
    return data.results?.[0]?.id || null;
  } catch {
    return null;
  }
};

// ── Duplicate detection ───────────────────────────────────────────────────────
const checkDuplicate = async (applicantName, apiKey) => {
  const data = await notionFetch(`/databases/${PIPELINE_DB_ID}/query`, 'POST', {
    filter: { property: 'Applicant', title: { contains: applicantName } }
  }, apiKey);
  return (data.results || []).map(r => ({
    id:     r.id,
    url:    r.url,
    title:  r.properties?.Applicant?.title?.[0]?.plain_text || applicantName,
    status: r.properties?.Status?.status?.name || '',
  }));
};

// ── Block helpers ─────────────────────────────────────────────────────────────
const richText = (content, bold = false) => [{
  type: 'text',
  text: { content: String(content ?? '').slice(0, 2000) },
  annotations: { bold },
}];

const para = (content, bold = false) => ({
  object: 'block', type: 'paragraph',
  paragraph: { rich_text: richText(content, bold) },
});

const h3 = (content) => ({
  object: 'block', type: 'heading_3',
  heading_3: { rich_text: richText(content) },
});

const divider = () => ({ object: 'block', type: 'divider', divider: {} });

const toggle = (title, children) => ({
  object: 'block', type: 'toggle',
  toggle: {
    rich_text: richText(title, true),
    color: 'default',
    // Notion hard limit: 100 blocks per children array
    children: children.slice(0, 98),
  },
});

const kv = (key, val) => para(`${key}: ${val ?? '—'}`);

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (v) => {
  if (!v) return '—';
  const n = parseFloat(String(v).replace(/[$,]/g, ''));
  return isNaN(n) ? String(v) : '$' + n.toLocaleString('en-AU');
};

const getApplicantTitle = (formData) => {
  const primary = (formData.applicants || [])[0];
  if (!primary) return 'Unknown Applicant';
  if (primary.type === 'Company Borrower') return primary.companyName || 'Company Applicant';
  return `${primary.firstName || ''} ${primary.lastName || ''}`.trim() || 'Unknown Applicant';
};

// ── Transaction type mapping (only valid Notion options) ──────────────────────
const VALID_TX_TYPES = new Set(['Refinance', 'Cashout', 'Purchase', 'Top up', 'Construction']);
const getTransactionTypes = (formData) => {
  const types = new Set();
  (formData.securities || []).forEach(sec => {
    [...(sec.primaryTransactionTypes || []), ...(sec.secondaryTransactionTypes || [])].forEach(t => {
      if (VALID_TX_TYPES.has(t)) types.add(t);
    });
  });
  return [...types];
};

// ── Lender mapping (must match Notion option names exactly) ───────────────────
const VALID_LENDERS = new Set(['Bluestone', 'Pepper', 'Thinktank', 'anz', 'St George', 'Bankwest', 'CBA', 'Westpac', 'NAB']);
const getLenders = (formData) => (formData.lenderPreference || []).filter(l => VALID_LENDERS.has(l));

// ── Page body builder ─────────────────────────────────────────────────────────
const buildPageBody = (formData) => {
  const blocks = [];

  // ── 1. Broker Details ────────────────────────────────────────────────────
  const brokerBlocks = [
    kv('Broker',            formData.brokerName || '—'),
    kv('Email',             formData.brokerEmail || '—'),
    kv('Client Type',       formData.clientType || '—'),
    kv('Lead Source',       formData.leadSource || '—'),
    kv('Priority',          formData.priority || '—'),
    kv('Lender Preference', (formData.lenderPreference || []).join(', ') || '—'),
    kv('Applicant Type',    formData.applicantType || '—'),
    kv('Applicants',        String(formData.numApplicants || 1)),
    kv('Guarantors',        String(formData.numGuarantors || 0)),
  ];
  if (formData.brokerNotes) {
    brokerBlocks.push(para('Broker Notes:', true));
    brokerBlocks.push(para(formData.brokerNotes));
  }
  blocks.push(toggle('📋 Broker Details', brokerBlocks));

  // ── 2. Loan Strategy ─────────────────────────────────────────────────────
  const secBlocks = [];
  (formData.securities || []).forEach((sec, i) => {
    if (i > 0) secBlocks.push(divider());
    secBlocks.push(h3(`Security ${i + 1}${sec.address ? ': ' + sec.address : ''}`));

    const txTypes = [
      ...(sec.primaryTransactionTypes || []),
      ...(sec.secondaryTransactionTypes || []),
    ].join(', ');
    secBlocks.push(kv('Transaction Types', txTypes || '—'));
    secBlocks.push(kv('Property Value',    fmt(sec.propertyValue)));
    secBlocks.push(kv('Loan Amount',       fmt(sec.loanAmount)));
    secBlocks.push(kv('LVR',              sec.lvr ? sec.lvr + '%' : '—'));
    secBlocks.push(kv('State',            sec.state || '—'));
    secBlocks.push(kv('Occupancy',        sec.intendedOccupancy || '—'));
    secBlocks.push(kv('Loan Type',        sec.loanType || '—'));
    secBlocks.push(kv('Repayment Type',   sec.repaymentType || '—'));
    secBlocks.push(kv('Loan Term',        sec.loanTerm ? sec.loanTerm + ' years' : '—'));

    const flags = [];
    if (sec.isFirstHomeBuyer) flags.push('First Home Buyer');
    if (sec.hasOffset)        flags.push('Offset Account');
    if (sec.hasRedraw)        flags.push('Redraw Facility');
    if (flags.length)         secBlocks.push(kv('Features', flags.join(', ')));

    if (sec.primaryTransactionTypes?.includes('Refinance')) {
      secBlocks.push(kv('Current Loan Balance', fmt(sec.currentLoanBalance)));
    }
    if (sec.secondaryTransactionTypes?.includes('Cashout')) {
      secBlocks.push(kv('Cashout Amount', fmt(sec.cashoutAmount)));
    }

    // Purchase completion methods
    if ((sec.purchaseCompletionMethods || []).length > 0) {
      secBlocks.push(kv('Purchase Completion', sec.purchaseCompletionMethods.join(', ')));
    }
  });
  blocks.push(toggle('🏠 Loan Strategy', secBlocks));

  // ── 3. Applicants ─────────────────────────────────────────────────────────
  const appBlocks = [];
  (formData.applicants || []).forEach((app, i) => {
    if (i > 0) appBlocks.push(divider());
    const name = app.type === 'Company Borrower'
      ? (app.companyName || `Company ${i + 1}`)
      : `${app.firstName || ''} ${app.lastName || ''}`.trim() || `Applicant ${i + 1}`;

    appBlocks.push(h3(`${app.role} ${app.number}: ${name} (${app.type})`));

    if (app.type === 'Company Borrower') {
      appBlocks.push(kv('ABN',                   app.companyABN || '—'));
      appBlocks.push(kv('ACN',                   app.companyACN || '—'));
      appBlocks.push(kv('Entity Type',           app.entityType || '—'));
      appBlocks.push(kv('ABN Status',            app.abnStatus || '—'));
      appBlocks.push(kv('ABN Registered From',   app.abnFrom || '—'));
      appBlocks.push(kv('GST',                   app.gstRegistered ? `Registered${app.gstDate ? ' from ' + app.gstDate : ''}` : 'Not Registered'));
      appBlocks.push(kv('Main Business Location',app.mainBusinessLocation || '—'));
      appBlocks.push(kv('Registered Address',    app.registeredAddress || '—'));
      appBlocks.push(kv('Phone',                 app.phone || '—'));
      appBlocks.push(kv('Email',                 app.email || '—'));
    } else {
      appBlocks.push(kv('DOB',            app.dob || '—'));
      appBlocks.push(kv('Phone',          app.phone || '—'));
      appBlocks.push(kv('Email',          app.email || '—'));
      appBlocks.push(kv('Licence No.',    app.licenceNumber || '—'));
      if (app.gender)          appBlocks.push(kv('Gender',        app.gender));
      if (app.maritalStatus)   appBlocks.push(kv('Marital Status',app.maritalStatus));
      if (app.residencyStatus) appBlocks.push(kv('Residency',     app.residencyStatus));
      appBlocks.push(kv('Address', app.address || '—'));

      // Address history
      (app.addressHistory || []).forEach((ah, j) => {
        appBlocks.push(kv(`Previous Address ${j + 1}`, [ah.address, ah.duration].filter(Boolean).join(' — ')));
      });

      if (app.numDependants > 0) {
        appBlocks.push(kv('Dependants', String(app.numDependants)));
        (app.dependants || []).forEach((d, di) => {
          appBlocks.push(para(`  • Dependant ${di + 1}: ${d.name || '—'}, Age ${d.age || '—'}`));
        });
      }
    }

    if (app.type === 'Director Guarantor') {
      if (app.relationshipToCompany) appBlocks.push(kv('Relationship to Company', app.relationshipToCompany));
    }
  });
  if (appBlocks.length) blocks.push(toggle('👥 Applicants', appBlocks));

  // ── 4. Employment ─────────────────────────────────────────────────────────
  const empBlocks = [];
  (formData.employment || []).forEach((emp, i) => {
    if (i > 0) empBlocks.push(divider());
    empBlocks.push(h3(emp.applicantName || `Applicant ${i + 1}`));

    const ce = emp.currentEmployment || {};
    empBlocks.push(para(`Current: ${ce.employmentType || '—'}`, true));
    if (ce.employer)    empBlocks.push(kv('Employer',   ce.employer));
    if (ce.role)        empBlocks.push(kv('Role',       ce.role));
    if (ce.abn)         empBlocks.push(kv('ABN',        ce.abn));
    if (ce.startDate)   empBlocks.push(kv('Start Date', ce.startDate));
    if (ce.payFrequency) empBlocks.push(kv('Pay Frequency', ce.payFrequency));
    if (ce.baseIncome)  empBlocks.push(kv('Base Income', fmt(ce.baseIncome.replace(/,/g, ''))));
    if (ce.bonusIncome) empBlocks.push(kv('Bonus',       fmt(ce.bonusIncome.replace(/,/g, ''))));
    if (ce.commissions) empBlocks.push(kv('Commissions', fmt(ce.commissions.replace(/,/g, ''))));
    if (ce.hecs)        empBlocks.push(kv('HECS',        ce.hecs));

    (emp.previousEmployments || []).forEach((prev, pi) => {
      empBlocks.push(para(`Previous ${pi + 1}: ${prev.employmentType || '—'}`, true));
      if (prev.employer) empBlocks.push(kv('Employer', prev.employer));
      if (prev.role)     empBlocks.push(kv('Role',     prev.role));
      if (prev.startDate || prev.endDate) {
        empBlocks.push(kv('Period', `${prev.startDate || '?'} → ${prev.endDate || 'present'}`));
      }
    });

    const yearsLabel = `${(emp.totalYears || 0).toFixed(1)} years${emp.meetsRequirement ? ' ✓' : ' ⚠ (< 3 years)'}`;
    empBlocks.push(kv('Total Employment History', yearsLabel));
  });
  if (empBlocks.length) blocks.push(toggle('💼 Employment', empBlocks));

  // ── 5. Assets & Liabilities ───────────────────────────────────────────────
  const alBlocks = [];
  const assets = formData.assets || {};
  const liabilities = formData.liabilities || {};

  const assetCategories = [
    ['Real Property',  assets.realProperty],
    ['Savings',        assets.savings],
    ['Superannuation', assets.superannuation],
    ['Shares',         assets.shares],
    ['Vehicles',       assets.vehicles],
  ];

  const liabCategories = [
    ['Credit Cards',     liabilities.creditCards],
    ['Personal Loans',   liabilities.personalLoans],
    ['HECS',             liabilities.hecs],
    ['Other Liabilities',liabilities.otherLiabilities],
  ];

  let hasAssets = false;
  assetCategories.forEach(([label, items]) => {
    if (!items?.length) return;
    hasAssets = true;
    alBlocks.push(para(label + ':', true));
    items.forEach(item => {
      const desc = item.description || item.address || item.institution || item.type || '—';
      const val  = fmt(String(item.value || item.amount || '').replace(/,/g, ''));
      alBlocks.push(para(`  • ${desc}: ${val}`));
    });
  });

  let hasLiabs = false;
  liabCategories.forEach(([label, items]) => {
    if (!items?.length) return;
    if (!hasLiabs && hasAssets) alBlocks.push(divider());
    hasLiabs = true;
    alBlocks.push(para(label + ':', true));
    items.forEach(item => {
      const desc = item.lender || item.institution || item.description || '—';
      const bal  = fmt(String(item.balance || item.limit || item.amount || '').replace(/,/g, ''));
      alBlocks.push(para(`  • ${desc}: ${bal}`));
    });
  });

  if (alBlocks.length) blocks.push(toggle('💰 Assets & Liabilities', alBlocks));

  return blocks;
};

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'NOTION_API_KEY not configured in Vercel environment variables' });

  const { action, formData } = req.body || {};

  try {

    // ── Duplicate check ─────────────────────────────────────────────────────
    if (action === 'check') {
      const name = getApplicantTitle(formData);
      const matches = await checkDuplicate(name, apiKey);
      return res.status(200).json({ exists: matches.length > 0, matches, applicantName: name });
    }

    // ── Create Pipeline page ────────────────────────────────────────────────
    if (action === 'submit') {
      const title         = getApplicantTitle(formData);
      const brokerPageId  = await findBrokerPageId(formData.brokerName, apiKey);
      const txTypes       = getTransactionTypes(formData);
      const lenders       = getLenders(formData);

      const properties = {
        'Applicant': {
          title: [{ text: { content: title } }]
        },
        'Application Received': {
          date: { start: new Date().toISOString().split('T')[0] }
        },
        'Status': {
          status: { name: 'Pending Assignment' }
        },
      };

      if (txTypes.length > 0) {
        properties['Transaction Type'] = { multi_select: txTypes.map(t => ({ name: t })) };
      }
      if (formData.clientType) {
        properties['Client Type'] = { multi_select: [{ name: formData.clientType }] };
      }
      if (formData.priority) {
        properties['Priority'] = { select: { name: formData.priority } };
      }
      if (lenders.length > 0) {
        properties['Lender'] = { multi_select: lenders.map(l => ({ name: l })) };
      }
      if (brokerPageId) {
        properties['Broker'] = { relation: [{ id: brokerPageId }] };
      }

      const pageBody = buildPageBody(formData);

      const page = await notionFetch('/pages', 'POST', {
        parent:     { database_id: PIPELINE_DB_ID },
        properties,
        children:   pageBody,
      }, apiKey);

      return res.status(200).json({
        success: true,
        pageId:  page.id,
        pageUrl: page.url,
        title,
      });
    }

    return res.status(400).json({ error: 'Invalid action. Use "check" or "submit".' });

  } catch (err) {
    console.error('[notion-submit] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
