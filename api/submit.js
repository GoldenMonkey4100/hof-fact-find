/**
 * HOF Fact Find — Unified Submission Endpoint
 *
 * POST /api/submit   { action: 'check', formData }
 *   → { exists, matches, applicantName }
 *
 * POST /api/submit   { action: 'submit', formData }
 *   → { success, mercuryUrl, notionUrl, title }
 *
 * Orchestration order (submit):
 *   1. Generate doc password + HMAC proxy URLs
 *   2. Create Mercury contacts (one per non-company applicant)
 *   3. Create Mercury opportunity (with relatedParties + full notePadText)
 *   4. Push assets + liabilities to Mercury opportunity
 *   5. Create Notion backup page (non-critical)
 *   6. Post Teams Adaptive Card (non-critical)
 */

import { createHmac } from 'crypto';

// ── Notion constants ──────────────────────────────────────────────────────────
const NOTION_VERSION = '2022-06-28';
const PIPELINE_DB_ID = '264d5849ccf68068b10ffe2b2d18125f';
const BROKERS_DB_ID  = '87ea47cb17de4ca9856fbccd2c4f360a';
const RITA_USER_ID   = '263d872b-594c-81bf-8c33-00024f1c5613';

const VALID_TX_TYPES = new Set(['Refinance', 'Cashout', 'Purchase', 'Top up', 'Construction']);

// ── Teams @mentions ───────────────────────────────────────────────────────────
const TEAMS_MENTIONS = [
  { tag: '<at>Chris</at>',  id: 'chris@houseoffinance.com.au',  name: 'Chris'  },
  { tag: '<at>Rita</at>',   id: 'rita@houseoffinance.com.au',   name: 'Rita'   },
  { tag: '<at>David</at>',  id: 'david@houseoffinance.com.au',  name: 'David'  },
];

// ── Formatters ────────────────────────────────────────────────────────────────
const parseCurrency = (v) => {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
};

const fmtCurrency = (v) => {
  const n = parseCurrency(v);
  return n ? '$' + n.toLocaleString('en-AU') : '—';
};

const formatDOB = (dob) => {
  if (!dob) return undefined;
  const d = String(dob).split('T')[0];
  return `${d}T00:00:00.000Z`;
};

// ── Document security (HMAC password gate) ────────────────────────────────────
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
};

const makeProxyUrl = (blobUrl, password, secret, appBase) => {
  const sig = createHmac('sha256', secret).update(`${blobUrl}|${password}`).digest('hex');
  return `${appBase}/api/documents?blob=${encodeURIComponent(blobUrl)}&sig=${sig}`;
};

// ── Australian address parser ─────────────────────────────────────────────────
const ST_TYPES = 'Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Way|Lane|Ln|Crescent|Cres|Boulevard|Blvd|Parade|Highway|Hwy|Close|Circuit|Terrace|Tce|Grove|Rise|Row|Walk|Square|Loop';

const parseAuAddress = (addr) => {
  if (!addr) return null;
  const clean = addr.replace(/,?\s*Australia\s*$/, '').trim();
  const csMatch = clean.match(/^(.*?),\s*(.+?)\s+([A-Z]{2,3})\s+(\d{4})\s*$/);
  const streetFull = csMatch ? csMatch[1].trim() : clean;
  const city       = csMatch ? csMatch[2].trim().toUpperCase() : '';
  const state      = csMatch ? csMatch[3] : '';
  const postcode   = csMatch ? csMatch[4] : '';
  const stMatch    = streetFull.match(new RegExp(`^(\\d+[A-Za-z]?)\\s+(.*?)\\s+(${ST_TYPES})$`, 'i'));
  const addressBlock = [streetFull, [city, state, postcode].filter(Boolean).join(' ')].filter(Boolean).join('\n');
  return {
    streetNumber: stMatch?.[1] || '',
    streetName:   stMatch?.[2] || streetFull,
    streetType:   stMatch?.[3] || '',
    city, state, postcode,
    country: 'Australia',
    type: 'Home',
    addressBlock,
  };
};

