/**
 * Notion Pipeline Integration — Enhanced Layout
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

// ── Block constructors ────────────────────────────────────────────────────────
const rt = (content, bold = false) => [{
  type: 'text',
  text: { content: String(content ?? '').slice(0, 2000) },
  annotations: { bold },
}];

const para = (content, bold = false) => ({
  object: 'block', type: 'paragraph',
  paragraph: { rich_text: rt(content, bold) },
});

const h2 = (content) => ({
  object: 'block', type: 'heading_2',
  heading_2: { rich_text: rt(content), is_toggleable: false },
});

const h3 = (content) => ({
  object: 'block', type: 'heading_3',
  heading_3: { rich_text: rt(content), is_toggleable: false },
});

const divider = () => ({ object: 'block', type: 'divider', divider: {} });

const callout = (text, emoji = '💡', color = 'gray_background') => ({
  object: 'block', type: 'callout',
  callout: { rich_text: rt(text), icon: { type: 'emoji', emoji }, color },
});

const toggle = (title, children) => ({
  object: 'block', type: 'toggle',
  toggle: { rich_text: rt(title, true), children: children.slice(0, 96) },
});

// Table helpers — rows are passed as children of the table block
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
    children: [
      tableRow(headers, true),
      ...rows.map(r => tableRow(r)),
    ],
  },
});

const imageBlock = (url) => ({
  object: 'block', type: 'image',
  image: { type: 'external', external: { url } },
});

const bookmarkBlock = (url) => ({
  object: 'block', type: 'bookmark',
  bookmark: { url, caption: [] },
});

const toDo = (text, checked = false) => ({
  object: 'block', type: 'to_do',
  to_do: { rich_text: rt(text), checked },
});

// column_list — top-level page only (not inside toggles)
const colList = (...columns) => ({
  object: 'block', type: 'column_list',
  column_list: {
    children: columns.map(blocks => ({
      object: 'block', type: 'column',
      column: { children: Array.isArray(blocks) ? blocks : [blocks] },
    })),
  },
});

// ── Derived data helpers ──────────────────────────────────────────────────────
const getApplicantTitle = (formData) => {
  const primary = (formData.applicants || [])[0];
  if (!primary) return 'Unknown Applicant';
  if (primary.type === 'Company Borrower') return primary.companyName || 'Company Applicant';
  return `${primary.firstName || ''} ${primary.lastName || ''}`.trim() || 'Unknown Applicant';
};

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

const VALID_LENDERS = new Set(['Bluestone', 'Pepper', 'Thinktank', 'anz', 'St George', 'Bankwest', 'CBA', 'Westpac', 'NAB']);
const getLenders = (formData) => (formData.lenderPreference || []).filter(l => VALID_LENDERS.has(l));

// ── Page body builder ─────────────────────────────────────────────────────────
const buildPageBody = (formData) => {
  const blocks = [];
  const securities = formData.securities || [];
  const applicants = formData.applicants || [];
  const employment = formData.employment || [];

  // ── Calculate summary stats ───────────────────────────────────────────────
  const totalLoan = securities.reduce((s, sec) => s + parseCurrency(sec.loanAmount), 0);
  const totalSecurity = securities.reduce((s, sec) => s + parseCurrency(sec.propertyValue), 0);
  const blendedLVR = totalSecurity > 0 ? (totalLoan / totalSecurity * 100) : 0;

  const totalIncome = employment.reduce((sum, emp) => {
    const ce = emp.currentEmployment || {};
    return sum + parseCurrency(ce.baseIncome) + parseCurrency(ce.bonusIncome) + parseCurrency(ce.commissions);
  }, 0);

  const totalAssets = applicants.reduce((sum, app) =>
    sum + (app.assets || []).reduce((s, a) => s + parseCurrency(a.value || a.amount), 0), 0);
  const totalLiabilities = applicants.reduce((sum, app) =>
    sum + (app.liabilities || []).reduce((s, l) => s + parseCurrency(l.balance || l.amount || l.limit), 0), 0);
  const netPosition = totalAssets - totalLiabilities;

  // ── 1. Summary callouts (column_list — must be at page level) ─────────────
  const lvrFlag  = blendedLVR > 80 ? '⚠️' : '✅';
  const netFlag  = netPosition >= 0 ? '✅' : '⚠️';

  blocks.push(colList(
    callout(
      `Total Loan: ${fmtCurrency(totalLoan)}\nTotal Security: ${fmtCurrency(totalSecurity)}\nBlended LVR: ${blendedLVR ? blendedLVR.toFixed(1) + '%' : '—'} ${lvrFlag}`,
      '🏠', 'blue_background'
    ),
    callout(
      `Gross Income: ${fmtCurrency(totalIncome)} p.a.\nTotal Assets: ${fmtCurrency(totalAssets)}\nNet Position: ${fmtCurrency(netPosition)} ${netFlag}`,
      '💰', 'green_background'
    ),
    callout(
      `Lender: ${(formData.lenderPreference || []).join(', ') || '—'}\nPriority: ${formData.priority || '—'}\nClient: ${formData.clientType || '—'}`,
      '📋', 'gray_background'
    )
  ));

  blocks.push(divider());

  // ── 2. Broker Details ─────────────────────────────────────────────────────
  blocks.push(h2('📋 Broker Details'));

  const brokerRows = [
    ['Broker', formData.brokerName || '—'],
    ['Email', formData.brokerEmail || '—'],
    ['Lead Source', formData.leadSource || '—'],
    ['Client Type', formData.clientType || '—'],
    ['Priority', formData.priority || '—'],
    ['Lender Preference', (formData.lenderPreference || []).join(', ') || '—'],
    ['Applicant Type', formData.applicantType || '—'],
    ['Applicants / Guarantors', `${formData.numApplicants || 1} / ${formData.numGuarantors || 0}`],
  ];
  if (formData.brokerNotes) brokerRows.push(['Broker Notes', formData.brokerNotes]);
  blocks.push(table(['Field', 'Value'], brokerRows));

  blocks.push(divider());

  // ── 3. Securities ─────────────────────────────────────────────────────────
  blocks.push(h2('🏠 Securities'));

  if (securities.length > 0) {
    const secRows = securities.map((sec, i) => {
      const txTypes = [
        ...(sec.primaryTransactionTypes  || []),
        ...(sec.secondaryTransactionTypes || []),
      ].join(', ') || '—';

      const lvr = sec.lvr ? sec.lvr + '%' : '—';

      const ownersText = (sec.owners || []).length > 0
        ? sec.owners.map(o => `${o.name} (${o.pct}%)`).join(', ')
        : '—';

      return [
        String(i + 1),
        sec.address || '—',
        sec.state || '—',
        fmtCurrency(sec.propertyValue),
        fmtCurrency(sec.loanAmount),
        lvr,
        txTypes,
        sec.intendedOccupancy || '—',
        ownersText,
      ];
    });

    blocks.push(table(
      ['#', 'Address', 'State', 'Value', 'Loan', 'LVR', 'Transaction Types', 'Occupancy', 'Ownership'],
      secRows
    ));

    // Extra detail rows for each security (features, cashout, etc.)
    securities.forEach((sec, i) => {
      const extras = [];
      if (sec.loanType)        extras.push(`Loan: ${sec.loanType}`);
      if (sec.repaymentType)   extras.push(`Repayment: ${sec.repaymentType}`);
      if (sec.loanTerm)        extras.push(`Term: ${sec.loanTerm}y`);
      if (sec.isFirstHomeBuyer) extras.push('FHB');
      if (sec.hasOffset)        extras.push('Offset');
      if (sec.hasRedraw)        extras.push('Redraw');
      if (parseCurrency(sec.cashoutAmount) > 0) extras.push(`Cashout: ${fmtCurrency(sec.cashoutAmount)}`);
      if (sec.currentLoanBalance)               extras.push(`Current Balance: ${fmtCurrency(sec.currentLoanBalance)}`);
      if ((sec.purchaseCompletionMethods || []).length > 0) extras.push(`Purchase via: ${sec.purchaseCompletionMethods.join(', ')}`);
      if (extras.length > 0) blocks.push(para(`Security ${i + 1} — ${extras.join(' · ')}`));
    });
  }

  blocks.push(divider());

  // ── 4. Per-Applicant Sections ─────────────────────────────────────────────
  blocks.push(h2('👥 Applicants'));

  applicants.forEach((app, i) => {
    const empRecord = employment[i] || {};
    const ce        = empRecord.currentEmployment || {};

    const name = app.type === 'Company Borrower'
      ? (app.companyName || `Company ${i + 1}`)
      : `${app.firstName || ''} ${app.lastName || ''}`.trim() || `Applicant ${i + 1}`;

    const toggleTitle = `${app.role} ${app.number}: ${name} (${app.type})`;
    const inner = [];

    // ── Personal Details ──────────────────────────────────────────────────
    inner.push(h3('Personal Details'));

    if (app.type === 'Company Borrower') {
      inner.push(table(['Field', 'Value'], [
        ['ABN',                   app.companyABN || '—'],
        ['ACN',                   app.companyACN || '—'],
        ['Entity Type',           app.entityType || '—'],
        ['ABN Status',            app.abnStatus || '—'],
        ['ABN Registered From',   app.abnFrom || '—'],
        ['GST',                   app.gstRegistered ? `Registered${app.gstDate ? ' from ' + app.gstDate : ''}` : 'Not Registered'],
        ['Main Business Location',app.mainBusinessLocation || '—'],
        ['Registered Address',    app.registeredAddress || '—'],
        ['Trading Name',          app.tradingName || '—'],
        ['Phone',                 app.phone || '—'],
        ['Email',                 app.email || '—'],
      ]));
    } else {
      const personalRows = [
        ['Full Name',      [app.firstName, app.middleName, app.lastName].filter(Boolean).join(' ') || '—'],
        ['Date of Birth',  app.dob || '—'],
        ['Phone',          app.phone || '—'],
        ['Email',          app.email || '—'],
        ['Licence Number', app.licenceNumber || '—'],
        ['Gender',         app.gender || '—'],
        ['Marital Status', app.maritalStatus || '—'],
        ['Residency',      app.residencyStatus || '—'],
        ['Visa Number',    app.visaNumber || '—'],
        ['Current Address',app.address || '—'],
        ['Dependants',     String(app.numDependants || 0)],
      ].filter(r => r[1] !== '—' || ['Full Name','Date of Birth','Phone','Email','Current Address','Dependants'].includes(r[0]));

      if (app.type === 'Director Guarantor' && app.relationshipToCompany)
        personalRows.push(['Relationship to Company', app.relationshipToCompany]);
      if (app.type === 'Natural Person' && i > 0 && app.relationshipToApplicant1)
        personalRows.push(['Relationship to Applicant 1', app.relationshipToApplicant1]);

      (app.addressHistory || []).forEach((ah, j) => {
        const dur = [ah.yearsAtAddress && ah.yearsAtAddress + 'y', ah.monthsAtAddress && ah.monthsAtAddress + 'm'].filter(Boolean).join(' ');
        personalRows.push([`Previous Address ${j + 1}`, [ah.address, dur].filter(Boolean).join(' — ') || '—']);
      });

      inner.push(table(['Field', 'Value'], personalRows));
    }

    // ── Employment & Income ───────────────────────────────────────────────
    if (ce.employmentType || ce.employer || ce.baseIncome) {
      inner.push(h3('Employment & Income'));

      const iv = ce.incomeVerification || {};
      const declaredTotal = parseCurrency(ce.baseIncome) + parseCurrency(ce.bonusIncome) + parseCurrency(ce.commissions);
      const ytdAnnualised = iv.m2Annual || 0;

      const varLabel = {
        consistent: '✓ Consistent',
        ytd_higher: '↑ YTD Higher (overtime/allowances)',
        ytd_lower:  '⚠ YTD Lower — lender will use YTD figure',
        incomplete: '',
      }[iv.status] || '';

      const empRows = [
        ['Employment Type',      ce.employmentType || '—'],
        ['Employer',             ce.employer || '—'],
        ['Role / Position',      ce.role || '—'],
        ['Employer ABN',         ce.abn || '—'],
        ['Start Date',           ce.startDate || '—'],
        ['Pay Frequency',        ce.payFrequency || '—'],
        ['Base Income (p.a.)',   fmtCurrency(ce.baseIncome)],
        ['Bonus (p.a.)',         ce.bonusIncome ? fmtCurrency(ce.bonusIncome) : '—'],
        ['Commissions (p.a.)',   ce.commissions ? fmtCurrency(ce.commissions) : '—'],
        ['Total Declared Income',fmtCurrency(declaredTotal)],
      ];

      if (ytdAnnualised) {
        empRows.push(['YTD Annualised Income', `${fmtCurrency(ytdAnnualised)}${varLabel ? '  ' + varLabel : ''}`]);
        if (iv.explanations?.length > 0) {
          empRows.push(['Income Variance Notes', iv.explanations.join('; ')]);
        }
      }

      if (ce.hecs) empRows.push(['HECS/HELP Debt', ce.hecs]);

      inner.push(table(['Field', 'Value'], empRows));

      // Previous employments (as paragraphs to avoid deep nesting)
      (empRecord.previousEmployments || []).forEach((prev, pi) => {
        inner.push(para(`Previous ${pi + 1}: ${prev.employmentType || '—'} · ${prev.employer || '—'} · ${[prev.startDate || '?', prev.endDate || 'present'].join(' → ')}`));
      });

      const yearsLabel = `${(empRecord.totalYears || 0).toFixed(1)} years${empRecord.meetsRequirement ? ' ✓' : ' ⚠ (< 3 years required)'}`;
      inner.push(callout(`Employment History: ${yearsLabel}`, empRecord.meetsRequirement ? '✅' : '⚠️', empRecord.meetsRequirement ? 'green_background' : 'orange_background'));
    }

    // ── Financial Position ────────────────────────────────────────────────
    const assets      = app.assets      || [];
    const liabilities = app.liabilities || [];

    if (assets.length > 0 || liabilities.length > 0) {
      inner.push(h3('Financial Position'));

      if (assets.length > 0) {
        const assetRows = assets.map(a => [
          a.type || a.category || '—',
          a.description || a.address || a.institution || a.name || '—',
          fmtCurrency(a.value || a.amount),
        ]);
        inner.push(table(['Asset Type', 'Description', 'Value'], assetRows));
      }

      if (liabilities.length > 0) {
        const liabRows = liabilities.map(l => [
          l.type || l.category || '—',
          l.lender || l.institution || l.description || '—',
          fmtCurrency(l.balance || l.amount || l.limit),
          l.repayment ? fmtCurrency(l.repayment) + '/mo' : '—',
        ]);
        inner.push(table(['Liability Type', 'Lender / Description', 'Balance', 'Repayment'], liabRows));
      }

      const appAssets = assets.reduce((s, a) => s + parseCurrency(a.value || a.amount), 0);
      const appLiabs  = liabilities.reduce((s, l) => s + parseCurrency(l.balance || l.amount || l.limit), 0);
      const appNet    = appAssets - appLiabs;
      inner.push(callout(
        `Assets: ${fmtCurrency(appAssets)}   Liabilities: ${fmtCurrency(appLiabs)}   Net Position: ${fmtCurrency(appNet)}`,
        appNet >= 0 ? '✅' : '⚠️',
        appNet >= 0 ? 'green_background' : 'orange_background'
      ));
    }

    // ── Documents ─────────────────────────────────────────────────────────
    if (app.type !== 'Company Borrower') {
      inner.push(h3('Documents'));

      const hasDLFront = !!app.dlFrontUrl;
      const hasDLBack  = !!app.dlBackUrl;
      const hasPayslip = !!ce.payslipUrl;
      const hasSigned  = app.eSignature?.status === 'signed';

      inner.push(toDo('Driver Licence — Front', hasDLFront));
      inner.push(toDo('Driver Licence — Back',  hasDLBack));
      inner.push(toDo('Payslip / Income Document', hasPayslip));
      inner.push(toDo('Credit Guide — E-Signature', hasSigned));

      if (hasDLFront) inner.push(imageBlock(app.dlFrontUrl));
      if (hasDLBack)  inner.push(imageBlock(app.dlBackUrl));
      if (hasPayslip) inner.push(bookmarkBlock(ce.payslipUrl));
    }

    blocks.push(toggle(toggleTitle, inner));
  });

  // ── 5. Broker Notes (if long — as standalone block after toggles) ─────────
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'NOTION_API_KEY not configured in Vercel environment variables' });

  const { action, formData } = req.body || {};

  try {

    // ── Duplicate check ───────────────────────────────────────────────────
    if (action === 'check') {
      const name    = getApplicantTitle(formData);
      const matches = await checkDuplicate(name, apiKey);
      return res.status(200).json({ exists: matches.length > 0, matches, applicantName: name });
    }

    // ── Create Pipeline page ──────────────────────────────────────────────
    if (action === 'submit') {
      const title        = getApplicantTitle(formData);
      const brokerPageId = await findBrokerPageId(formData.brokerName, apiKey);
      const txTypes      = getTransactionTypes(formData);
      const lenders      = getLenders(formData);

      const properties = {
        'Applicant':             { title: [{ text: { content: title } }] },
        'Application Received':  { date: { start: new Date().toISOString().split('T')[0] } },
        'Status':                { status: { name: 'Pending Assignment' } },
      };

      if (txTypes.length > 0)       properties['Transaction Type'] = { multi_select: txTypes.map(t => ({ name: t })) };
      if (formData.clientType)      properties['Client Type']      = { multi_select: [{ name: formData.clientType }] };
      if (formData.priority)        properties['Priority']         = { select: { name: formData.priority } };
      if (lenders.length > 0)       properties['Lender']           = { multi_select: lenders.map(l => ({ name: l })) };
      if (brokerPageId)             properties['Broker']           = { relation: [{ id: brokerPageId }] };

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
