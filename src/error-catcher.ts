const origStringify = JSON.stringify;

JSON.stringify = function(this: any, ...args: any[]) {
  const val = args[0];
  if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'HTMLSpanElement') {
    const stack = new Error().stack;
    console.error('[JSON.stringify DIAG] HTMLSpanElement in JSON.stringify. Stack:', stack);
    try { fetch('/api/log', { method: 'POST', body: origStringify({ msg: 'HTMLSpanElement in JSON.stringify', stack }), headers: { 'Content-Type': 'application/json' } }); } catch {}
  }
  return origStringify.apply(this, args);
};

function safeStringify(val: any): string {
  try { return origStringify(val); } catch { return String(val); }
}

window.addEventListener('error', (e) => {
  fetch('/api/log', { method: 'POST', body: safeStringify({ message: e.message, filename: e.filename, lineno: e.lineno, type: 'error' }), headers: { 'Content-Type': 'application/json' } }).catch(() => {});
});
window.addEventListener('unhandledrejection', (e) => {
  let msg = 'Unknown rejection';
  let stack = '';
  if (e.reason) {
    if (e.reason.message) msg = e.reason.message;
    else if (typeof e.reason === 'string') msg = e.reason;
    else msg = safeStringify(e.reason);
    stack = e.reason.stack || '';
  } else {
    msg = 'No reason provided for rejection';
  }

  e.preventDefault();
  if (typeof msg === 'string' && (msg.toLowerCase().includes('websocket closed') || msg.toLowerCase().includes('websocket'))) return;

  fetch('/api/log', { method: 'POST', body: safeStringify({ message: msg, stack, type: 'unhandledrejection' }), headers: { 'Content-Type': 'application/json' } }).catch(() => {});
});
console.log('Error catcher initialized!');
