export const BROKER_EMAILS = {
  'Laith Hana': 'Laith@houseoffinance.com.au',
  'Mehdi Amirilayeghi': 'Mehdi@houseoffinance.com.au',
  'Yousif Jirjis': 'Yousif@houseoffinance.com.au'
};

export const getBrokerEmail = (brokerName) => {
  return BROKER_EMAILS[brokerName] || '';
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