// ── Mercury REST ──────────────────────────────────────────────────────────────
const mercuryFetch = async (path, method, body) => {
  const apiKey   = process.env.MERCURY_API_KEY;
  const apiToken = process.env.MERCURY_API_TOKEN;
  if (!apiKey || !apiToken) throw new Error('Mercury credentials not configured (MERCURY_API_KEY / MERCURY_API_TOKEN)');
  const res = await fetch(`https://apis.connective.com.au/mercury/v1/${apiToken}${path}`, {
    method,
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mercury ${res.status} ${path}: ${text.slice(0, 400)}`);
  try { return JSON.parse(text); } catch { return { rawBody: text }; }
};

const createMercuryContact = async (applicant) => {
  const address = parseAuAddress(applicant.address || applicant.residentialAddress);
  const dob     = formatDOB(applicant.dob);
  const payload = {
    isDeleted: false,
    firstName: applicant.firstName || '',
    lastName:  applicant.lastName  || '',
    ...(applicant.middleName ? { middleName: applicant.middleName } : {}),
    notes: 'Submitted via HOF Fact Find',
    ...(dob ? { dateOfBirth: dob } : {}),
    contactMethods: [
      ...(applicant.phone ? [{ contactMethod: 'Mobile',  content: applicant.phone }] : []),
      ...(applicant.email ? [{ contactMethod: 'Email 1', content: applicant.email }] : []),
    ],
    ...(address ? { addresses: [address] } : {}),
  };
  const result = await mercuryFetch('/contacts', 'POST', payload);
  return result.uniqueId;
};

const ASSET_TYPE_MAP = {
  'Real Estate': 'realEstate', 'Investment Property': 'realEstate', 'Property': 'realEstate',
  'Savings Account': 'savings', 'Term Deposit': 'savings', 'Cash': 'savings',
  'Superannuation': 'superannuation',
  'Vehicle': 'vehicle', 'Car': 'vehicle',
  'Shares': 'shares', 'Managed Funds': 'shares',
  'Home Contents': 'homeContents',
};

const LIABILITY_TYPE_MAP = {
  'Home Loan': 'mortgage', 'Investment Loan': 'mortgage', 'Mortgage': 'mortgage',
  'Credit Card': 'account',
  'Personal Loan': 'personalLoan',
  'Car Loan': 'carLoan',
  'HECS/HELP': 'hecs',
};

// ── notePadText builder ───────────────────────────────────────────────────────
const buildNotePadText = (formData, docPassword, docProxies) => {
  const { securities = [], applicants = [], employment = [] } = formData;
  const p = (key, val) => val ? `  ${(key + ':').padEnd(14)} ${val}` : null;
  const sec = (title) => `\n--- ${title} ---`;
  const L = (v) => v || [];

  const lines = [];
  const now = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  lines.push('=== HOF FACT FIND — NEW APPLICATION ===');
  lines.push('');
  [
    p('Submitted',    now),
    p('Broker',       formData.brokerName),
    p('Priority',     formData.priority),
    p('Client Type',  formData.clientType),
    p('Lead Source',  formData.leadSource),
    p('Lender Pref',  L(formData.lenderPreference).join(', ') || null),
    p('Notes',        formData.brokerNotes),
  ].filter(Boolean).forEach(l => lines.push(l));

  // Applicants
  if (applicants.length > 0) {
    lines.push(sec('APPLICANTS'));
    applicants.forEach((app, i) => {
      lines.push('');
      const roleTag = app.role === 'Guarantor' ? 'Guarantor' : i === 0 ? 'Primary' : 'Secondary';
      if (app.type === 'Company Borrower') {
        lines.push(`Applicant ${i + 1} — ${roleTag} (Company)`);
        [p('Company', app.companyName), p('ABN', app.companyABN), p('Phone', app.phone), p('Email', app.email)].filter(Boolean).forEach(l => lines.push(l));
      } else {
        const name = [app.firstName, app.middleName, app.lastName].filter(Boolean).join(' ');
        lines.push(`Applicant ${i + 1} — ${roleTag} (Natural Person)`);
        [
          p('Name',      name),
          p('DOB',       app.dob),
          p('Phone',     app.phone),
          p('Email',     app.email),
          p('Address',   app.address),
          p('Residency', app.residencyStatus),
          p('Marital',   app.maritalStatus),
          app.numDependants > 0 ? p('Dependants', String(app.numDependants)) : null,
        ].filter(Boolean).forEach(l => lines.push(l));
      }
    });
  }

  // Loan structure
  if (securities.length > 0) {
    lines.push(sec('LOAN STRUCTURE'));
    const totalLoan     = securities.reduce((s, sec) => s + parseCurrency(sec.loanAmount), 0);
    const totalSecurity = securities.reduce((s, sec) => s + parseCurrency(sec.propertyValue), 0);
    const blendedLVR    = totalSecurity > 0 ? (totalLoan / totalSecurity * 100).toFixed(1) + '%' : '—';

    securities.forEach((s, i) => {
      lines.push('');
      lines.push(`Security ${i + 1} — ${s.address || '(address not entered)'}`);
      const txTypes = [...L(s.primaryTransactionTypes), ...L(s.secondaryTransactionTypes)].join(', ');
      const isSplit = s.loanType === 'Split' || s.repaymentType === 'Split';
      [
        p('Value',     fmtCurrency(s.propertyValue)),
        p('Loan',      fmtCurrency(s.loanAmount)),
        p('LVR',       s.lvr ? s.lvr + '%' : null),
        p('Occupancy', s.intendedOccupancy),
        p('Tx Type',   txTypes || null),
        p('App Type',  s.applicationType),
      ].filter(Boolean).forEach(l => lines.push(l));

      if (isSplit) {
        lines.push(`  ${'Repayment:'.padEnd(14)} Split`);
        if (s.split1Amount || s.split1Type) {
          const s1 = [s.split1Amount && fmtCurrency(s.split1Amount), s.split1Type, s.split1RateType].filter(Boolean).join(' | ');
          lines.push(p('Split 1', s1));
        }
        if (s.split2Amount || s.split2Type) {
          const s2 = [s.split2Amount && fmtCurrency(s.split2Amount), s.split2Type, s.split2RateType].filter(Boolean).join(' | ');
          lines.push(p('Split 2', s2));
        }
      } else {
        [p('Repayment', [s.loanType, s.repaymentType].filter(Boolean).join(' / ') || null), p('Term', s.loanTerm ? s.loanTerm + ' years' : null)].filter(Boolean).forEach(l => lines.push(l));
      }
      if (s.ownershipRows?.length > 0) {
        lines.push(p('Ownership', s.ownershipRows.map(o => `${o.name || '?'} (${o.percentage || 0}%)`).join(', ')));
      }
      L(s.purchaseCompletionMethods).forEach(m => {
        const amt = s.purchaseCompletionAmounts?.[m];
        lines.push(p('Completion', `${m}${amt ? ' — ' + fmtCurrency(amt) : ''}`));
      });
    });

    lines.push('');
    lines.push('Totals');
    lines.push(p('Total Loan',     fmtCurrency(String(totalLoan))));
    lines.push(p('Total Security', fmtCurrency(String(totalSecurity))));
    lines.push(p('Blended LVR',   blendedLVR));
  }

  // Employment
  if (employment.length > 0) {
    lines.push(sec('EMPLOYMENT'));
    employment.forEach((emp, i) => {
      lines.push('');
      const ce   = emp.currentEmployment || {};
      const name = emp.applicantName || `Applicant ${i + 1}`;
      lines.push(`${name} — ${ce.employmentType || 'Employment'}`);
      [
        p('Employer', ce.employer),
        p('Title',    ce.role),
        p('Start',    ce.startDate),
        ce.baseIncome ? p('Base Income', [fmtCurrency(ce.baseIncome), 'p.a.', ce.payFrequency && `(paid ${ce.payFrequency})`].filter(Boolean).join(' ')) : null,
        ce.bonusIncome ? p('Bonus',       fmtCurrency(ce.bonusIncome)) : null,
        ce.commissions ? p('Commissions', fmtCurrency(ce.commissions)) : null,
        ce.hecs        ? p('HECS/HELP',   ce.hecs)                     : null,
      ].filter(Boolean).forEach(l => lines.push(l));
      if (ce.incomeVerification?.m2Annual) {
        lines.push(p('Verified', `${fmtCurrency(String(ce.incomeVerification.m2Annual))} annualised${ce.incomeVerification.status === 'verified' ? ' ✓' : ''}`));
      }
      L(emp.previousEmployments).forEach((prev, pi) => {
        lines.push(p(`Previous ${pi + 1}`, `${prev.employer || prev.employerName || '—'} | ${prev.startDate || '?'} → ${prev.endDate || '?'}`));
      });
      if (typeof emp.totalYears === 'number') {
        lines.push(p('History', `${emp.totalYears.toFixed(1)} yrs ${emp.meetsRequirement ? '✓' : '⚠ (< 3 yrs)'}`));
      }
    });
  }

  // Assets
  const allAssets = applicants.flatMap(app => L(app.assets).filter(a => parseCurrency(a.value) > 0));
  if (allAssets.length > 0) {
    lines.push(sec('ASSETS'));
    lines.push('');
    allAssets.forEach(a => {
      const institution = a.bank || a.provider || a.lender || '';
      const detail      = [a.description || a.type || '—', institution].filter(Boolean).join(' / ');
      lines.push(`  ${detail.padEnd(38)} ${fmtCurrency(a.value)}`);
    });
    lines.push(`  ${'─'.repeat(50)}`);
    lines.push(`  ${'TOTAL ASSETS:'.padEnd(38)} ${fmtCurrency(String(allAssets.reduce((s, a) => s + parseCurrency(a.value), 0)))}`);
  }

  // Liabilities
  const allLiabilities = applicants.flatMap(app => L(app.liabilities).filter(l => parseCurrency(l.amount || l.balance) > 0));
  if (allLiabilities.length > 0) {
    lines.push(sec('LIABILITIES'));
    lines.push('');
    allLiabilities.forEach(l => {
      const institution = l.lender || l.institution || '';
      const limitStr    = l.limit ? ` — limit ${fmtCurrency(l.limit)}` : '';
      const detail      = [l.description || l.type || '—', institution ? institution + limitStr : ''].filter(Boolean).join(' / ');
      lines.push(`  ${detail.padEnd(38)} ${fmtCurrency(l.amount || l.balance)}`);
    });
    lines.push(`  ${'─'.repeat(50)}`);
    lines.push(`  ${'TOTAL LIABILITIES:'.padEnd(38)} ${fmtCurrency(String(allLiabilities.reduce((s, l) => s + parseCurrency(l.amount || l.balance), 0)))}`);
  }

  // Documents
  if (docProxies.length > 0) {
    lines.push(sec(`DOCUMENTS  (Password: ${docPassword})`));
    docProxies.forEach(({ label, proxyUrl, blobUrl }) => {
      lines.push('');
      lines.push(label);
      if (proxyUrl) lines.push(`  Access: ${proxyUrl}`);
      if (blobUrl)  lines.push(`  Blob:   ${blobUrl}`);
    });
  }

  return lines.join('\n');
};

// ── Teams Adaptive Card ───────────────────────────────────────────────────────
const postTeamsCard = async (formData, mercuryUrl, notionUrl, docPassword) => {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) { console.warn('[teams] TEAMS_WEBHOOK_URL not set — skipping'); return; }

  const { securities = [], applicants = [] } = formData;
  const primary   = applicants[0];
  const secondary = applicants.find((a, i) => i > 0 && a.role === 'Applicant');

  const getName = (app) => app
    ? (app.type === 'Company Borrower' ? (app.companyName || 'Company') : `${app.firstName || ''} ${app.lastName || ''}`.trim())
    : null;

  const applicantStr = [getName(primary), getName(secondary)].filter(Boolean).join(' / ') || 'Unknown';

  const totalLoan     = securities.reduce((s, sec) => s + parseCurrency(sec.loanAmount), 0);
  const totalSecurity = securities.reduce((s, sec) => s + parseCurrency(sec.propertyValue), 0);
  const blendedLVR    = totalSecurity > 0 ? (totalLoan / totalSecurity * 100).toFixed(1) + '%' : '—';

  const txTypes = new Set();
  securities.forEach(sec => {
    [...(sec.primaryTransactionTypes || []), ...(sec.secondaryTransactionTypes || [])].forEach(t => {
      if (VALID_TX_TYPES.has(t)) txTypes.add(t);
    });
  });

  const mentionText = TEAMS_MENTIONS.map(m => m.tag).join(' ');

  const card = {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.5',
        msteams: {
          entities: TEAMS_MENTIONS.map(m => ({
            type:      'mention',
            text:      m.tag,
            mentioned: { id: m.id, name: m.name },
          })),
        },
        body: [
          { type: 'TextBlock', text: `${mentionText} — New application received`, wrap: true, size: 'Small' },
          { type: 'TextBlock', size: 'Large', weight: 'Bolder', text: 'New Application Received', color: 'Accent' },
          {
            type: 'FactSet',
            facts: [
              { title: 'Applicant(s)',       value: applicantStr },
              { title: 'Transaction Type',   value: [...txTypes].join(', ') || '—' },
              { title: 'Loan Amount',        value: fmtCurrency(String(totalLoan)) },
              { title: 'LVR',               value: blendedLVR },
              { title: 'Lender Preference', value: (formData.lenderPreference || []).join(', ') || '—' },
              { title: 'Broker',            value: formData.brokerName || '—' },
              { title: 'Priority',          value: formData.priority || '—' },
              { title: 'Doc Password',      value: docPassword },
            ],
          },
          {
            type: 'ActionSet',
            actions: [
              { type: 'Action.OpenUrl', title: 'Open in Mercury', url: mercuryUrl },
              ...(notionUrl ? [{ type: 'Action.OpenUrl', title: 'Notion Backup', url: notionUrl }] : []),
            ],
          },
        ],
      },
    }],
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });
  if (!res.ok) console.error('[teams] webhook error:', res.status, await res.text().catch(() => ''));
};

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

const findBrokerPageId = async (brokerName, apiKey) => {
  if (!brokerName) return null;
  try {
    const data = await notionFetch(`/databases/${BROKERS_DB_ID}/query`, 'POST', {
      filter: { property: 'Name', title: { equals: brokerName } }
    }, apiKey);
    return data.results?.[0]?.id || null;
  } catch { return null; }
};

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

// ── Notion block helpers ──────────────────────────────────────────────────────
const rt = (content, bold = false) => [{
  type: 'text',
  text: { content: String(content ?? '').slice(0, 2000) },
  annotations: { bold },
}];

const para    = (content, bold = false) => ({ object: 'block', type: 'paragraph',  paragraph:  { rich_text: rt(content, bold) } });
const h2      = (content)               => ({ object: 'block', type: 'heading_2',  heading_2:  { rich_text: rt(content), is_toggleable: false } });
const h3      = (content)               => ({ object: 'block', type: 'heading_3',  heading_3:  { rich_text: rt(content), is_toggleable: false } });
const divider = ()                      => ({ object: 'block', type: 'divider',    divider: {} });

const callout = (text, emoji = '💡', color = 'gray_background') => ({
  object: 'block', type: 'callout',
  callout: { rich_text: rt(text), icon: { type: 'emoji', emoji }, color },
});

const toggle = (title, children) => ({
  object: 'block', type: 'toggle',
  toggle: { rich_text: rt(title, true), children: children.slice(0, 96) },
});

const tableCell = (content, bold = false) =>
  [{ type: 'text', text: { content: String(content ?? '').slice(0, 2000) }, annotations: { bold } }];

const tableRow = (cells, header = false) => ({
  object: 'block', type: 'table_row',
  table_row: { cells: cells.map(c => tableCell(c, header)) },
});

const table = (headers, rows) => ({
  object: 'block', type: 'table',
  table: {
    table_width: headers.length,
    has_column_header: true,
    has_row_header: false,
    children: [tableRow(headers, true), ...rows.map(r => tableRow(r))],
  },
});

const imageBlock    = (url) => ({ object: 'block', type: 'image',    image:    { type: 'external', external: { url } } });
const bookmarkBlock = (url) => ({ object: 'block', type: 'bookmark', bookmark: { url, caption: [] } });

const colList = (...columns) => ({
  object: 'block', type: 'column_list',
  column_list: {
    children: columns.map(blocks => ({
      object: 'block', type: 'column',
      column: { children: Array.isArray(blocks) ? blocks : [blocks] },
    })),
  },
});

// ── Notion derived-data helpers ───────────────────────────────────────────────
const getApplicantTitle = (formData) => {
  const primary = (formData.applicants || [])[0];
  if (!primary) return 'Unknown Applicant';
  if (primary.type === 'Company Borrower') return primary.companyName || 'Company Applicant';
  return `${primary.firstName || ''} ${primary.lastName || ''}`.trim() || 'Unknown Applicant';
};

const getTransactionTypes = (formData) => {
  const types = new Set();
  (formData.securities || []).forEach(sec => {
    [...(sec.primaryTransactionTypes || []), ...(sec.secondaryTransactionTypes || [])].forEach(t => {
      if (VALID_TX_TYPES.has(t)) types.add(t);
    });
  });
  return [...types];
};

const collectDocumentFiles = (formData) => {
  const files = [];
  (formData.applicants || []).forEach(app => {
    const name = app.type === 'Company Borrower'
      ? (app.companyName || 'Company')
      : `${app.firstName || ''} ${app.lastName || ''}`.trim() || 'Applicant';
    if (app.dlFrontUrl) files.push({ name: `DL Front — ${name}`, type: 'external', external: { url: app.dlFrontUrl } });
    if (app.dlBackUrl)  files.push({ name: `DL Back — ${name}`,  type: 'external', external: { url: app.dlBackUrl  } });
  });
  (formData.employment || []).forEach((emp, i) => {
    const ce = emp.currentEmployment || {};
    if (ce.payslipUrl) files.push({ name: `Payslip — ${emp.applicantName || 'Applicant ' + (i + 1)}`, type: 'external', external: { url: ce.payslipUrl } });
  });
  return files;
};

const calcAddressMonths = (app) => {
  const cy = parseInt(app.yearsAtCurrentAddress)  || 0;
  const cm = parseInt(app.monthsAtCurrentAddress) || 0;
  const hy = (app.addressHistory || []).reduce((s, a) => s + (parseInt(a.yearsAtAddress)  || 0), 0);
  const hm = (app.addressHistory || []).reduce((s, a) => s + (parseInt(a.monthsAtAddress) || 0), 0);
  return cy * 12 + cm + hy * 12 + hm;
};

// ── Notion page body builder (verbatim from notion-submit.js) ─────────────────
const buildPageBody = (formData) => {
  const blocks     = [];
  const securities = formData.securities || [];
  const applicants = formData.applicants || [];
  const employment = formData.employment || [];

  const totalLoan     = securities.reduce((s, sec) => s + parseCurrency(sec.loanAmount),    0);
  const totalSecurity = securities.reduce((s, sec) => s + parseCurrency(sec.propertyValue), 0);
  const blendedLVR    = totalSecurity > 0 ? (totalLoan / totalSecurity * 100) : 0;

  const totalIncome = employment.reduce((sum, emp) => {
    const ce = emp.currentEmployment || {};
    return sum + parseCurrency(ce.baseIncome) + parseCurrency(ce.bonusIncome) + parseCurrency(ce.commissions);
  }, 0);

  const totalAssets = applicants.reduce((sum, app) =>
    sum + (app.assets || []).reduce((s, a) => s + parseCurrency(a.value || a.amount), 0), 0);
  const totalLiabilities = applicants.reduce((sum, app) =>
    sum + (app.liabilities || []).reduce((s, l) => s + parseCurrency(l.balance || l.amount || l.limit), 0), 0);
  const netPosition = totalAssets - totalLiabilities;

  const lvrFlag = blendedLVR > 80 ? '⚠️' : '✅';
  const netFlag = netPosition >= 0 ? '✅' : '⚠️';

  blocks.push(colList(
    callout(`Total Security: ${fmtCurrency(String(totalSecurity))}\nTotal Loan: ${fmtCurrency(String(totalLoan))}\nBlended LVR: ${blendedLVR ? blendedLVR.toFixed(1) + '%' : '—'} ${lvrFlag}`, '🏠', 'blue_background'),
    callout(`Gross Income: ${fmtCurrency(String(totalIncome))} p.a.\nTotal Assets: ${fmtCurrency(String(totalAssets))}\nTotal Liabilities: ${fmtCurrency(String(totalLiabilities))}\nNet Position: ${fmtCurrency(String(netPosition))} ${netFlag}`, '💰', 'green_background'),
    callout(`Lender: ${(formData.lenderPreference || []).join(', ') || '—'}\nPriority: ${formData.priority || '—'}\nClient: ${formData.clientType || '—'}`, '📋', 'gray_background')
  ));
  blocks.push(divider());

  blocks.push(h2('📋 Broker Details'));
  const brokerRows = [
    ['Broker',                formData.brokerName    || '—'],
    ['Email',                 formData.brokerEmail   || '—'],
    ['Lead Source',           formData.leadSource    || '—'],
    ['Client Type',           formData.clientType    || '—'],
    ['Priority',              formData.priority      || '—'],
    ['Lender Preference',     (formData.lenderPreference || []).join(', ') || '—'],
    ['Applicant Type',        formData.applicantType || '—'],
    ['Applicants / Guarantors', `${formData.numApplicants || 1} / ${formData.numGuarantors || 0}`],
  ];
  if (formData.brokerNotes) brokerRows.push(['Broker Notes', formData.brokerNotes]);
  blocks.push(table(['Field', 'Value'], brokerRows));
  blocks.push(divider());

  blocks.push(h2('🏠 Securities'));
  securities.forEach((sec, i) => {
    const lvr    = sec.lvr ? sec.lvr + '%' : '—';
    const txTypes = [...(sec.primaryTransactionTypes || []), ...(sec.secondaryTransactionTypes || [])].join(', ') || '—';
    const features = [sec.isFirstHomeBuyer ? 'First Home Buyer' : '', sec.hasOffset ? 'Offset Account' : '', sec.hasRedraw ? 'Redraw Facility' : ''].filter(Boolean).join(', ') || '—';
    const ownersText = (sec.ownershipRows || []).length > 0
      ? sec.ownershipRows.map(o => `${o.name || 'Unknown'} (${o.percentage || 0}%)`).join(', ') : '—';
    const guarantorText = (sec.guarantors || []).length > 0
      ? sec.guarantors.map(gId => {
          const app = applicants.find(a => a.id === gId);
          if (!app) return null;
          return app.type === 'Company Borrower' ? (app.companyName || 'Company') : `${app.firstName || ''} ${app.lastName || ''}`.trim();
        }).filter(Boolean).join(', ') : '—';

    let loanLines;
    if (sec.repaymentType === 'Split') {
      const loanAmt   = parseFloat(sec.loanAmount) || 0;
      const splitLines = (sec.splits || []).map((sp, si) => {
        const mode = sp.inputMode || 'pct';
        const hasValue = mode === 'amt' ? !!sp.amount : !!sp.percentage;
        if (!hasValue && !sp.type) return '';
        let allocationStr;
        if (mode === 'amt') {
          const rawAmt = parseFloat(sp.amount) || 0;
          const pct = loanAmt > 0 && rawAmt > 0 ? (rawAmt / loanAmt * 100).toFixed(1) + '%' : '';
          allocationStr = `${fmtCurrency(sp.amount)}${pct ? ` (${pct})` : ''}`;
        } else {
          const dollarAmt = loanAmt > 0 && parseFloat(sp.percentage) > 0 ? Math.round(loanAmt * parseFloat(sp.percentage) / 100) : null;
          allocationStr = `${sp.percentage ? sp.percentage + '%' : '—'}${dollarAmt ? ` (${fmtCurrency(String(dollarAmt))})` : ''}`;
        }
        return [`Split ${si + 1}: ${allocationStr}`, sp.type ? `  └ ${sp.type}` : '', sp.rateType ? `  └ ${sp.rateType}${sp.fixedYears ? ' (' + sp.fixedYears + 'yr fixed)' : ''}` : '', sp.type === 'Interest Only' && sp.ioYears ? `  └ IO: ${sp.ioYears} yrs` : ''].filter(Boolean).join('\n');
      }).filter(Boolean);
      loanLines = [`Amount: ${fmtCurrency(sec.loanAmount)}`, `LVR: ${lvr}`, 'Repayment: Split', sec.loanTerm ? `Term: ${sec.loanTerm} years` : '', ...splitLines, features !== '—' ? `Features: ${features}` : ''].filter(Boolean).join('\n');
    } else {
      loanLines = [`Amount: ${fmtCurrency(sec.loanAmount)}`, `LVR: ${lvr}`, sec.loanType ? `Type: ${sec.loanType}` : '', sec.repaymentType ? `Repayment: ${sec.repaymentType}` : '', sec.repaymentType === 'Fixed' && sec.fixedRatePeriod ? `Fixed Period: ${sec.fixedRatePeriod} years` : '', sec.loanTerm ? `Term: ${sec.loanTerm} years` : '', sec.loanType === 'Interest Only' && sec.interestOnlyPeriod ? `IO Period: ${sec.interestOnlyPeriod} years` : '', features !== '—' ? `Features: ${features}` : ''].filter(Boolean).join('\n');
    }

    const txLineItems = [`Transaction: ${txTypes}`];
    if (parseCurrency(sec.cashoutAmount) > 0) txLineItems.push(`Cashout Amount: ${fmtCurrency(sec.cashoutAmount)}`);
    if (parseCurrency(sec.currentLoanBalance) > 0) txLineItems.push(`Current Loan Balance: ${fmtCurrency(sec.currentLoanBalance)}`);
    (sec.purchaseCompletionMethods || []).forEach(method => {
      if (method === 'Equity from Existing Property') {
        const srcIdx = sec.equityPropertyIndex;
        const srcSec = (srcIdx !== '' && srcIdx !== undefined) ? securities[parseInt(srcIdx)] : null;
        txLineItems.push(`Equity Source: Security ${parseInt(srcIdx) + 1}${srcSec?.address ? ' — ' + srcSec.address : ''}`);
        if (srcSec) {
          const equityAmt = parseCurrency(srcSec.cashoutAmount) > 0 ? fmtCurrency(srcSec.cashoutAmount) : `~${fmtCurrency(String(Math.max(0, (parseFloat(srcSec.propertyValue) || 0) * 0.8 - (parseFloat(srcSec.loanAmount) || 0))))} (est. 80% LVR equity)`;
          txLineItems.push(`Equity Available: ${equityAmt}`);
        }
      } else if (method === 'Own Savings') {
        const amt = sec.purchaseCompletionAmounts?.[method];
        txLineItems.push(`Own Savings: ${amt ? fmtCurrency(amt) : 'amount not entered'}`);
      } else if (method === 'Gift from Family') {
        const amt = sec.purchaseCompletionAmounts?.[method];
        txLineItems.push(`Gift from Family${sec.giftRelationship ? ' (' + sec.giftRelationship + ')' : ''}: ${amt ? fmtCurrency(amt) : 'amount not entered'}`);
      } else if (method === 'First Home Owner Grant') {
        txLineItems.push('Purchase via: First Home Owner Grant');
      } else if (method === 'Other') {
        txLineItems.push(`Other: ${sec.purchaseCompletionOther || 'see notes'}`);
      } else {
        txLineItems.push(`Purchase via: ${method}`);
      }
    });
    if (sec.applicationType) txLineItems.push(`Application Type: ${sec.applicationType}`);
    if (sec.crossCollateralise) txLineItems.push('⚠️ Cross-Collateralised');

    const propLines = [`Address: ${sec.address || '—'}`, `State: ${sec.state || '—'}`, `Value: ${fmtCurrency(sec.propertyValue)}`, `Occupancy: ${sec.intendedOccupancy || '—'}`, `Ownership: ${ownersText}`, guarantorText !== '—' ? `Guarantors: ${guarantorText}` : ''].filter(Boolean).join('\n');
    blocks.push(h3(`Security ${i + 1}${sec.address ? ' — ' + sec.address : ''}`));
    blocks.push(colList([callout(propLines, '📍', 'blue_background')], [callout(loanLines, '🏦', 'green_background')], [callout(txLineItems.join('\n'), '📄', 'gray_background')]));
    if (i < securities.length - 1) blocks.push(divider());
  });
  blocks.push(divider());

  blocks.push(h2('👥 Applicants'));
  applicants.forEach((app, i) => {
    const empRecord = employment[i] || {};
    const ce        = empRecord.currentEmployment || {};
    const name = app.type === 'Company Borrower'
      ? (app.companyName || `Company ${i + 1}`)
      : `${app.firstName || ''} ${app.lastName || ''}`.trim() || `Applicant ${i + 1}`;
    const toggleTitle = `${app.role} ${app.number}: ${name} (${app.type})`;
    const inner = [];

    inner.push(h3('Personal Details'));
    if (app.type === 'Company Borrower') {
      inner.push(table(['Field', 'Value'], [
        ['ABN', app.companyABN || '—'], ['ACN', app.companyACN || '—'],
        ['Entity Type', app.entityType || '—'], ['ABN Status', app.abnStatus || '—'],
        ['ABN Registered From', app.abnFrom || '—'],
        ['GST', app.gstRegistered ? `Registered${app.gstDate ? ' from ' + app.gstDate : ''}` : 'Not Registered'],
        ['Main Business Location', app.mainBusinessLocation || '—'],
        ['Registered Address', app.registeredAddress || '—'],
        ['Trading Name', app.tradingName || '—'],
        ['Phone', app.phone || '—'], ['Email', app.email || '—'],
      ]));
    } else {
      const personalRows = [
        ['Full Name', [app.firstName, app.middleName, app.lastName].filter(Boolean).join(' ') || '—'],
        ['Date of Birth', app.dob || '—'], ['Gender', app.gender || '—'],
        ['Phone', app.phone || '—'], ['Email', app.email || '—'],
        ['Licence Number', app.licenceNumber || '—'],
        ['Marital Status', app.maritalStatus || '—'],
        ['Residency', app.residencyStatus || '—'],
      ];
      if (app.visaNumber) personalRows.push(['Visa Number', app.visaNumber]);
      personalRows.push(['Current Address', app.address || '—']);
      if (app.yearsAtCurrentAddress || app.monthsAtCurrentAddress) {
        personalRows.push(['Time at Current Address', [app.yearsAtCurrentAddress && app.yearsAtCurrentAddress + ' years', app.monthsAtCurrentAddress && app.monthsAtCurrentAddress + ' months'].filter(Boolean).join(', ')]);
      }
      (app.addressHistory || []).forEach((ah, j) => {
        const dur = [ah.yearsAtAddress && ah.yearsAtAddress + 'y', ah.monthsAtAddress && ah.monthsAtAddress + 'm'].filter(Boolean).join(' ');
        personalRows.push([`Previous Address ${j + 1}`, [ah.address, dur].filter(Boolean).join(' — ') || '—']);
      });
      if (app.numDependants > 0) {
        personalRows.push(['Dependants', String(app.numDependants)]);
        (app.dependants || []).forEach((d, di) => personalRows.push([`Dependant ${di + 1}`, `${d.name || '—'}, Age ${d.age || '—'}`]));
      } else { personalRows.push(['Dependants', '0']); }
      if (app.type === 'Director Guarantor' && app.relationshipToCompany) personalRows.push(['Relationship to Company', app.relationshipToCompany]);
      if (app.type === 'Natural Person' && i > 0 && app.relationshipToApplicant1) personalRows.push(['Relationship to Applicant 1', app.relationshipToApplicant1]);
      inner.push(table(['Field', 'Value'], personalRows));
      const totalAddrMonths = calcAddressMonths(app);
      const addrYears  = Math.floor(totalAddrMonths / 12);
      const addrMonths = totalAddrMonths % 12;
      const addrMeets  = totalAddrMonths >= 36;
      inner.push(callout(`Address History: ${addrYears} years ${addrMonths} months${addrMeets ? ' ✓' : ' ⚠ (< 3 years required)'}`, addrMeets ? '✅' : '⚠️', addrMeets ? 'green_background' : 'orange_background'));
    }

    if (ce.employmentType || ce.employer || ce.baseIncome) {
      inner.push(h3('Employment & Income'));
      const iv = ce.incomeVerification || {};
      const declaredTotal = parseCurrency(ce.baseIncome) + parseCurrency(ce.bonusIncome) + parseCurrency(ce.commissions);
      const ytdAnnualised = iv.m2Annual || 0;
      const varLabel = { consistent: '✓ Consistent', ytd_higher: '↑ YTD Higher (overtime/allowances)', ytd_lower: '⚠ YTD Lower — lender will use YTD figure', incomplete: '' }[iv.status] || '';
      const empRows = [
        ['Employment Type', ce.employmentType || '—'], ['Employer', ce.employer || '—'],
        ['Role / Position', ce.role || '—'], ['Employer ABN', ce.abn || '—'],
        ['Start Date', ce.startDate || '—'], ['Pay Frequency', ce.payFrequency || '—'],
        ['Base Income (p.a.)', fmtCurrency(ce.baseIncome)],
        ['Bonus (p.a.)', ce.bonusIncome ? fmtCurrency(ce.bonusIncome) : '—'],
        ['Commissions (p.a.)', ce.commissions ? fmtCurrency(ce.commissions) : '—'],
        ['Total Declared Income', fmtCurrency(String(declaredTotal))],
      ];
      if (ytdAnnualised) {
        empRows.push(['YTD Annualised Income', `${fmtCurrency(String(ytdAnnualised))}${varLabel ? '  ' + varLabel : ''}`]);
        if (iv.explanations?.length > 0) empRows.push(['Variance Notes', iv.explanations.join('; ')]);
        if (iv.otherNotes) empRows.push(['Variance Notes (Other)', iv.otherNotes]);
      }
      if (ce.hecs) empRows.push(['HECS/HELP Debt', ce.hecs]);
      inner.push(table(['Field', 'Value'], empRows));
      (empRecord.previousEmployments || []).forEach((prev, pi) => {
        inner.push(para([`Previous ${pi + 1}: ${prev.employmentType || '—'}`, prev.employer ? `Employer: ${prev.employer}` : '', prev.abn ? `ABN: ${prev.abn}` : '', prev.role ? `Role: ${prev.role}` : '', `Period: ${prev.startDate || '?'} → ${prev.endDate || 'present'}`].filter(Boolean).join(' · ')));
      });
      const yearsLabel = `${(empRecord.totalYears || 0).toFixed(1)} years${empRecord.meetsRequirement ? ' ✓' : ' ⚠ (< 3 years required)'}`;
      inner.push(callout(`Employment History: ${yearsLabel}`, empRecord.meetsRequirement ? '✅' : '⚠️', empRecord.meetsRequirement ? 'green_background' : 'orange_background'));
    }

    const assets      = app.assets      || [];
    const liabilities = app.liabilities || [];
    if (assets.length > 0 || liabilities.length > 0) {
      inner.push(h3('Financial Position'));
      if (assets.length > 0) {
        inner.push(table(['Asset Type', 'Description', 'Value'], assets.map(a => [a.type || a.category || '—', a.description || a.address || a.institution || a.name || '—', fmtCurrency(a.value || a.amount)])));
      }
      if (liabilities.length > 0) {
        inner.push(table(['Liability Type', 'Lender / Description', 'Balance', 'Repayment'], liabilities.map(l => [l.type || l.category || '—', l.lender || l.institution || l.description || '—', fmtCurrency(l.balance || l.amount || l.limit), l.repayment ? fmtCurrency(l.repayment) + '/mo' : '—'])));
      }
      const appAssets = assets.reduce((s, a) => s + parseCurrency(a.value || a.amount), 0);
      const appLiabs  = liabilities.reduce((s, l) => s + parseCurrency(l.balance || l.amount || l.limit), 0);
      const appNet    = appAssets - appLiabs;
      inner.push(callout(`Assets: ${fmtCurrency(String(appAssets))}   Liabilities: ${fmtCurrency(String(appLiabs))}   Net Position: ${fmtCurrency(String(appNet))}`, appNet >= 0 ? '✅' : '⚠️', appNet >= 0 ? 'green_background' : 'orange_background'));
    }

    if (app.type !== 'Company Borrower') {
      inner.push(h3('📎 Documents'));
      const hasDLFront = !!app.dlFrontUrl;
      const hasDLBack  = !!app.dlBackUrl;
      const hasPayslip = !!ce.payslipUrl;
      const hasSigned  = app.eSignature?.status === 'signed';
      const signedDate = hasSigned && app.eSignature?.signedAt ? new Date(app.eSignature.signedAt).toLocaleDateString('en-AU') : null;
      inner.push(table(['Document', 'Status', 'Details'], [
        ['🪪 Driver Licence — Front', hasDLFront ? '✅ Uploaded' : '⬜ Missing', hasDLFront ? 'Stored in Files & media' : 'Upload in fact find → Step 1'],
        ['🪪 Driver Licence — Back',  hasDLBack  ? '✅ Uploaded' : '⬜ Missing', hasDLBack  ? 'Stored in Files & media' : 'Upload in fact find → Step 1'],
        ['💰 Payslip / Income Doc',   hasPayslip ? '✅ Uploaded' : '⬜ Missing', hasPayslip ? 'Stored in Files & media' : 'Upload in fact find → Step 2'],
        ['✍️ Credit Guide',           hasSigned  ? '✅ Signed'   : '⬜ Pending', hasSigned  ? `Signed ${signedDate || '—'}` : 'Send via Step 1 e-signature'],
      ]));
      if (hasDLFront) inner.push(imageBlock(app.dlFrontUrl));
      if (hasDLBack)  inner.push(imageBlock(app.dlBackUrl));
      if (hasPayslip) inner.push(bookmarkBlock(ce.payslipUrl));
      if (hasSigned && app.eSignature?.submissionId) inner.push(bookmarkBlock(`/api/docuseal-download?submissionId=${app.eSignature.submissionId}&type=signed`));
    }

    blocks.push(toggle(toggleTitle, inner));
  });

  if (formData.brokerNotes && formData.brokerNotes.length > 200) {
    blocks.push(divider());
    blocks.push(callout(formData.brokerNotes, '📝', 'yellow_background'));
  }

  return blocks;
};

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { action, formData } = req.body || {};
  const notionApiKey = process.env.NOTION_API_KEY;

  try {
    // ── Duplicate check ───────────────────────────────────────────────────────
    if (action === 'check') {
      if (!notionApiKey) return res.status(500).json({ error: 'NOTION_API_KEY not configured' });
      const name    = getApplicantTitle(formData);
      const matches = await checkDuplicate(name, notionApiKey);
      return res.status(200).json({ exists: matches.length > 0, matches, applicantName: name });
    }

    // ── Full submission ───────────────────────────────────────────────────────
    if (action === 'submit') {
      const secret      = process.env.DOCUMENT_SIGNING_SECRET;
      const appBase     = `https://${req.headers.host}`;
      const docPassword = generatePassword();

      // Build document proxy URLs
      const docProxies = [];
      (formData.applicants || []).forEach((app, i) => {
        const label = app.type === 'Company Borrower'
          ? (app.companyName || `Company ${i + 1}`)
          : `${app.firstName || ''} ${app.lastName || ''}`.trim() || `Applicant ${i + 1}`;
        const ce = (formData.employment || [])[i]?.currentEmployment || {};
        if (app.dlFrontUrl) docProxies.push({ label: `${label} — DL Front`, proxyUrl: secret ? makeProxyUrl(app.dlFrontUrl, docPassword, secret, appBase) : null, blobUrl: app.dlFrontUrl });
        if (app.dlBackUrl)  docProxies.push({ label: `${label} — DL Back`,  proxyUrl: secret ? makeProxyUrl(app.dlBackUrl,  docPassword, secret, appBase) : null, blobUrl: app.dlBackUrl  });
        if (ce.payslipUrl)  docProxies.push({ label: `${label} — Payslip`,  proxyUrl: secret ? makeProxyUrl(ce.payslipUrl,  docPassword, secret, appBase) : null, blobUrl: ce.payslipUrl  });
      });

      // 1. Create Mercury contacts
      const contactMeta = [];
      for (const app of (formData.applicants || [])) {
        if (app.type === 'Company Borrower') continue;
        const contactId = await createMercuryContact(app);
        contactMeta.push({ contactId, app });
      }

      // 2. Build opportunity name
      const getName = (app) => app
        ? (app.type === 'Company Borrower' ? (app.companyName || 'Company') : `${app.firstName || ''} ${app.lastName || ''}`.trim())
        : null;
      const applicants  = formData.applicants || [];
      const secondary   = applicants.find((a, i) => i > 0 && a.role === 'Applicant');
      const opportunityName = [getName(applicants[0]), getName(secondary)].filter(Boolean).join(' / ') || 'New Application';

      // 3. Build notePadText + opportunity payload
      const notePadText = buildNotePadText(formData, docPassword, docProxies);
      const securities  = formData.securities || [];
      const totalLoan   = securities.reduce((s, sec) => s + parseCurrency(sec.loanAmount), 0);

      const relatedParties = contactMeta.map(({ contactId, app }) => ({
        personId:     contactId,
        relationship: app.role === 'Guarantor' ? 'Guarantor' : app.number === 1 ? 'Primary applicant' : 'Secondary applicant',
      }));

      const oppResult = await mercuryFetch('/opportunities', 'POST', {
        isDeleted:       false,
        transactionType: 'Loan',
        opportunityName,
        amount:          totalLoan || 0,
        status:          '01. Lead',
        broker:          formData.brokerName  || '',
        leadSource:      formData.leadSource  || '',
        notePadText,
        ...(relatedParties.length > 0 ? { relatedParties } : {}),
      });

      const opportunityId = oppResult.uniqueId;
      const mercuryUrl    = `https://crm.connective.com.au/#/opportunities/${opportunityId}`;

      // 3b. Create "Review application" task (non-fatal)
      await mercuryFetch(`/opportunities/${opportunityId}/tasks`, 'POST', {
        name:     'Review application',
        dueDate:  new Date().toISOString().split('T')[0],
        priority: 'Urgent',
        status:   'Open',
      }).catch(err => console.error('[mercury] task creation failed:', err.message));

      // 4. Push assets (non-fatal if fails)
      const allAssets = applicants.flatMap(app =>
        (app.assets || []).filter(a => parseCurrency(a.value) > 0).map(a => ({
          name:  a.description || a.type || 'Asset',
          type:  ASSET_TYPE_MAP[a.type] || 'other',
          value: parseCurrency(a.value),
        }))
      );
      if (allAssets.length > 0) {
        await mercuryFetch(`/opportunities/${opportunityId}/assets`, 'POST', { assets: allAssets }).catch(err => {
          console.error('[mercury] assets push failed:', err.message);
        });
      }

      // 5. Push liabilities (non-fatal if fails)
      const allLiabilities = applicants.flatMap(app =>
        (app.liabilities || []).filter(l => parseCurrency(l.amount || l.balance) > 0).map(l => ({
          name:        l.description || l.type || 'Liability',
          type:        LIABILITY_TYPE_MAP[l.type] || 'other',
          value:       parseCurrency(l.amount || l.balance),
          ...(l.lender || l.institution ? { institution: l.lender || l.institution } : {}),
          ...(l.limit ? { limit: parseCurrency(l.limit) } : {}),
        }))
      );
      if (allLiabilities.length > 0) {
        await mercuryFetch(`/opportunities/${opportunityId}/liabilities`, 'POST', { liabilities: allLiabilities }).catch(err => {
          console.error('[mercury] liabilities push failed:', err.message);
        });
      }

      // 6. Notion backup (non-fatal)
      let notionUrl = null;
      if (notionApiKey) {
        try {
          const title        = getApplicantTitle(formData);
          const brokerPageId = await findBrokerPageId(formData.brokerName, notionApiKey);
          const txTypes      = getTransactionTypes(formData);
          const lenders      = formData.lenderPreference || [];
          const docFiles     = collectDocumentFiles(formData);
          const properties   = {
            'Applicant':            { title: [{ text: { content: title } }] },
            'Application Received': { date: { start: new Date().toISOString().split('T')[0] } },
            'Status':               { status: { name: 'Pending Assignment' } },
            'Manager':              { people: [{ id: RITA_USER_ID }] },
          };
          if (txTypes.length > 0)   properties['Transaction Type'] = { multi_select: txTypes.map(t => ({ name: t })) };
          if (formData.clientType)  properties['Client Type']      = { multi_select: [{ name: formData.clientType }] };
          if (formData.priority)    properties['Priority']         = { select: { name: formData.priority } };
          if (lenders.length > 0)   properties['Lender']           = { multi_select: lenders.map(l => ({ name: l })) };
          if (brokerPageId)         properties['Broker']           = { relation: [{ id: brokerPageId }] };
          if (docFiles.length > 0)  properties['Files & media']    = { files: docFiles };
          const page = await notionFetch('/pages', 'POST', {
            parent: { database_id: PIPELINE_DB_ID },
            icon:   { type: 'emoji', emoji: '📋' },
            properties,
            children: buildPageBody(formData),
          }, notionApiKey);
          notionUrl = page.url;
        } catch (err) {
          console.error('[notion] backup failed:', err.message);
        }
      }

      // 7. Teams notification (non-fatal)
      await postTeamsCard(formData, mercuryUrl, notionUrl || '', docPassword).catch(err => {
        console.error('[teams] notification failed:', err.message);
      });

      return res.status(200).json({
        success: true,
        mercuryUrl,
        notionUrl,
        title: opportunityName,
      });
    }

    return res.status(400).json({ error: 'Invalid action. Use "check" or "submit".' });

  } catch (err) {
    console.error('[submit] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
