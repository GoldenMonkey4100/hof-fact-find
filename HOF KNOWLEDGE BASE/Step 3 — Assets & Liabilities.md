# Step 3 — Assets & Liabilities

> **Component:** `src/Step3-AssetsLiabilities-Polished.jsx`
> **Load alongside:** [[Shared Core]]

---

## Assets (`formData.assets`)

### `realProperty[]`
| Field | Key |
|---|---|
| Address | `address` |
| Value | `value` |
| Mortgage | `mortgage` |
| Equity | `equity` |
| Ownership | `ownership` |

### `savings[]`
| Field | Key |
|---|---|
| Institution | `institution` |
| Balance | `balance` |
| Ownership | `ownership` |

### `superannuation[]`
| Field | Key |
|---|---|
| Fund | `fund` |
| Balance | `balance` |
| Ownership | `ownership` |

### `shares[]`
| Field | Key |
|---|---|
| Institution | `institution` |
| Value | `value` |
| Ownership | `ownership` |

### `vehicles[]`
| Field | Key |
|---|---|
| Make | `make` |
| Model | `model` |
| Value | `value` |

---

## Liabilities (`formData.liabilities`)

### `creditCards[]`
| Field | Key |
|---|---|
| Institution | `institution` |
| Limit | `limit` |
| Balance | `balance` |

### `personalLoans[]`
| Field | Key |
|---|---|
| Institution | `institution` |
| Balance | `balance` |
| Repayment | `repayment` |

### `hecs[]`
| Field | Key |
|---|---|
| Balance | `balance` |

> HECS repayments are factored into UMI by most lenders from $54,435 taxable income. See [[Income Verification Guide]] for lender treatment detail.

### `otherLiabilities[]`
| Field | Key |
|---|---|
| Description | `description` |
| Balance | `balance` |
| Repayment | `repayment` |
