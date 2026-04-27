# UI/UX Polish Guide
## HOF Broker Fact Find - Design System

---

## Design Principles

1. **Professional & Trustworthy**
   - Clean, minimalist interface
   - Generous whitespace
   - Clear visual hierarchy

2. **Efficient for Brokers**
   - Keyboard shortcuts
   - Auto-save functionality
   - Progress indicators
   - Clear validation feedback

3. **Mobile-First Responsive**
   - Works on tablets and phones
   - Touch-friendly targets (44px minimum)
   - Responsive grid layouts

4. **Accessible**
   - WCAG 2.1 AA compliant
   - Clear focus states
   - Proper color contrast
   - Screen reader friendly

---

## Color Palette

### Primary Colors
```css
--color-primary: #0066CC;        /* HOF Brand Blue */
--color-primary-hover: #0052A3;  /* Darker blue for hover */
--color-primary-light: #E6F2FF;  /* Light blue backgrounds */
```

### Semantic Colors
```css
--color-success: #10B981;     /* Green - completed, valid */
--color-warning: #F59E0B;     /* Amber - attention needed */
--color-danger: #EF4444;      /* Red - errors, required */
--color-info: #3B82F6;        /* Blue - informational */
```

### Neutral Colors
```css
--color-gray-50: #F9FAFB;
--color-gray-100: #F3F4F6;
--color-gray-200: #E5E7EB;
--color-gray-300: #D1D5DB;
--color-gray-400: #9CA3AF;
--color-gray-500: #6B7280;
--color-gray-600: #4B5563;
--color-gray-700: #374151;
--color-gray-800: #1F2937;
--color-gray-900: #111827;
```

### Application
```css
/* Backgrounds */
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F3F4F6;
--bg-elevated: #FFFFFF;

/* Text */
--text-primary: #111827;
--text-secondary: #6B7280;
--text-tertiary: #9CA3AF;

/* Borders */
--border-primary: #E5E7EB;
--border-secondary: #D1D5DB;
--border-focus: #0066CC;
```

---

## Typography

### Font Stack
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
```

### Type Scale
```css
/* Headings */
--text-4xl: 36px;  /* Page titles */
--text-3xl: 30px;  /* Section titles */
--text-2xl: 24px;  /* Card titles */
--text-xl: 20px;   /* Sub-headings */
--text-lg: 18px;   /* Large body */

/* Body */
--text-base: 16px;    /* Default */
--text-sm: 14px;      /* Secondary text */
--text-xs: 12px;      /* Captions, hints */

/* Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Usage
```css
/* Page Title */
h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  line-height: 1.2;
}

/* Section Title */
h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  line-height: 1.3;
}

/* Card Title */
h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  line-height: 1.4;
}

/* Body Text */
p {
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  color: var(--text-primary);
  line-height: 1.6;
}

/* Secondary Text */
.text-secondary {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}
```

---

## Spacing System

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

### Usage Guidelines
- **Micro spacing** (4-8px): Between related elements
- **Component spacing** (12-16px): Internal padding
- **Section spacing** (24-32px): Between sections
- **Layout spacing** (48-64px): Major layout divisions

---

## Border Radius

```css
--radius-sm: 6px;   /* Small elements (badges, pills) */
--radius-md: 8px;   /* Inputs, buttons */
--radius-lg: 12px;  /* Cards, panels */
--radius-xl: 16px;  /* Large containers */
--radius-full: 9999px; /* Circles, pills */
```

---

## Shadows

```css
/* Subtle elevation */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Card elevation */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
             0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* Modal, dropdown elevation */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
             0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* Focus ring */
--shadow-focus: 0 0 0 3px rgba(0, 102, 204, 0.2);
```

---

## Component Patterns

### Input Fields

```css
.input {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.input:hover {
  border-color: var(--border-secondary);
}

.input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus);
}

.input::placeholder {
  color: var(--text-tertiary);
}

