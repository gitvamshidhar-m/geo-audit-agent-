function safeStringify(val: any): string {
  try { return JSON.stringify(val); } catch { return String(val); }
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

  // Ignore benign Vite HMR websocket errors
  if (typeof msg === 'string' && (msg.toLowerCase().includes('websocket closed') || msg.toLowerCase().includes('websocket'))) {
    e.preventDefault();
    return;
  }

  fetch('/api/log', { method: 'POST', body: safeStringify({ message: msg, stack, type: 'unhandledrejection' }), headers: { 'Content-Type': 'application/json' } }).catch(() => {});
});
console.log('Error catcher initialized!');
