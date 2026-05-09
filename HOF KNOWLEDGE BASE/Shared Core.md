# Shared Core

> Cross-cutting context for all steps. Load this alongside any step file when building or editing.

---

## HOF Brand & Design System

**Rule:** Never hardcode hex colours in components — always use CSS variables so both themes render correctly.

### Palette

| Token | Value | Use |
|---|---|---|
| Dark Luxe Black | `#12110D` | Header, buttons, dark backgrounds |
| Royal Gold | `#CBB26B` | Primary accent, active states |
| Champagne Gradient | `#BFAE75 → #DCCB8E` | Progress bars, active pill buttons |
| Porcelain White | `#F5F4F2` | Light mode background, logo text |
| Shadow Taupe | `#2A281E` | Dark mode surface, button hover |

### Fonts

- Headings / buttons / labels: **Montserrat** (700/600)
- Body / inputs: **Open Sans** (400/500/600)
- Both loaded via Google Fonts import in `styles.css`

### Key CSS Variables

```css
--color-gold / --color-gold-hover / --color-gold-light / --color-gold-grad
--color-header-bg          /* #12110D — always dark regardless of theme */
--bg-primary / --bg-secondary / --bg-tertiary / --bg-input
--text-primary / --text-secondary / --text-tertiary
--border-primary / --border-secondary / --border-focus
--bg-info-surface / --border-info / --text-info
--bg-success-surface / --border-success / --text-success-emphasis
--bg-danger-surface / --border-danger / --text-danger-emphasis
--bg-warning-surface / --border-warning / --text-warning-emphasis
--btn-primary-bg / --btn-primary-fg
--text-xs → --text-3xl
--space-1 → --space-20    /* 4px increments */
--radius-sm / --radius-md / --radius-lg / --radius-xl / --radius-full
```

### Light / Dark Theme

`data-theme="dark"` on `<html>` enables dark theme. Toggle in app header; persisted to `localStorage` key `hof-theme`.

```js
// App.jsx
const [theme, setTheme] = useState(() => localStorage.getItem('hof-theme') || 'light');
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('hof-theme', theme);
}, [theme]);
```

### Utility Classes

```
.card                        Surface card with border + shadow
.btn-primary / .btn-secondary / .btn-success / .btn-danger
.badge / .badge-info / .badge-success / .badge-warning / .badge-danger
.progress-bar / .progress-fill    Gold gradient fill
.pill-group / .pill-btn / .pill-btn--active
.app-header / .app-logo / .app-step-strip
.smart-card / .smart-card__header / .smart-card__badge / .smart-card__body
.sticky-nav
.fade-in / .slide-in-right
```

---

## App Shell Layout

```
┌────────────────────────────────────────────┐
│  app-header (sticky, always dark #12110D)  │
├────────────────────────────────────────────┤
│  app-step-strip (step circles + bar)       │
├────────────────────────────────────────────┤
│  full-width step content (no .container)   │
│    <SmartCard> sections stack vertically   │
├────────────────────────────────────────────┤
│  sticky-nav (fixed bottom)                 │
│  ← Previous   Step N of 5   Next →        │
└────────────────────────────────────────────┘
                              [Voice bar] ◉
```

Step content is full-width — no `.container` wrapper. Navigation arrows are pinned to the bottom via `.sticky-nav`.

---

## Component Patterns

### Step Shell

Each step receives `{ formData, updateFormData }` from `App.jsx`. For array fields: read full array → mutate local copy → write entire array back via `updateFormData('fieldName', newArray)`.

### SmartCard Pattern

