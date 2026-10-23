export const pad = (n) => String(n).padStart(2, '0');

export const dayStr = (off = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const startOf = (show) => new Date(`${show.date}T${show.time}`);
export const isPast = (show) => startOf(show) <= new Date();

export const rowLabel = (i) => String.fromCharCode(65 + i);

// Strip angle brackets and trim; a light defence-in-depth measure on top of
// schema validation and output encoding on the client.
export const clean = (s) => String(s ?? '').replace(/[<>]/g, '').trim();

export function makeBookingCode() {
  return (
    'BK' +
    Date.now().toString(36).toUpperCase().slice(-5) +
    Math.random().toString(36).slice(2, 5).toUpperCase()
  );
}

// Cancellation window: confirmed bookings only, up to 2 hours before start.
export function canCancel(show) {
  return startOf(show) - Date.now() > 2 * 3600e3;
}
