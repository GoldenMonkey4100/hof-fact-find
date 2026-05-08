# Form UX Design Principles

## Design Philosophy

The fact find is used **during or immediately after** a client meeting. The broker audience is experienced — priorities speed and data density over hand-holding. Reduce clicks and avoid unnecessary confirmation steps.

---

## Visual Design System

All styling uses CSS custom properties defined in `src/styles.css`. Never use hardcoded colour hex values in components — always reference variables.

### HOF Brand Palette

| Token | Value | Use |
|---|---|---|
| Dark Luxe Black | `#12110D` | Header, buttons, dark backgrounds |
| Royal Gold | `#CBB26B` | Primary accent, active states |
| Champagne Gradient | `#BFAE75 → #DCCB8E` | Progress bars, active pill buttons |
| Porcelain White | `#F5F4F2` | Light mode page background, logo text |
| Shadow Taupe | `#2A281E` | Dark mode surface, button hover |

### Fonts

| Role | Font |
|---|---|
| Headings, buttons, labels | Montserrat (700/600) |
| Body, inputs | Open Sans (400/500/600) |

Both loaded via Google Fonts import in `styles.css`.

### Key CSS Variables

```css
/* Brand */
--color-gold              /* #CBB26B — replaces blue as primary action colour */
--color-gold-hover        /* Darker gold for hover states */
--color-gold-light        /* Gold tint — active background */
--color-gold-grad         /* Champagne gradient — progress bars, active pills */
--color-header-bg         /* #12110D — always dark regardless of theme */

/* Backgrounds (theme-aware) */
--bg-primary              /* Card / input backgrounds */
--bg-secondary            /* Slightly off — section backgrounds */
--bg-tertiary             /* Page background */
--bg-input                /* Input field background */

/* Text (theme-aware) */
--text-primary            /* Main body text */
--text-secondary          /* Labels, descriptions */
--text-tertiary           /* Placeholders, hints */

/* Borders (theme-aware) */
--border-primary          /* Default card/input border — gold tint */
--border-secondary        /* Stronger border — hover/focus */
--border-focus            /* Gold — input focus ring */

/* Semantic surfaces */
--bg-info-surface / --border-info / --text-info
--bg-success-surface / --border-success / --text-success-emphasis
--bg-danger-surface / --border-danger / --text-danger-emphasis
--bg-warning-surface / --border-warning / --text-warning-emphasis

/* Buttons */
--btn-primary-bg          /* Dark (#12110D) in light mode; gold gradient in dark mode */
--btn-primary-fg          /* Gold in light mode; dark in dark mode */

/* Typography scale */
--text-xs / --text-sm / --text-base / --text-lg / --text-xl / --text-2xl / --text-3xl

/* Spacing */
--space-1 through --space-20  (4px increments)

/* Radius */
--radius-sm / --radius-md / --radius-lg / --radius-xl / --radius-full
```

### Light / Dark Theme

A `data-theme="dark"` attribute on `<html>` enables the dark theme by overriding the CSS variable set. The toggle is in the app header; preference is persisted to `localStorage` under the key `hof-theme`.

```js
// App.jsx
const [theme, setTheme] = useState(() => localStorage.getItem('hof-theme') || 'light');
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('hof-theme', theme);
}, [theme]);
```

**Never hardcode hex colours in components** — all colours must go through CSS variables so both themes render correctly.

### Utility Classes

```css
.card                       /* Surface card with border + shadow */
.btn-primary                /* Dark/gold primary action button */
.btn-secondary              /* Ghost outlined button */
.btn-success                /* Green filled button */
.btn-danger                 /* Red text button */
.badge / .badge-info / .badge-success / .badge-warning / .badge-danger
.progress-bar / .progress-fill   /* Gold gradient fill */
.step-number.active / .completed / .pending
.fade-in / .slide-in-right       /* Transition animations */
.pill-group / .pill-btn / .pill-btn--active   /* Pill toggle buttons */
.app-header / .app-logo / .app-step-strip    /* App shell layout */

/* SmartCard */
.smart-card                 /* Outer wrapper — border, radius, margin-bottom */
.smart-card__header         /* Clickable row: icon + title + summary + badge + chevron */
.smart-card__badge          /* Status pill — colour varies by status prop */
.smart-card__body           /* Collapsible content area */

/* Sticky bottom nav */
.sticky-nav                 /* Fixed bottom bar — Prev / step counter / Next */
```

