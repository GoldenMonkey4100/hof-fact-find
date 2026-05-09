/**
 * Notion Pipeline Integration — Enhanced Layout v2
 *
 * POST /api/notion-submit   { action: 'check', formData }
 *   → { exists: bool, matches: [{ id, url, title, status }] }
 *
 * POST /api/notion-submit   { action: 'submit', formData }
 *   → { success: true, pageId, pageUrl }
 *
 * Environment variable required:
 *   NOTION_API_KEY  — internal integration token from notion.so/my-integrations
 */

const NOTION_VERSION  = '2022-06-28';
const PIPELINE_DB_ID  = '264d5849ccf68068b10ffe2b2d18125f';
const BROKERS_DB_ID   = '87ea47cb17de4ca9856fbccd2c4f360a';
const RITA_USER_ID    = '263d872b-594c-81bf-8c33-00024f1c5613';

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
const toDo          = (text, checked = false) => ({ object: 'block', type: 'to_do', to_do: { rich_text: rt(text), checked } });

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

// ── Document URL collector (for Files & media property) ───────────────────────
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

// ── Address history total ─────────────────────────────────────────────────────
const calcAddressMonths = (app) => {
  const cy = parseInt(app.yearsAtCurrentAddress)  || 0;
  const cm = parseInt(app.monthsAtCurrentAddress) || 0;
  const hy = (app.addressHistory || []).reduce((s, a) => s + (parseInt(a.yearsAtAddress)  || 0), 0);
  const hm = (app.addressHistory || []).reduce((s, a) => s + (parseInt(a.monthsAtAddress) || 0), 0);
  return cy * 12 + cm + hy * 12 + hm;
};

