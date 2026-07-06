window.addEventListener('error', (e) => {
  fetch('/api/log', { method: 'POST', body: JSON.stringify({ message: e.message, filename: e.filename, lineno: e.lineno, type: 'error' }), headers: { 'Content-Type': 'application/json' } }).catch(() => {});
});
window.addEventListener('unhandledrejection', (e) => {
  let msg = 'Unknown rejection';
  let stack = '';
  try {
    if (e.reason) {
      if (e.reason.message) msg = e.reason.message;
      else if (typeof e.reason === 'string') msg = e.reason;
      else msg = JSON.stringify(e.reason);
      stack = e.reason.stack || '';
    } else {
      msg = 'No reason provided for rejection';
    }
  } catch(err) { msg = String(e.reason); }

  // Ignore benign Vite HMR websocket errors
  if (typeof msg === 'string' && (msg.toLowerCase().includes('websocket closed') || msg.toLowerCase().includes('websocket'))) {
    e.preventDefault(); // Stop it from even displaying in console if we want, but definitely return
    return;
  }

  fetch('/api/log', { method: 'POST', body: JSON.stringify({ message: msg, stack, type: 'unhandledrejection' }), headers: { 'Content-Type': 'application/json' } }).catch(() => {});
});
console.log('Error catcher initialized!');