```jsx
import SmartCard from './SmartCard';

<SmartCard
  icon="🏠"
  title="Security 1 — 12 Main St"
  summary="$750,000 · OO · P&I"
  status="done"             // 'empty' | 'partial' | 'done'
  defaultOpen={false}
  onOpen={() => doSomething()}
  headerActions={<button>...</button>}
>
  {/* fields */}
</SmartCard>
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `title` | string | Card header text |
| `icon` | string | Emoji left of title |
| `summary` | string \| null | One-line preview when collapsed |
| `status` | `'empty'` \| `'partial'` \| `'done'` | Badge colour — grey / gold / green |
| `defaultOpen` | boolean | Starts expanded; default `false` |
| `onOpen` | function \| undefined | Called when card transitions from closed → open |
| `headerActions` | ReactNode \| undefined | Extra content injected into the header's right side, before the badge. Wrapped in `e.stopPropagation()` so clicks don't toggle the card. Used in Step 0 for the 📊 calculator toggle button. |
| `children` | ReactNode | Card body |

**Status computation:**
```jsx
const status = sec.address && sec.loanAmount ? 'done' : sec.address ? 'partial' : 'empty';
```

**Map pattern — MUST use explicit `=> {` form:**
```jsx
{formData.securities.map((sec, i) => {
  const summary = [sec.address, sec.loanType].filter(Boolean).join(' · ') || null;
  const status = sec.address && sec.loanAmount ? 'done' : sec.address ? 'partial' : 'empty';
  return (
    <SmartCard key={sec.id} icon="🏠" title={`Security ${i + 1}`}
      summary={summary} status={status} defaultOpen={!sec.address}>
      {/* fields */}
    </SmartCard>
  );
})}
```

> **esbuild gotcha:** Implicit `=> (...)` map returns cannot declare variables before the JSX. Always use `=> { ... return (...); }`. Also ensure every `<div>` opened inside a SmartCard is closed before `</SmartCard>` — esbuild throws a misleading tag-mismatch error if a wrapper div is left open.

### Field Pattern

```jsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
  <label>Label</label>
  <input type="text" value={value} onChange={e => handleChange(e.target.value)} />
</div>
```

### Pill Toggle Pattern

```jsx
<div className="pill-group">
  {['Option A', 'Option B'].map(opt => (
    <button key={opt} type="button"
      className={`pill-btn${value === opt ? ' pill-btn--active' : ''}`}
      onClick={() => setValue(value === opt ? '' : opt)}>
      {opt}
    </button>
  ))}
</div>
```

Priority pills use colour-coded active classes: `pill-btn--urgent` | `pill-btn--high` | `pill-btn--medium`

### Voice Input (VoiceBar)

Floating component at bottom-right. Space key (when not in a text field) → record mic → Wispr Flow transcription → Claude Haiku field extraction → `deepSet()` writes paths like `"applicants[0].firstName"` into formData.

Key files: `src/VoiceBar.jsx` · `src/audioUtils.js` (16kHz PCM WAV) · `api/voice.js` (`transcribe` + `extract` actions)

### Multi-Applicant Tab Pattern

Steps 1 and 2 use a horizontal tab bar. Active applicant index is local state. Tab label = applicant name or "Applicant N". Tab count = `numApplicants + numGuarantors`.

---

## formData Root Shape

```js
{
  // Step 0
  applicantType, brokerName, brokerEmail, clientType, leadSource,
  numApplicants, numGuarantors, priority, brokerNotes,
  lenderPreference: [],
  securities: [{ /* see Step 0 file */ }],

  // Step 1
  applicants: [{ /* see Step 1 file */ }],

  // Step 2
  employment: [{ applicantId, currentEmployments: [], previousEmployments: [] }],

  // Step 3
  assets: { realProperty: [], savings: [], superannuation: [], shares: [], vehicles: [] },
  liabilities: { creditCards: [], personalLoans: [], hecs: [], otherLiabilities: [] },

  // Metadata
  submittedAt: null,
  submittedBy: ''
}
```

---

## Frontend File Map

| File | Role |
|---|---|
| `src/main.jsx` | React entry |
| `src/App.jsx` | Root — owns all formData state, step nav, submission, theme, VoiceBar |
| `src/Step0-LoanStrategy-Polished.jsx` | Step 0 — **Polished variants are live; plain ones are legacy** |
| `src/Step1-Applicants-Polished.jsx` | Step 1 |
| `src/Step2-Employment-Polished.jsx` | Step 2 |
| `src/Step3-AssetsLiabilities-Polished.jsx` | Step 3 |
| `src/Step4-Review-Polished.jsx` | Step 4 |
| `src/SmartCard.jsx` | Collapsible section card |
| `src/VoiceBar.jsx` | Floating voice input |
| `src/audioUtils.js` | Mic recorder — 16kHz PCM WAV encoder |
| `src/AddressAutocomplete.jsx` | Google Maps Places autocomplete |
| `src/mercuryApiService.js` | Mercury CRM wrapper |
| `src/utils.js` | Shared helpers (`getBrokerEmail`, `formatCurrency`) |
| `src/styles.css` | Full design system |

---

## Backend File Map & Function Count

> ⚠️ Vercel Hobby plan: max **12** serverless functions. Currently **11**. Do not add new `api/` files without consolidating first — use an `action` discriminator in the request body.

| File | Purpose |
|---|---|
| `api/notion-submit.js` | Pipeline duplicate check + Notion page creation |
| `api/upload-blob.js` | base64 → Vercel Blob → URL |
| `api/extract-license.js` | Claude vision — DL parsing |
| `api/extract-payslip.js` | Claude vision — payslip parsing |
| `api/voice.js` | Wispr Flow transcription + Claude field extraction (combined) |
| `api/mercury-search.js` | Mercury CRM client lookup |
| `api/abn-lookup.js` | ABR ABN validation proxy |
| `api/docuseal-send.js` | DocuSeal — initiate e-signature |
| `api/docuseal-status.js` | DocuSeal — check status |
| `api/docuseal-download.js` | DocuSeal — proxy signed PDF |
| `api/adobe-sign.js` | Adobe Sign — send/status/download (legacy, combined) |

---

## Notion Block Constraints

| Block type | Constraint |
|---|---|
| `column_list` | Page-level children **ONLY** — not inside toggles, callouts, or other containers |
| `toggle` | Max 100 block children — use 96 as safety buffer |
| `table` | Must specify `table_width`; first row `is_header: true` |
| `image` | Type must be `external`: `{ type: 'external', external: { url } }` |
| `bookmark` | `{ type: 'bookmark', bookmark: { url, caption: [rich_text] } }` |

---

## Environment Variables

| Variable | Used By | Notes |
|---|---|---|
| `NOTION_API_KEY` | `notion-submit.js` | |
| `BLOB_READ_WRITE_TOKEN` | `upload-blob.js` | |
| `ANTHROPIC_API_KEY` | `extract-license.js`, `extract-payslip.js`, `voice.js` | |
| `VITE_GOOGLE_MAPS_KEY` | `AddressAutocomplete.jsx` | Client-side — must be `VITE_` prefixed |
| `MERCURY_API_KEY` | `mercury-search.js` | |
| `DOCUSEAL_API_KEY` | `docuseal-*.js` | |
| `WISPR_FLOW_API_KEY` | `voice.js` | ⚠️ Not yet confirmed added to Vercel |
| `WISPR_FLOW_BASE_URL` | `voice.js` | Optional — default `https://api.wisprflow.ai` |
| `ADOBE_SIGN_API_KEY` | `adobe-sign.js` | Legacy |
| `ADOBE_SIGN_API_BASE` | `adobe-sign.js` | Legacy |
