# Landing Page Style Overrides

## Routing Integration
- Place `standalone/next-landing/page.tsx` under `app/landing/page.tsx` in your Next.js 14 application to mount at `/landing`.
- Keep the page self-contained; no imports from core app logic are required.

## Color Variables
- Gold accents reserved for KPI badges and highlight elements only.
- Variables used inside the page root:
  - `--gold`: `#FFD700`
  - `--gold-soft`: `#FFC000`
  - `--gold-light`: `#FFE27A`

## SVG Logo Reinsertion
- Header contains a placeholder `div` sized `h-8 w-36`.
- Replace with your SVG component when ready; ensure accessible `aria-label`.

## Accessibility
- Buttons use visible focus rings.
- Forms include associated labels; ticker is marked with `aria-label`.

## Performance
- Motion components are dynamically imported (`framer-motion`) with `ssr: false` for code splitting.
- Large visual blocks in preview are static placeholders; replace with lazy-loaded components.

## Breakpoints
- Layout uses Tailwind responsive classes matching existing app scale (`sm`, `md`).

## Gold Accent Guidelines
- Apply to:
  - KPI badge values
  - Icons and headings in feature cards
  - Asset section titles
  - Security section icons
- Avoid:
  - Full-page backgrounds
  - Primary CTA buttons (use neutral/white for legibility)

## Future Customization Points
- `header` placeholder for brand logo
- `preview` card slots for chart and order form integrations
- `final CTA` supports embedding live chat widget
