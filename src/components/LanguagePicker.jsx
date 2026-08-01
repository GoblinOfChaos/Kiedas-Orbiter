// Onboarding language picker: 15 game-locale flags with native labels.
// Hand-rolled inline SVGs (no dependency) — emoji flags don't render on
// Windows (regional indicators collapse to "DE" letters), and this app
// ships offline. Flags are simplified but recognizable at 24px.
import React from 'react'

// 5-point star polygon points (outer radius r, inner radius r*0.382)
function star(cx, cy, r) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5
    const rad = i % 2 === 0 ? r : r * 0.382
    pts.push(`${(cx + rad * Math.cos(ang)).toFixed(2)},${(cy + rad * Math.sin(ang)).toFixed(2)}`)
  }
  return pts.join(' ')
}

const FLAGS = {
  gb: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" strokeWidth="6" />
      <path d="M0 0 L30 20" stroke="#C8102E" strokeWidth="2.5" transform="translate(1.8,1.8)" />
      <path d="M30 0 L0 20" stroke="#C8102E" strokeWidth="2.5" transform="translate(1.8,-1.8)" />
      <rect x="13.5" width="3" height="20" fill="#fff" />
      <rect y="8.5" width="30" height="3" fill="#fff" />
      <rect x="14.5" width="1" height="20" fill="#C8102E" />
      <rect y="9.5" width="30" height="1" fill="#C8102E" />
    </svg>
  ),
  de: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#FFCE00" />
      <rect width="30" height="6.67" fill="#000" />
      <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
    </svg>
  ),
  fr: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="10" height="20" fill="#0055A4" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#EF4135" />
    </svg>
  ),
  es: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#F1BF00" />
      <rect width="30" height="5" fill="#AA151B" />
      <rect y="15" width="30" height="5" fill="#AA151B" />
    </svg>
  ),
  it: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="10" height="20" fill="#009246" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#CE2B37" />
    </svg>
  ),
  pt: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="12" height="20" fill="#046A38" />
      <rect x="12" width="18" height="20" fill="#DA291C" />
    </svg>
  ),
  ru: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#D52B1E" />
      <rect width="30" height="6.67" fill="#fff" />
      <rect y="6.67" width="30" height="6.67" fill="#0039A6" />
    </svg>
  ),
  pl: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="10" fill="#fff" />
      <rect y="10" width="30" height="10" fill="#DC143C" />
    </svg>
  ),
  cn: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#DE2910" />
      <polygon points={star(6.5, 6.5, 3.2)} fill="#FFDE00" />
      <polygon points={star(12.2, 3.4, 1.05)} fill="#FFDE00" />
      <polygon points={star(14.2, 5.6, 1.05)} fill="#FFDE00" />
      <polygon points={star(13.4, 8.4, 1.05)} fill="#FFDE00" />
      <polygon points={star(11.4, 9.6, 1.05)} fill="#FFDE00" />
    </svg>
  ),
  ko: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#fff" />
      <circle cx="12" cy="10" r="7" fill="#CD2E3A" />
      <path d="M5,10 A7,7 0 0,0 19,10 Z" fill="#0047A0" />
      <rect x="2.5" y="2.5" width="3.2" height="1" fill="#000" transform="rotate(-45 4.1 3)" />
      <rect x="21.5" y="2.5" width="3.2" height="1" fill="#000" transform="rotate(45 23.1 3)" />
      <rect x="2.5" y="16.5" width="3.2" height="1" fill="#000" transform="rotate(45 4.1 17)" />
      <rect x="21.5" y="16.5" width="3.2" height="1" fill="#000" transform="rotate(-45 23.1 17)" />
    </svg>
  ),
  ja: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#fff" />
      <circle cx="15" cy="10" r="6" fill="#BC002D" />
    </svg>
  ),
  tc: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#FE0000" />
      <rect width="9" height="10" fill="#000095" />
      <rect x="1.75" y="2.75" width="5.5" height="5.5" fill="#fff" />
      <rect x="1.75" y="2.75" width="5.5" height="5.5" fill="#fff" transform="rotate(45 4.5 5.5)" />
      <circle cx="4.5" cy="5.5" r="1.15" fill="#fff" />
    </svg>
  ),
  th: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#A51931" />
      <rect y="3.33" width="30" height="3.33" fill="#fff" />
      <rect y="6.67" width="30" height="6.67" fill="#004C99" />
      <rect y="13.33" width="30" height="3.33" fill="#fff" />
    </svg>
  ),
  tr: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#E30A17" />
      <circle cx="14" cy="10" r="5.5" fill="#fff" />
      <circle cx="15.5" cy="10" r="4.4" fill="#E30A17" />
      <polygon points={star(17.6, 9.4, 2.1)} fill="#fff" />
    </svg>
  ),
  ua: (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="10" fill="#005BBB" />
      <rect y="10" width="30" height="10" fill="#FFD500" />
    </svg>
  ),
}

const LOCALES = [
  { value: 'en', label: 'English', flag: 'gb' },
  { value: 'de', label: 'Deutsch', flag: 'de' },
  { value: 'fr', label: 'Français', flag: 'fr' },
  { value: 'es', label: 'Español', flag: 'es' },
  { value: 'it', label: 'Italiano', flag: 'it' },
  { value: 'pt', label: 'Português', flag: 'pt' },
  { value: 'ru', label: 'Русский', flag: 'ru' },
  { value: 'pl', label: 'Polski', flag: 'pl' },
  { value: 'zh', label: '中文', flag: 'cn' },
  { value: 'ko', label: '한국어', flag: 'ko' },
  { value: 'ja', label: '日本語', flag: 'ja' },
  { value: 'tc', label: '繁體中文', flag: 'tc' },
  { value: 'th', label: 'ไทย', flag: 'th' },
  { value: 'tr', label: 'Türkçe', flag: 'tr' },
  { value: 'uk', label: 'Українська', flag: 'ua' },
]

export default function LanguagePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {LOCALES.map(l => (
        <button
          key={l.value}
          type="button"
          onClick={() => onChange(l.value)}
          className={`flex flex-col items-center gap-1.5 rounded-lg border px-1 py-2 transition-all ${
            value === l.value
              ? 'border-kronos-accent bg-kronos-accent/10'
              : 'border-white/10 hover:border-white/30 hover:bg-white/5'
          }`}
        >
          <span className="w-8 h-5 rounded-[3px] overflow-hidden shadow ring-1 ring-black/30 [&_svg]:block [&_svg]:w-full [&_svg]:h-full">
            {FLAGS[l.flag]}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-kronos-text/80 leading-none">
            {l.label}
          </span>
        </button>
      ))}
    </div>
  )
}
