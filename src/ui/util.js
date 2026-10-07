export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const FR_COLOR = {
  jjk: '#6D4AE0', rz: '#D6336C', mt: '#2F9E44', bl: '#1C7ED6', db: '#F59F00',
  nr: '#F76707', op: '#E03131', fma: '#A07A3E', snk: '#5C6B73', knb: '#15AABF',
};
export const frColor = (id) => FR_COLOR[id] || '#7B7896';

export const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const announce = (msg) => { const el = document.getElementById('live'); if (el) el.textContent = msg; };