.input:disabled {
  background: var(--bg-secondary);
  color: var(--text-tertiary);
  cursor: not-allowed;
}
```

### Buttons

```css
/* Primary Button */
.button-primary {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.button-primary:active {
  transform: translateY(0);
}

/* Secondary Button */
.button-secondary {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: var(--font-medium);
  color: var(--text-primary);
  background: white;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-secondary:hover {
  background: var(--bg-secondary);
  border-color: var(--border-secondary);
}

/* Ghost Button */
.button-ghost {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-ghost:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
```

### Cards

```css
.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 24px;
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-primary);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0;
}

.card-body {
  /* Content goes here */
}

.card-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-primary);
}
```

### Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
}

.badge-success {
  color: #065F46;
  background: #D1FAE5;
}

.badge-warning {
  color: #92400E;
  background: #FEF3C7;
}

.badge-danger {
  color: #991B1B;
  background: #FEE2E2;
}

.badge-info {
  color: #1E40AF;
  background: #DBEAFE;
}

.badge-neutral {
  color: var(--text-secondary);
  background: var(--bg-secondary);
}
```

### Progress Indicators

```css
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), #0080FF);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

/* Step indicator */
.step-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 14px;
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  transition: all 0.2s ease;
}

.step-number.completed {
  background: var(--color-success);
  color: white;
}

.step-number.active {
  background: var(--color-primary);
  color: white;
}

.step-number.pending {
  background: var(--bg-secondary);
  color: var(--text-tertiary);
}
```

---

## Form Validation States

```css
/* Valid field */
.input.valid {
  border-color: var(--color-success);
}

.input.valid:focus {
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

/* Invalid field */
.input.invalid {
  border-color: var(--color-danger);
}

.input.invalid:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

/* Error message */
.error-message {
  margin-top: 6px;
  font-size: var(--text-sm);
  color: var(--color-danger);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Success message */
.success-message {
  margin-top: 6px;
  font-size: var(--text-sm);
  color: var(--color-success);
  display: flex;
  align-items: center;
  gap: 4px;
}
```

---

## Responsive Breakpoints

```css
/* Mobile first approach */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large desktops */
```

### Grid System
```css
.container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 16px;
}

@media (min-width: 768px) {
  .container {
    padding: 0 24px;
  }
}

.grid {
  display: grid;
  gap: 16px;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 768px) {
  .grid-cols-2,
  .grid-cols-3 {
    grid-template-columns: 1fr;
  }
}
```

---

## Animations & Transitions

```css
/* Fade in */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* Slide in from right */
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.slide-in-right {
  animation: slideInRight 0.3s ease-out;
}

/* Pulse (for loading states) */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

## Accessibility Guidelines

### Focus Styles
```css
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

button:focus-visible,
a:focus-visible {
  box-shadow: var(--shadow-focus);
}
```

### Screen Reader Only
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Skip Links
```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary);
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 0 0 var(--radius-md) 0;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

---

## Loading States

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 0%,
    var(--bg-tertiary) 50%,
    var(--bg-secondary) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

---

## Implementation Checklist

### Phase 1: Base Styles
- [ ] Apply design tokens (colors, spacing, typography)
- [ ] Update all input fields with new styles
- [ ] Update all buttons with new styles
- [ ] Update all cards with new styles

### Phase 2: Enhanced Components
- [ ] Add validation states to all inputs
- [ ] Add loading states
- [ ] Add error messaging
- [ ] Add success confirmations

### Phase 3: Interactions
- [ ] Smooth transitions on all interactive elements
- [ ] Hover states for all clickable elements
- [ ] Focus states for keyboard navigation
- [ ] Loading spinners for async operations

### Phase 4: Responsive Design
- [ ] Test on mobile (375px width)
- [ ] Test on tablet (768px width)
- [ ] Test on desktop (1280px width)
- [ ] Ensure touch targets are 44px minimum

### Phase 5: Accessibility
- [ ] All interactive elements keyboard accessible
- [ ] Proper ARIA labels
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader testing

---

**Status:** Design system complete, ready for component implementation
**Next:** Apply to all Step components
