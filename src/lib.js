// Shared helpers and the app-wide React context.
import { createContext } from 'react';

export const Ctx = createContext(null);
export const go = (p) => { location.hash = p; };

export const ROLES = { CUSTOMER: 'customer', THEATRE_OWNER: 'theatre_owner', ADMIN: 'admin' };
export const roleLabel = (r) =>
  ({ customer: 'Customer', theatre_owner: 'Theatre owner', admin: 'Administrator' }[r] || r);

const pad = (n) => String(n).padStart(2, '0');
export const dayStr = (off = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const clean = (s) => String(s ?? '').replace(/[<>]/g, '').trim();
export const money = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
export const fmtDate = (d) =>
  new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (t) =>
  new Date('1970-01-01T' + t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const startOf = (s) => new Date(`${s.date}T${s.time}`);
export const isPast = (s) => startOf(s) <= new Date();
export const rowLabel = (i) => String.fromCharCode(65 + i);
export const strongPw = (p) => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);

// Pull a human message out of a thrown API error.
export const errMsg = (e) => (e && e.message) || 'Something went wrong. Please try again.';
