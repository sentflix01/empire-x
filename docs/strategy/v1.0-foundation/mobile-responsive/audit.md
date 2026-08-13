# Mobile Responsiveness — Audit

## Breakpoints (Tailwind defaults used in this project)

| Name | Width | Device Example |
|------|-------|----------------|
| `xs` (default) | 0–639px | iPhone SE, small Android |
| `sm` | 640px+ | Large phones, small tablets |
| `md` | 768px+ | iPad portrait |
| `lg` | 1024px+ | iPad landscape, small laptop |
| `xl` | 1280px+ | Desktop |

**Primary target:** 375px (iPhone 14) and 390px (iPhone 15 Pro). 95% of Ethiopian mobile users are on phones.

---

## Known Risk Areas

| Component | Risk | Why |
|-----------|------|-----|
| Navigation sidebar | High | Sidebars collapse differently on mobile |
| Data tables (orders, admin) | High | Tables don't scroll horizontally by default |
| Showroom builder | High | Multi-column drag-and-drop on small screen |
| Map (nearby) | Medium | Map controls overlap on small screens |
| Chat messages | Medium | Bubble layout needs careful padding |
| Post composer | Medium | Multi-row toolbar may wrap badly |
| Product card grid | Low | Tailwind grid handles this well |
| Forms | Low | Single column works natively |

---

## Testing Protocol

Each page must be manually tested at:
- 375px × 812px (iPhone SE / iPhone 14)
- 390px × 844px (iPhone 15 Pro)
- 414px × 896px (iPhone 11 Pro Max)
- 768px × 1024px (iPad portrait)

Checks per page:
- No horizontal scrollbar
- No text overflow / truncation loss
- All tap targets ≥ 44×44px (Apple HIG minimum)
- Bottom nav not obscured by content
- Modals/sheets usable on small screen
- No fixed elements blocking content
