/**
 * Required for Tailwind v4. Without this the `@import "tailwindcss"` in
 * globals.css is passed through untouched: no utilities are generated and
 * `@theme` variables are never emitted. It went unnoticed while every page
 * used inline styles.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}

export default config
