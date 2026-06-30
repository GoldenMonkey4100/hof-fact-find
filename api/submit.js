/**
 * HOF Fact Find — Unified Submission Endpoint
 *
 * POST /api/submit   { action: 'quick-submit', formData }
 *   → { success, mercuryUrl, title }
 *
 * POST /api/submit   { action: 'submit', formData }
 *   → { success, mercuryUrl, title }
 *
 * Orchestration order (submit):
 *   1. Generate doc password + HMAC proxy URLs
 *   2. Create Mercury contacts (one per non-company applicant)
 *   3. Create Mercury opportunity (with relatedParties + full notePadText)
 *   4. Push assets + liabilities to Mercury opportunity
 *   5. Send email + PDF to chris@ and rita@ (non-critical)
 *   6. Post Teams Adaptive Card (non-critical)
 */

import { createHmac }    from 'crypto';
import nodemailer         from 'nodemailer';
import PDFDocument        from 'pdfkit';

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
    p('Lender Note',  formData.lenderPreferenceOtherNote || null),
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
      const name = emp.applicantName || `Applicant ${i + 1}`;
      // Support both currentJobs[] (new) and currentEmployment (legacy)
      const jobs = emp.currentJobs || (emp.currentEmployment ? [emp.currentEmployment] : []);
      jobs.forEach((ce, ji) => {
        const etLabel = Array.isArray(ce.employmentType) ? ce.employmentType.join(' / ') : (ce.employmentType || 'Employment');
        lines.push(`${name}${jobs.length > 1 ? ` — Job ${ji + 1}` : ''} — ${etLabel}`);
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
      });
      L(emp.previousEmployments).forEach((prev, pi) => {
        lines.push(p(`Previous ${pi + 1}`, `${prev.employer || prev.employerName || '—'} | ${prev.startDate || '?'} → ${prev.endDate || '?'}`));
      });
      if (typeof emp.totalYears === 'number') {
        lines.push(p('History', `${emp.totalYears.toFixed(1)} yrs ${emp.meetsRequirement ? '✓' : '⚠ (< 3 yrs)'}`));
      }
    });
  }

  // Assets
  const ownerLabel = (ownership, applicants) => {
    if (!ownership || ownership === 'joint' || applicants.length < 2) return '';
    const app = applicants.find(a => String(a.id) === String(ownership));
    return app ? ` [${app.firstName || 'Applicant'}]` : '';
  };
  const allAssets = applicants.flatMap((app, ai) => L(app.assets).filter(a => parseCurrency(a.value) > 0).map(a => ({ ...a, _appName: app.firstName || `Applicant ${ai + 1}` })));
  if (allAssets.length > 0) {
    lines.push(sec('ASSETS'));
    lines.push('');
    allAssets.forEach(a => {
      const institution = a.bank || a.provider || a.lender || '';
      const own  = ownerLabel(a.ownership, applicants);
      const detail = [a.description || a.type || '—', institution, own].filter(Boolean).join(' / ');
      lines.push(`  ${detail.padEnd(38)} ${fmtCurrency(a.value)}`);
    });
    lines.push(`  ${'─'.repeat(50)}`);
    lines.push(`  ${'TOTAL ASSETS:'.padEnd(38)} ${fmtCurrency(String(allAssets.reduce((s, a) => s + parseCurrency(a.value), 0)))}`);
  }

  // Liabilities
  const allLiabilities = applicants.flatMap((app, ai) => L(app.liabilities).filter(l => parseCurrency(l.amount || l.balance) > 0).map(l => ({ ...l, _appName: app.firstName || `Applicant ${ai + 1}` })));
  if (allLiabilities.length > 0) {
    lines.push(sec('LIABILITIES'));
    lines.push('');
    allLiabilities.forEach(l => {
      const institution = l.lender || l.institution || '';
      const limitStr    = l.limit ? ` — limit ${fmtCurrency(l.limit)}` : '';
      const own  = ownerLabel(l.ownership, applicants);
      const detail = [l.description || l.type || '—', institution ? institution + limitStr : '', own].filter(Boolean).join(' / ');
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
const postTeamsCard = async (formData, mercuryUrl, docPassword) => {
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
              { title: 'Lender Note',       value: formData.lenderPreferenceOtherNote || '—' },
              { title: 'Broker',            value: formData.brokerName || '—' },
              { title: 'Priority',          value: formData.priority || '—' },
              { title: 'Doc Password',      value: docPassword },
            ],
          },
          {
            type: 'ActionSet',
            actions: [
              { type: 'Action.OpenUrl', title: 'Open in Mercury', url: mercuryUrl },
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

// ── Email + PDF helpers ───────────────────────────────────────────────────────
const generateLoanSummaryPDF = (formData, mercuryUrl) =>
  new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const GOLD = '#CBB26B';
    const DARK = '#1a1814';

    // Header bar
    doc.rect(0, 0, doc.page.width, 60).fill(DARK);
    doc.fontSize(18).fillColor(GOLD).text('HOUSE OF FINANCE', 50, 18);
    doc.fontSize(9).fillColor('#aaa').text('New Fact Find Application', 50, 42);

    // Divider
    doc.moveTo(50, 75).lineTo(545, 75).strokeColor(GOLD).lineWidth(1).stroke();

    // Body text — use buildNotePadText as content map
    const text = buildNotePadText(formData, '—', []);
    doc.fontSize(8).fillColor(DARK).text(text, 50, 90, { lineGap: 3, width: 495 });

    // Footer
    const footerY = doc.page.height - 40;
    doc.fontSize(7).fillColor('#999')
      .text(`Mercury: ${mercuryUrl}`, 50, footerY, { align: 'left', width: 350 })
      .text(`Generated ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}`, 400, footerY, { align: 'right', width: 145 });

    doc.end();
  });

const sendLoanSummaryEmail = async (formData, pdfBuffer, mercuryUrl, opportunityName) => {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.office365.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls:  { ciphers: 'SSLv3' },
  });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#12110D;padding:20px 24px">
        <h1 style="color:#CBB26B;margin:0;font-size:20px">House of Finance</h1>
        <p style="color:#999;margin:4px 0 0;font-size:12px">New Fact Find Application</p>
      </div>
      <div style="padding:24px;background:#fff">
        <h2 style="color:#12110D;font-size:16px;margin:0 0 16px">${opportunityName}</h2>
        <p style="color:#333;font-size:14px;margin:0 0 16px">A new fact find has been submitted. The full loan summary is attached as a PDF.</p>
        <a href="${mercuryUrl}" style="background:#CBB26B;color:#12110D;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:bold;font-size:13px;display:inline-block">Open in Mercury →</a>
        <p style="color:#aaa;font-size:11px;margin:24px 0 0">Submitted via HOF Fact Find · ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
      </div>
    </div>`;

  const safeFile = opportunityName.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '-');
  await transporter.sendMail({
    from:        `"House of Finance" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to:          'chris@houseoffinance.com.au, rita@houseoffinance.com.au',
    subject:     `New Fact Find: ${opportunityName}`,
    html,
    attachments: [{ filename: `${safeFile}-FactFind.pdf`, content: pdfBuffer }],
  });
};

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { action, formData } = req.body || {};

  try {
    // ── Quick Fact Find submission ────────────────────────────────────────────
    if (action === 'quick-submit') {
      const { applicants = [], loanPurpose, loanAmount, suburb, state, broker, leadSource, notes } = formData || {};

      // 1. Create Mercury contacts (non-company only)
      const contactMeta = [];
      for (const app of applicants) {
        if (!app.firstName && !app.lastName) continue;
        const contactId = await createMercuryContact({
          firstName: app.firstName,
          lastName:  app.lastName,
          phone:     app.mobile,
          email:     app.email,
        });
        contactMeta.push({ contactId, app });
      }

      // 2. Build opportunity name + notePadText
      const names = applicants.filter(a => a.firstName || a.lastName).map(a => `${a.firstName || ''} ${a.lastName || ''}`.trim()).filter(Boolean);
      const opportunityName = names.join(' / ') || 'Quick Lead';
      const location = [suburb, state].filter(Boolean).join(' ');
      const loanAmtNum = parseFloat(String(loanAmount || '').replace(/[^0-9.]/g, '')) || 0;

      const quickNotePad = [
        '=== HOF QUICK FACT FIND — LEAD CAPTURE ===',
        '',
        `  Submitted:     ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        `  Broker:        ${broker || '—'}`,
        `  Lead Source:   ${leadSource || '—'}`,
        '',
        '--- APPLICANT(S) ---',
        ...applicants.filter(a => a.firstName || a.lastName).map((a, i) =>
          `  Applicant ${i + 1}:  ${[a.firstName, a.lastName].filter(Boolean).join(' ')}${a.mobile ? ` | ${a.mobile}` : ''}${a.email ? ` | ${a.email}` : ''}`
        ),
        '',
        '--- LOAN DETAILS ---',
        `  Purpose:       ${loanPurpose || '—'}`,
        `  Amount:        ${loanAmtNum ? fmtCurrency(String(loanAmtNum)) : '—'}`,
        `  Location:      ${location || '—'}`,
        notes ? `\n--- BROKER NOTES ---\n  ${notes}` : '',
      ].filter(v => v !== null).join('\n');

      const relatedParties = contactMeta.map(({ contactId }, i) => ({
        personId:     contactId,
        relationship: i === 0 ? 'Primary applicant' : 'Secondary applicant',
      }));

      const oppResult = await mercuryFetch('/opportunities', 'POST', {
        isDeleted:       false,
        transactionType: 'Loan',
        opportunityName,
        amount:          loanAmtNum,
        status:          '01. Lead',
        broker:          broker || '',
        leadSource:      leadSource || '',
        notePadText:     quickNotePad,
        ...(relatedParties.length > 0 ? { relatedParties } : {}),
      });

      const opportunityId = oppResult.uniqueId;
      const mercuryUrl    = `https://crm.connective.com.au/#/opportunities/${opportunityId}`;

      // 3. Teams notification (simplified card, non-fatal)
      const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
      if (webhookUrl) {
        const mentionText = TEAMS_MENTIONS.map(m => m.tag).join(' ');
        const quickCard = {
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.5',
              msteams: {
                entities: TEAMS_MENTIONS.map(m => ({ type: 'mention', text: m.tag, mentioned: { id: m.id, name: m.name } })),
              },
              body: [
                { type: 'TextBlock', text: `${mentionText} — Quick lead captured`, wrap: true, size: 'Small' },
                { type: 'TextBlock', size: 'Large', weight: 'Bolder', text: 'Quick Lead Captured', color: 'Accent' },
                {
                  type: 'FactSet',
                  facts: [
                    { title: 'Applicant(s)',   value: opportunityName },
                    { title: 'Purpose',        value: loanPurpose || '—' },
                    { title: 'Loan Amount',    value: loanAmtNum ? fmtCurrency(String(loanAmtNum)) : '—' },
                    { title: 'Location',       value: location || '—' },
                    { title: 'Broker',         value: broker || '—' },
                    { title: 'Lead Source',    value: leadSource || '—' },
                  ],
                },
                {
                  type: 'ActionSet',
                  actions: [{ type: 'Action.OpenUrl', title: 'Open in Mercury', url: mercuryUrl }],
                },
              ],
            },
          }],
        };
        await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(quickCard) })
          .catch(err => console.error('[teams] quick card failed:', err.message));
      }

      return res.status(200).json({ success: true, mercuryUrl, title: opportunityName });
    }

    // ── Internal handoff (broker → credit team, no Mercury) ──────────────────
    if (action === 'internal-submit') {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
      const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);

      const { factFindId, formData: fd } = req.body || {};
      if (!factFindId) return res.status(400).json({ error: 'factFindId required' });

      const applicants = fd?.applicants || [];
      const first = applicants[0];
      const clientName = first ? [first.firstName, first.lastName].filter(Boolean).join(' ') || null : null;
      const opportunityName = (applicants.filter(a => a.firstName || a.lastName)
        .map(a => `${a.firstName || ''} ${a.lastName || ''}`.trim())
        .filter(Boolean).join(' / ')) || 'New Fact Find';

      await supabase.from('fact_finds').update({
        status: 'pending_review',
        client_name: clientName,
        form_data: fd,
        updated_at: new Date().toISOString(),
      }).eq('id', factFindId);

      // Teams notification (non-fatal)
      const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
      if (webhookUrl) {
        const card = {
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.5',
              body: [
                { type: 'TextBlock', size: 'Large', weight: 'Bolder', text: '📋 New Fact Find — Ready for Review', color: 'Accent' },
                {
                  type: 'FactSet',
                  facts: [
                    { title: 'Client',      value: opportunityName },
                    { title: 'Broker',      value: fd?.brokerName || '—' },
                    { title: 'Priority',    value: fd?.priority || '—' },
                    { title: 'Lender Pref', value: (fd?.lenderPreference || []).join(', ') || '—' },
                  ],
                },
              ],
            },
          }],
        };
        await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card) })
          .catch(err => console.error('[teams] internal-submit card failed:', err.message));
      }

      // Email blast to all analysts (non-fatal)
      try {
        const transporter = nodemailer.createTransport({
          host:   process.env.SMTP_HOST || 'smtp.office365.com',
          port:   parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          tls:  { ciphers: 'SSLv3' },
        });
        const analystAddresses = [
          'rita@houseoffinance.com.au',
          'danny@houseoffinance.com.au',
          'sushma@houseoffinance.com.au',
          'jeanpierre@houseoffinance.com.au',
          'carla@houseoffinance.com.au',
        ].join(', ');
        const totalLoan = (fd?.securities || []).reduce((s, sec) => s + (parseFloat(String(sec.loanAmount || '').replace(/[$,\s]/g, '')) || 0), 0);
        const loanFmt = totalLoan ? '$' + totalLoan.toLocaleString('en-AU') : '—';
        const notesExcerpt = fd?.brokerNotes ? fd.brokerNotes.slice(0, 200) + (fd.brokerNotes.length > 200 ? '…' : '') : null;
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#12110D;padding:20px 24px">
              <h1 style="color:#CBB26B;margin:0;font-size:20px">House of Finance</h1>
              <p style="color:#999;margin:4px 0 0;font-size:12px">Credit Analysis Queue — New Submission</p>
            </div>
            <div style="padding:24px;background:#fff">
              <h2 style="color:#12110D;font-size:16px;margin:0 0 16px">${opportunityName}</h2>
              <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
                <tr><td style="padding:6px 0;color:#666;font-size:13px;width:140px">Broker</td><td style="padding:6px 0;color:#111;font-size:13px;font-weight:600">${fd?.brokerName || '—'}</td></tr>
                <tr><td style="padding:6px 0;color:#666;font-size:13px">Loan Amount</td><td style="padding:6px 0;color:#111;font-size:13px;font-weight:600">${loanFmt}</td></tr>
                <tr><td style="padding:6px 0;color:#666;font-size:13px">Priority</td><td style="padding:6px 0;color:#111;font-size:13px;font-weight:600">${fd?.priority || '—'}</td></tr>
                <tr><td style="padding:6px 0;color:#666;font-size:13px">Lender Pref</td><td style="padding:6px 0;color:#111;font-size:13px">${(fd?.lenderPreference || []).join(', ') || '—'}</td></tr>
                ${notesExcerpt ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;vertical-align:top">Broker Notes</td><td style="padding:6px 0;color:#555;font-size:13px">${notesExcerpt}</td></tr>` : ''}
              </table>
              <a href="https://hof-fact-find.vercel.app" style="background:#CBB26B;color:#12110D;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:bold;font-size:13px;display:inline-block">Open Credit Analysis Queue →</a>
              <p style="color:#aaa;font-size:11px;margin:24px 0 0">Submitted via HOF Fact Find · ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>`;
        await transporter.sendMail({
          from:    `"House of Finance" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to:      analystAddresses,
          subject: `[HOF] New fact find: ${opportunityName} — submitted by ${fd?.brokerName || 'Broker'}`,
          html,
        });
      } catch (err) {
        console.error('[email] analyst blast failed:', err.message);
      }

      return res.status(200).json({ success: true, title: opportunityName });
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

      // 6. Email + PDF (non-fatal)
      try {
        const pdfBuffer = await generateLoanSummaryPDF(formData, mercuryUrl);
        await sendLoanSummaryEmail(formData, pdfBuffer, mercuryUrl, opportunityName);
      } catch (err) {
        console.error('[email] failed:', err.message);
      }

      // 7. Teams notification (non-fatal)
      await postTeamsCard(formData, mercuryUrl, docPassword).catch(err => {
        console.error('[teams] notification failed:', err.message);
      });

      // 8. Mark fact find as submitted in Supabase (non-fatal)
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
          const sb = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);
          const factFindId = req.body.factFindId;
          const upsertPayload = {
            broker_email: formData.brokerEmail,
            broker_name: formData.brokerName || null,
            status: 'submitted',
            form_data: formData,
            mercury_url: mercuryUrl,
            mercury_title: opportunityName,
            client_name: [formData.applicants?.[0]?.firstName, formData.applicants?.[0]?.lastName].filter(Boolean).join(' ') || null,
            updated_at: new Date().toISOString(),
          };
          if (factFindId) {
            await sb.from('fact_finds').update(upsertPayload).eq('id', factFindId);
          } else {
            await sb.from('fact_finds').insert(upsertPayload);
          }
        } catch (err) {
          console.error('[supabase] upsert failed:', err.message);
        }
      }

      return res.status(200).json({ success: true, mercuryUrl, title: opportunityName });
    }

    // ── Save compliance QA responses (auto-save, debounced from client) ──────
    if (action === 'save-compliance') {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
      const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);
      const { id, compliance_qa } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      await supabase.from('fact_finds').update({ compliance_qa, updated_at: new Date().toISOString() }).eq('id', id);
      return res.status(200).json({ ok: true });
    }

    // ── Complete compliance QA — marks file as lodged ─────────────────────
    if (action === 'complete-compliance') {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
      const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);
      const { id, compliance_qa } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      await supabase.from('fact_finds')
        .update({ compliance_qa, status: 'lodged', updated_at: new Date().toISOString() })
        .eq('id', id);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Invalid action. Use "quick-submit" or "submit".' });

  } catch (err) {
    console.error('[submit] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
