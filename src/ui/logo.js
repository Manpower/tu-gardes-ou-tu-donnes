// Logo : deux cartes en éventail (garder en vert, donner en rouge) + mot-symbole.
export function logoMark(size = 44) {
  return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <rect x="9" y="9" width="28" height="40" rx="5" fill="#22C55E" transform="rotate(-14 23 29)"/>
    <rect x="27" y="13" width="28" height="40" rx="5" fill="#EF4444" transform="rotate(12 41 33)"/>
    <rect x="18" y="12" width="28" height="40" rx="5" fill="#F4F2FF"/>
    <path d="M28.5 26.5c0-2.6 1.6-4.4 4.2-4.4s4.3 1.6 4.3 3.9c0 2.1-1.2 3.1-2.6 4-1.1.7-1.5 1.3-1.5 2.6v.8" fill="none" stroke="#0F0C1D" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="32.8" cy="39" r="2.1" fill="#0F0C1D"/>
  </svg>`;
}

export function logo({ size = 'sm' } = {}) {
  return `<div class="logo logo--${size}">${logoMark(size === 'xl' ? 88 : 40)}
    <span class="logo-word"><span>Tu gardes</span><span>ou tu donnes&nbsp;?</span></span></div>`;
}
