
// Auth is server-side via api/auth.js + hof_users Supabase table.
// PEOPLE is used for display names, role labels, and email lookups only.
export const PEOPLE = [
  // Admins
  { name: 'Chris',                email: 'chris@houseoffinance.com.au',        role: 'admin'     },
  { name: 'Rita Khaya',           email: 'rita@houseoffinance.com.au',         role: 'admin'     },
  // Brokers
  { name: 'Laith Hana',           email: 'laith@houseoffinance.com.au',        role: 'broker'    },
  { name: 'Mehdi Amirilayeghi',   email: 'mehdi@houseoffinance.com.au',        role: 'broker'    },
  { name: 'Yousif Jirjis',        email: 'yousif@houseoffinance.com.au',       role: 'broker'    },
  // Credit Analysts
  { name: 'Danny Hanna',          email: 'danny@houseoffinance.com.au',        role: 'analyst'   },
  { name: 'Sushma BK',            email: 'sushma@houseoffinance.com.au',       role: 'analyst'   },
  { name: 'Jean-Pierre Sakr',     email: 'jeanpierre@houseoffinance.com.au',   role: 'analyst'   },
  { name: 'Carla Cartativo',      email: 'carla@houseoffinance.com.au',        role: 'analyst'   },
  // Loan Processors
  { name: 'Christian Pantaliano', email: 'christian@houseoffinance.com.au',    role: 'processor' },
  { name: 'Kyrollos',             email: 'kyrollos@houseoffinance.com.au',     role: 'processor' },
  { name: 'Joseph Salem',         email: 'joseph@houseoffinance.com.au',       role: 'processor' },
  { name: 'Bernard Feliciano',    email: 'bernard@houseoffinance.com.au',      role: 'processor' },
];

export const ROLE_LABELS = {
  admin:     'Admin',
  broker:    'Broker',
  analyst:   'Credit Analyst',
  processor: 'Loan Processor',
};

export const getStoredUser = () => {
  try {
    // Migrate legacy hof_broker key
    const legacy = localStorage.getItem('hof_broker');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const match = PEOPLE.find(p => p.email === parsed.email) || { ...parsed, role: 'broker' };
      localStorage.setItem('hof_user', JSON.stringify(match));
      localStorage.removeItem('hof_broker');
      return match;
    }
    return JSON.parse(localStorage.getItem('hof_user') || 'null');
  } catch { return null; }
};

export const formatCurrency = (value) => {
  if (!value) return '';
  const numericValue = value.toString().replace(/[^0-9]/g, '');
  if (!numericValue) return '';
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const parseCurrency = (value) => {
  if (!value) return '';
  return value.toString().replace(/[$,]/g, '');
};

export const formatCurrencyDisplay = (value) => {
  const parsed = parseCurrency(value);
  if (!parsed) return '';
  return '$' + formatCurrency(parsed);
};

export const calculateLVR = (propertyValue, loanAmount) => {
  const propVal = parseFloat(parseCurrency(propertyValue));
  const loanVal = parseFloat(parseCurrency(loanAmount));
  if (!propVal || propVal === 0 || !loanVal) return '';
  const lvr = (loanVal / propVal) * 100;
  return lvr.toFixed(2);
};

export const calculatePropertyValue = (loanAmount, lvr) => {
  const loanVal = parseFloat(parseCurrency(loanAmount));
  const lvrVal = parseFloat(lvr);
  if (!loanVal || !lvrVal || lvrVal === 0) return '';
  return Math.round(loanVal / (lvrVal / 100)).toString();
};

export const calculateLoanAmount = (propertyValue, lvr) => {
  const propVal = parseFloat(parseCurrency(propertyValue));
  const lvrVal = parseFloat(lvr);
  if (!propVal || !lvrVal) return '';
  return Math.round(propVal * (lvrVal / 100)).toString();
};
