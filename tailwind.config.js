/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // rgb(var(--x-tw) / <alpha-value>) instead of a bare var(--x) string:
        // Tailwind's opacity-modifier syntax (bg-kronos-panel/50) needs an
        // RGB-triplet-aware color function to apply the alpha value - a bare
        // CSS custom property string can't accept one, so every "/NN"
        // modifier on these tokens was silently dropped app-wide (confirmed
        // via compiled output: .bg-kronos-panel exists, .bg-kronos-panel\/50
        // does not).
        //
        // These MUST be space-separated ("4 6 11"), not comma-separated -
        // Tailwind substitutes them straight into `rgb(var(--x) / <alpha>)`,
        // and mixing comma-separated channels with a slash alpha is invalid
        // CSS (silently dropped, leaving the element fully transparent - this
        // exact bug shipped once already: reusing the pre-existing
        // comma-separated --color-*-rgb variables, which 47 other call sites
        // depend on via `rgba(var(--x), N)`, broke every bare `bg-kronos-*`
        // class app-wide). Dedicated `--color-*-tw` space-separated variables
        // exist in index.css for every theme specifically so those 47
        // existing comma-based call sites are never touched.
        kronos: {
          bg: 'rgb(var(--color-bg-tw) / <alpha-value>)',
          panel: 'rgb(var(--color-panel-tw) / <alpha-value>)',
          accent: 'rgb(var(--color-accent-tw) / <alpha-value>)',
          text: 'rgb(var(--color-text-tw) / <alpha-value>)',
          dim: 'rgb(var(--color-text-dim-tw) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        hologram: '0 0 15px var(--glow-color)',
      }
    },
  },
  plugins: [],
}