---

## Component Patterns

### Step Shell Pattern

Each step receives `{ formData, updateFormData }` from App.jsx. The step manages its own local derived state (e.g. `currentApplicantIndex`) but always writes back to `formData` via `updateFormData('fieldName', value)`.

For array fields (applicants, employment, securities), the step:
1. Reads the full array from `formData`
2. Creates a local copy, mutates it
3. Writes the entire array back via `updateFormData`

### SmartCard Pattern

Each logical section within a step is a `<SmartCard>` — a collapsible card that shows a status badge (Empty / In Progress / Complete) and a one-line summary when collapsed. Sections auto-collapse once filled, so brokers only see what they need.

```jsx
import SmartCard from './SmartCard';

<SmartCard
  icon="🏠"
  title="Security 1 — 12 Main St"
  summary="$750,000 · OO · P&I"   // shown in header when collapsed
  status="done"                    // 'empty' | 'partial' | 'done'
  defaultOpen={false}              // collapses once data is present
>
  {/* fields go here */}
</SmartCard>
```

**Props:**
| Prop | Type | Description |
|---|---|---|
| `title` | string | Card header text |
| `icon` | string | Emoji shown left of title |
| `summary` | string \| null | One-line preview shown when collapsed; `null` hides it |
| `status` | `'empty'` \| `'partial'` \| `'done'` | Controls badge colour (grey / gold / green) |
| `defaultOpen` | boolean | Whether card starts expanded; default `true` |
| `children` | ReactNode | Card body content |

**Status computation pattern (example):**
```jsx
const secStatus = security.address && security.propertyValue && security.loanAmount
  ? 'done'
  : security.address || security.propertyValue
  ? 'partial'
  : 'empty';
```

**Map pattern** — when rendering a list (securities, applicants, employment), use an explicit `=> {` body so you can compute `summary` and `status` before returning the JSX:
```jsx
{formData.securities.map((security, index) => {
  const summary = [security.address, security.loanType].filter(Boolean).join(' · ') || null;
  const status = security.address && security.loanAmount ? 'done' : security.address ? 'partial' : 'empty';
  return (
    <SmartCard key={security.id} icon="🏠" title={`Security ${index + 1}`}
      summary={summary} status={status} defaultOpen={!security.address}>
      {/* fields */}
    </SmartCard>
  );
})}
```

> **esbuild gotcha:** When the map body uses `=> {` (explicit), the JSX closing tag of the SmartCard must be `</SmartCard>` followed by `;` then `})}` on separate lines. Implicit `=> (` returns cannot compute variables before the JSX.

### Field Pattern

```jsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
  <label>Label Text</label>
  <input
    type="text"
    value={value}
    onChange={e => handleChange(e.target.value)}
    placeholder="Placeholder"
  />
</div>
```

### Pill Toggle Pattern

Used for single-select fields with a small, fixed option set (replaces `<select>` dropdowns for speed). Implemented with CSS classes — no external library.

```jsx
<div className="pill-group">
  {['Option A', 'Option B', 'Option C'].map(opt => (
    <button key={opt} type="button"
      className={`pill-btn${value === opt ? ' pill-btn--active' : ''}`}
      onClick={() => setValue(value === opt ? '' : opt)}>
      {opt}
    </button>
  ))}
</div>
```

**Priority pills** use colour-coded active classes:
```jsx
className={`pill-btn${priority === label ? ` pill-btn--${cls}` : ''}`}
// cls: 'urgent' | 'high' | 'medium' | 'low'
```