// ── Page body builder ─────────────────────────────────────────────────────────
const buildPageBody = (formData) => {
  const blocks     = [];
  const securities = formData.securities || [];
  const applicants = formData.applicants || [];
  const employment = formData.employment || [];

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalLoan     = securities.reduce((s, sec) => s + parseCurrency(sec.loanAmount),     0);
  const totalSecurity = securities.reduce((s, sec) => s + parseCurrency(sec.propertyValue),  0);
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

  // ── 1. Summary callouts (column_list — page level only) ───────────────────
  blocks.push(colList(
    // Col 1: Loan totals — Total Security FIRST then Total Loan
    callout(
      `Total Security: ${fmtCurrency(totalSecurity)}\nTotal Loan: ${fmtCurrency(totalLoan)}\nBlended LVR: ${blendedLVR ? blendedLVR.toFixed(1) + '%' : '—'} ${lvrFlag}`,
      '🏠', 'blue_background'
    ),
    // Col 2: Income & Position — includes Total Liabilities
    callout(
      `Gross Income: ${fmtCurrency(totalIncome)} p.a.\nTotal Assets: ${fmtCurrency(totalAssets)}\nTotal Liabilities: ${fmtCurrency(totalLiabilities)}\nNet Position: ${fmtCurrency(netPosition)} ${netFlag}`,
      '💰', 'green_background'
    ),
    // Col 3: Deal info
    callout(
      `Lender: ${(formData.lenderPreference || []).join(', ') || '—'}\nPriority: ${formData.priority || '—'}\nClient: ${formData.clientType || '—'}`,
      '📋', 'gray_background'
    )
  ));

  blocks.push(divider());

  // ── 2. Broker Details ─────────────────────────────────────────────────────
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

  // ── 3. Securities — per-security layout with full loan structure ──────────
  blocks.push(h2('🏠 Securities'));

  securities.forEach((sec, i) => {
    const lvr = sec.lvr ? sec.lvr + '%' : '—';

    const txTypes = [
      ...(sec.primaryTransactionTypes  || []),
      ...(sec.secondaryTransactionTypes || []),
    ].join(', ') || '—';

    const features = [
      sec.isFirstHomeBuyer ? 'First Home Buyer' : '',
      sec.hasOffset        ? 'Offset Account'   : '',
      sec.hasRedraw        ? 'Redraw Facility'   : '',
    ].filter(Boolean).join(', ') || '—';

    // ── Ownership — field is ownershipRows, not owners ──────────────────
    const ownersText = (sec.ownershipRows || []).length > 0
      ? sec.ownershipRows.map(o => `${o.name || 'Unknown'} (${o.percentage || 0}%)`).join(', ')
      : '—';

    // ── Guarantors — look up names from applicant IDs ───────────────────
    const guarantorText = (sec.guarantors || []).length > 0
      ? sec.guarantors.map(gId => {
          const app = applicants.find(a => a.id === gId);
          if (!app) return null;
          return app.type === 'Company Borrower'
            ? (app.companyName || 'Company')
            : `${app.firstName || ''} ${app.lastName || ''}`.trim();
        }).filter(Boolean).join(', ')
      : '—';

    // ── Loan structure — handle Split repayment type separately ─────────
    let loanLines;
    if (sec.repaymentType === 'Split') {
      const loanAmt = parseFloat(sec.loanAmount) || 0;
      const splitLines = (sec.splits || []).map((sp, i) => {
        const mode = sp.inputMode || 'pct';
        const hasValue = mode === 'amt' ? !!sp.amount : !!sp.percentage;
        if (!hasValue && !sp.type) return '';
        let allocationStr;
        if (mode === 'amt') {
          const rawAmt = parseFloat(sp.amount) || 0;
          const pct = loanAmt > 0 && rawAmt > 0 ? (rawAmt / loanAmt * 100).toFixed(1) + '%' : '';
          allocationStr = `${fmtCurrency(sp.amount)}${pct ? ` (${pct})` : ''}`;
        } else {
          const dollarAmt = loanAmt > 0 && parseFloat(sp.percentage) > 0
            ? Math.round(loanAmt * parseFloat(sp.percentage) / 100) : null;
          allocationStr = `${sp.percentage ? sp.percentage + '%' : '—'}${dollarAmt ? ` (${fmtCurrency(String(dollarAmt))})` : ''}`;
        }
        return [
          `Split ${i + 1}: ${allocationStr}`,
          sp.type     ? `  └ ${sp.type}` : '',
          sp.rateType ? `  └ ${sp.rateType}${sp.fixedYears ? ' (' + sp.fixedYears + 'yr fixed)' : ''}` : '',
          sp.type === 'Interest Only' && sp.ioYears ? `  └ IO: ${sp.ioYears} yrs` : '',
        ].filter(Boolean).join('\n');
      }).filter(Boolean);
      loanLines = [
        `Amount: ${fmtCurrency(sec.loanAmount)}`,
        `LVR: ${lvr}`,
        `Repayment: Split`,
        sec.loanTerm ? `Term: ${sec.loanTerm} years` : '',
        ...splitLines,
        features !== '—' ? `Features: ${features}` : '',
      ].filter(Boolean).join('\n');
    } else {
      loanLines = [
        `Amount: ${fmtCurrency(sec.loanAmount)}`,
        `LVR: ${lvr}`,
        sec.loanType      ? `Type: ${sec.loanType}`           : '',
        sec.repaymentType ? `Repayment: ${sec.repaymentType}` : '',
        sec.repaymentType === 'Fixed' && sec.fixedRatePeriod
          ? `Fixed Period: ${sec.fixedRatePeriod} years`       : '',
        sec.loanTerm      ? `Term: ${sec.loanTerm} years`      : '',
        sec.loanType === 'Interest Only' && sec.interestOnlyPeriod
          ? `IO Period: ${sec.interestOnlyPeriod} years`        : '',
        features !== '—'  ? `Features: ${features}`           : '',
      ].filter(Boolean).join('\n');
    }

    // ── Transaction / purchase lines — resolve equity link ──────────────
    const txLineItems = [`Transaction: ${txTypes}`];

    if (parseCurrency(sec.cashoutAmount) > 0)
      txLineItems.push(`Cashout Amount: ${fmtCurrency(sec.cashoutAmount)}`);
    if (parseCurrency(sec.currentLoanBalance) > 0)
      txLineItems.push(`Current Loan Balance: ${fmtCurrency(sec.currentLoanBalance)}`);

    (sec.purchaseCompletionMethods || []).forEach(method => {
      if (method === 'Equity from Existing Property') {
        const srcIdx = sec.equityPropertyIndex;
        const srcSec = (srcIdx !== '' && srcIdx !== undefined) ? securities[parseInt(srcIdx)] : null;
        txLineItems.push(`Equity Source: Security ${parseInt(srcIdx) + 1}${srcSec?.address ? ' — ' + srcSec.address : ''}`);
        if (srcSec) {
          const equityAmt = parseCurrency(srcSec.cashoutAmount) > 0
            ? fmtCurrency(srcSec.cashoutAmount)
            : `~${fmtCurrency(Math.max(0, (parseFloat(srcSec.propertyValue)||0)*0.8 - (parseFloat(srcSec.loanAmount)||0)))} (est. 80% LVR equity)`;
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

    const txLines = txLineItems.join('\n');

    // ── Property callout ─────────────────────────────────────────────────
    const propLines = [
      `Address: ${sec.address || '—'}`,
      `State: ${sec.state || '—'}`,
      `Value: ${fmtCurrency(sec.propertyValue)}`,
      `Occupancy: ${sec.intendedOccupancy || '—'}`,
      `Ownership: ${ownersText}`,
      guarantorText !== '—' ? `Guarantors: ${guarantorText}` : '',
    ].filter(Boolean).join('\n');

    // Security heading
    blocks.push(h3(`Security ${i + 1}${sec.address ? ' — ' + sec.address : ''}`));

    // 3-column callout layout: Property | Loan Structure | Transaction
    blocks.push(colList(
      [callout(propLines,  '📍', 'blue_background')],
      [callout(loanLines,  '🏦', 'green_background')],
      [callout(txLines,    '📄', 'gray_background')]
    ));

    if (i < securities.length - 1) blocks.push(divider());
  });

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

    // ── Personal Details ────────────────────────────────────────────────
    inner.push(h3('Personal Details'));

    if (app.type === 'Company Borrower') {
      inner.push(table(['Field', 'Value'], [
        ['ABN',                    app.companyABN          || '—'],
        ['ACN',                    app.companyACN          || '—'],
        ['Entity Type',            app.entityType          || '—'],
        ['ABN Status',             app.abnStatus           || '—'],
        ['ABN Registered From',    app.abnFrom             || '—'],
        ['GST',                    app.gstRegistered ? `Registered${app.gstDate ? ' from ' + app.gstDate : ''}` : 'Not Registered'],
        ['Main Business Location', app.mainBusinessLocation || '—'],
        ['Registered Address',     app.registeredAddress   || '—'],
        ['Trading Name',           app.tradingName         || '—'],
        ['Phone',                  app.phone               || '—'],
        ['Email',                  app.email               || '—'],
      ]));
    } else {
      // Always include core identity fields (even if empty) for required fields
      const personalRows = [
        ['Full Name',      [app.firstName, app.middleName, app.lastName].filter(Boolean).join(' ') || '—'],
        ['Date of Birth',  app.dob             || '—'],
        ['Gender',         app.gender          || '—'],
        ['Phone',          app.phone           || '—'],
        ['Email',          app.email           || '—'],
        ['Licence Number', app.licenceNumber   || '—'],
        ['Marital Status', app.maritalStatus   || '—'],
        ['Residency',      app.residencyStatus || '—'],
      ];

      if (app.visaNumber) personalRows.push(['Visa Number', app.visaNumber]);

      personalRows.push(['Current Address', app.address || '—']);

      if (app.yearsAtCurrentAddress || app.monthsAtCurrentAddress) {
        personalRows.push(['Time at Current Address',
          [app.yearsAtCurrentAddress && app.yearsAtCurrentAddress + ' years',
           app.monthsAtCurrentAddress && app.monthsAtCurrentAddress + ' months']
          .filter(Boolean).join(', ')]);
      }

      (app.addressHistory || []).forEach((ah, j) => {
        const dur = [ah.yearsAtAddress && ah.yearsAtAddress + 'y', ah.monthsAtAddress && ah.monthsAtAddress + 'm'].filter(Boolean).join(' ');
        personalRows.push([`Previous Address ${j + 1}`, [ah.address, dur].filter(Boolean).join(' — ') || '—']);
      });

      if (app.numDependants > 0) {
        personalRows.push(['Dependants', String(app.numDependants)]);
        (app.dependants || []).forEach((d, di) => {
          personalRows.push([`Dependant ${di + 1}`, `${d.name || '—'}, Age ${d.age || '—'}`]);
        });
      } else {
        personalRows.push(['Dependants', '0']);
      }

      if (app.type === 'Director Guarantor' && app.relationshipToCompany)
        personalRows.push(['Relationship to Company', app.relationshipToCompany]);
      if (app.type === 'Natural Person' && i > 0 && app.relationshipToApplicant1)
        personalRows.push(['Relationship to Applicant 1', app.relationshipToApplicant1]);

      inner.push(table(['Field', 'Value'], personalRows));

      // Address history callout (like employment history)
      const totalAddrMonths = calcAddressMonths(app);
      const addrYears  = Math.floor(totalAddrMonths / 12);
      const addrMonths = totalAddrMonths % 12;
      const addrMeets  = totalAddrMonths >= 36;
      const addrLabel  = `${addrYears} years ${addrMonths} months${addrMeets ? ' ✓' : ' ⚠ (< 3 years required)'}`;
      inner.push(callout(
        `Address History: ${addrLabel}`,
        addrMeets ? '✅' : '⚠️',
        addrMeets ? 'green_background' : 'orange_background'
      ));
    }

    // ── Employment & Income ─────────────────────────────────────────────
    if (ce.employmentType || ce.employer || ce.baseIncome) {
      inner.push(h3('Employment & Income'));

      const iv           = ce.incomeVerification || {};
      const declaredTotal = parseCurrency(ce.baseIncome) + parseCurrency(ce.bonusIncome) + parseCurrency(ce.commissions);
      const ytdAnnualised = iv.m2Annual || 0;

      const varLabel = {
        consistent: '✓ Consistent',
        ytd_higher: '↑ YTD Higher (overtime/allowances)',
        ytd_lower:  '⚠ YTD Lower — lender will use YTD figure',
        incomplete: '',
      }[iv.status] || '';

      const empRows = [
        ['Employment Type',       ce.employmentType || '—'],
        ['Employer',              ce.employer       || '—'],
        ['Role / Position',       ce.role           || '—'],
        ['Employer ABN',          ce.abn            || '—'],
        ['Start Date',            ce.startDate      || '—'],
        ['Pay Frequency',         ce.payFrequency   || '—'],
        ['Base Income (p.a.)',    fmtCurrency(ce.baseIncome)],
        ['Bonus (p.a.)',          ce.bonusIncome  ? fmtCurrency(ce.bonusIncome)  : '—'],
        ['Commissions (p.a.)',    ce.commissions  ? fmtCurrency(ce.commissions)  : '—'],
        ['Total Declared Income', fmtCurrency(declaredTotal)],
      ];

      if (ytdAnnualised) {
        empRows.push(['YTD Annualised Income', `${fmtCurrency(ytdAnnualised)}${varLabel ? '  ' + varLabel : ''}`]);
        if (iv.explanations?.length > 0) empRows.push(['Variance Notes', iv.explanations.join('; ')]);
        if (iv.otherNotes) empRows.push(['Variance Notes (Other)', iv.otherNotes]);
      }
      if (ce.hecs) empRows.push(['HECS/HELP Debt', ce.hecs]);

      inner.push(table(['Field', 'Value'], empRows));

      (empRecord.previousEmployments || []).forEach((prev, pi) => {
        inner.push(para(
          [
            `Previous ${pi + 1}: ${prev.employmentType || '—'}`,
            prev.employer  ? `Employer: ${prev.employer}`              : '',
            prev.abn       ? `ABN: ${prev.abn}`                       : '',
            prev.role      ? `Role: ${prev.role}`                     : '',
            `Period: ${prev.startDate || '?'} → ${prev.endDate || 'present'}`,
          ].filter(Boolean).join(' · ')
        ));
      });

      const yearsLabel = `${(empRecord.totalYears || 0).toFixed(1)} years${empRecord.meetsRequirement ? ' ✓' : ' ⚠ (< 3 years required)'}`;
      inner.push(callout(
        `Employment History: ${yearsLabel}`,
        empRecord.meetsRequirement ? '✅' : '⚠️',
        empRecord.meetsRequirement ? 'green_background' : 'orange_background'
      ));
    }

    // ── Financial Position ──────────────────────────────────────────────
    const assets      = app.assets      || [];
    const liabilities = app.liabilities || [];

    if (assets.length > 0 || liabilities.length > 0) {
      inner.push(h3('Financial Position'));

      if (assets.length > 0) {
        inner.push(table(
          ['Asset Type', 'Description', 'Value'],
          assets.map(a => [
            a.type || a.category || '—',
            a.description || a.address || a.institution || a.name || '—',
            fmtCurrency(a.value || a.amount),
          ])
        ));
      }

      if (liabilities.length > 0) {
        inner.push(table(
          ['Liability Type', 'Lender / Description', 'Balance', 'Repayment'],
          liabilities.map(l => [
            l.type || l.category || '—',
            l.lender || l.institution || l.description || '—',
            fmtCurrency(l.balance || l.amount || l.limit),
            l.repayment ? fmtCurrency(l.repayment) + '/mo' : '—',
          ])
        ));
      }

      const appAssets = assets.reduce((s, a)      => s + parseCurrency(a.value   || a.amount), 0);
      const appLiabs  = liabilities.reduce((s, l) => s + parseCurrency(l.balance || l.amount || l.limit), 0);
      const appNet    = appAssets - appLiabs;
      inner.push(callout(
        `Assets: ${fmtCurrency(appAssets)}   Liabilities: ${fmtCurrency(appLiabs)}   Net Position: ${fmtCurrency(appNet)}`,
        appNet >= 0 ? '✅' : '⚠️',
        appNet >= 0 ? 'green_background' : 'orange_background'
      ));
    }

    // ── Documents ───────────────────────────────────────────────────────
    if (app.type !== 'Company Borrower') {
      inner.push(h3('📎 Documents'));

      const hasDLFront = !!app.dlFrontUrl;
      const hasDLBack  = !!app.dlBackUrl;
      const hasPayslip = !!ce.payslipUrl;
      const hasSigned  = app.eSignature?.status === 'signed';
      const signedDate = hasSigned && app.eSignature?.signedAt
        ? new Date(app.eSignature.signedAt).toLocaleDateString('en-AU')
        : null;

      // Document status table — more scannable than plain to_do blocks
      inner.push(table(
        ['Document', 'Status', 'Details'],
        [
          ['🪪 Driver Licence — Front', hasDLFront ? '✅ Uploaded'  : '⬜ Missing', hasDLFront ? 'Stored in Files & media' : 'Upload in fact find → Step 1'],
          ['🪪 Driver Licence — Back',  hasDLBack  ? '✅ Uploaded'  : '⬜ Missing', hasDLBack  ? 'Stored in Files & media' : 'Upload in fact find → Step 1'],
          ['💰 Payslip / Income Doc',   hasPayslip ? '✅ Uploaded'  : '⬜ Missing', hasPayslip ? 'Stored in Files & media' : 'Upload in fact find → Step 2'],
          ['✍️ Credit Guide',           hasSigned  ? '✅ Signed'    : '⬜ Pending', hasSigned  ? `Signed ${signedDate || '—'}` : 'Send via Step 1 e-signature'],
        ]
      ));

      // Inline images for DL (visual quick-check)
      if (hasDLFront) inner.push(imageBlock(app.dlFrontUrl));
      if (hasDLBack)  inner.push(imageBlock(app.dlBackUrl));
      if (hasPayslip) inner.push(bookmarkBlock(ce.payslipUrl));
      // eSignature audit trail link
      if (hasSigned && app.eSignature?.submissionId) {
        inner.push(bookmarkBlock(`/api/docuseal-download?submissionId=${app.eSignature.submissionId}&type=signed`));
      }
    }

    blocks.push(toggle(toggleTitle, inner));
  });

  // ── 5. Broker Notes standalone (if long) ─────────────────────────────────
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

  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'NOTION_API_KEY not configured in Vercel environment variables' });

  const { action, formData } = req.body || {};

  try {

    // ── Duplicate check ─────────────────────────────────────────────────
    if (action === 'check') {
      const name    = getApplicantTitle(formData);
      const matches = await checkDuplicate(name, apiKey);
      return res.status(200).json({ exists: matches.length > 0, matches, applicantName: name });
    }

    // ── Create Pipeline page ────────────────────────────────────────────
    if (action === 'submit') {
      const title        = getApplicantTitle(formData);
      const brokerPageId = await findBrokerPageId(formData.brokerName, apiKey);
      const txTypes      = getTransactionTypes(formData);
      // Lender: pass all values from lender preference directly (no filtering)
      const lenders      = formData.lenderPreference || [];
      const docFiles     = collectDocumentFiles(formData);

      const properties = {
        'Applicant':            { title: [{ text: { content: title } }] },
        'Application Received': { date: { start: new Date().toISOString().split('T')[0] } },
        'Status':               { status: { name: 'Pending Assignment' } },
        'Manager':              { people: [{ id: RITA_USER_ID }] },
      };

      if (txTypes.length > 0)    properties['Transaction Type'] = { multi_select: txTypes.map(t => ({ name: t })) };
      if (formData.clientType)   properties['Client Type']      = { multi_select: [{ name: formData.clientType }] };
      if (formData.priority)     properties['Priority']         = { select: { name: formData.priority } };
      if (lenders.length > 0)    properties['Lender']           = { multi_select: lenders.map(l => ({ name: l })) };
      if (brokerPageId)          properties['Broker']           = { relation: [{ id: brokerPageId }] };
      if (docFiles.length > 0)   properties['Files & media']    = { files: docFiles };

      const pageBody = buildPageBody(formData);

      const page = await notionFetch('/pages', 'POST', {
        parent:     { database_id: PIPELINE_DB_ID },
        icon:       { type: 'emoji', emoji: '📋' },
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