**Fields using pill toggles (as of current build):**
- Step 0: Client Type, Priority, Loan Type (per security)
- Step 2: Employment Type (current + previous), Pay Frequency

### Voice Input Pattern (VoiceBar)

A floating `VoiceBar` component is mounted at the bottom-right of the app. It records microphone audio (Space key shortcut when not in a text field), transcribes via Wispr Flow, then uses Claude Haiku to extract form field values from the transcript and applies them to `formData`.

```
Idle (mic button)
  → Space / click → Recording (timer, stop button)
  → Done recording → Wispr Flow transcription → Claude extraction
  → Done (transcript preview + "Apply N fields" / "Discard")
  → Apply → deepSet() writes paths like "applicants[0].firstName" into formData
```

Key files:
- `src/VoiceBar.jsx` — the floating component
- `src/audioUtils.js` — browser-side mic recording + 16kHz PCM WAV encoder
- `api/voice.js` — combined server proxy (`action: 'transcribe'` | `action: 'extract'`)

Requires `WISPR_FLOW_API_KEY` env var in Vercel.

### Multi-Applicant Tab Pattern

Steps 1 and 2 use a horizontal tab bar to switch between applicants. The active applicant index is local state. The tab bar shows the applicant name (or "Applicant N" if no name yet).

### Document Upload + AI Extraction Pattern

1. User selects file(s) via `<input type="file">`
2. Files displayed as previews
3. User clicks "Extract with AI" → `fetch('/api/extract-license')` or `fetch('/api/extract-payslip')`  
   — API receives base64-encoded images, returns structured JSON
4. Extracted fields pre-fill the form (user reviews + corrects)
5. Simultaneously, files are uploaded to Vercel Blob via `fetch('/api/upload-blob')`
6. Blob URLs stored on the applicant/employment record (`dlFrontUrl`, `dlBackUrl`, `payslipUrl`)

---

## App Shell Layout

```
┌────────────────────────────────────────────┐
│  app-header (sticky, always dark #12110D)  │
│  HOF logo mark │ HOUSE OF FINANCE │ 🌙/☀️  │
├────────────────────────────────────────────┤
│  app-step-strip (dark, step circles + bar) │
│  ① Loan Strategy → ② Applicants → ...     │
├────────────────────────────────────────────┤
│  full-width step content (no .container)   │
│    <SmartCard> sections stack vertically   │
│    (each section collapses independently)  │
├────────────────────────────────────────────┤
│  sticky-nav (fixed bottom — always visible)│
│  ← Previous   Step 2 of 5   Next →        │
└────────────────────────────────────────────┘
                              [Voice bar] ◉
```

Step content is full-width (no `.container` wrapper). Navigation arrows are in a `.sticky-nav` bar pinned to the bottom of the viewport so the broker can advance without scrolling.

---

## Step 0 — Loan Strategy

Most complex step. Securities are the focal point.

### Securities Section Design

- Each security has its own card section
- Header shows: address (truncated) + transaction type badges + loan amount
- Sections within: Property Details / Loan Structure / Ownership / Transaction
- Split loan: shown only when `loanType === 'Split'` — reveals two sub-sections
- Equity source: shown only when `purchaseCompletionMethods` includes `'Equity'`
- Ownership rows: add/remove rows, each with `type` (applicant / other), `name`, `percentage`

### Lender Preference

Freeform multi-select. Values flow directly into Notion `Lender` property. No canonical list — brokers type or select from suggestions.

---

## Submission UX

Three overlay states handled in `App.jsx`:
1. **Duplicate found** — warning modal listing matching pipeline entries. Broker can create anyway or cancel.
2. **Success** — modal with "Open in Notion →" link.
3. **Error** — modal with raw error message for debugging.

Loading states: "checking" and "submitting" disable the submit button and show a spinner/text indicator.
