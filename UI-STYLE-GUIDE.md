# UI Style Guide — "Y2K Web 2.0"

A self-contained visual spec for the mid-2000s web aesthetic. Copy the `:root`
block, use the component recipes, and you have the look. No framework, no
dependencies — plain CSS.

**Mood:** 2005–2007. Glossy gradient buttons, fixed-width centered page, dotted
dividers, steel-blue chrome, small type, one orange accent. Nostalgic but still
legible and fully accessible.

---

## 1. Tokens

Paste this as the first thing in your stylesheet. Everything else references these.

```css
:root {
  --color-page-top: #eef3f9;
  --color-page-bottom: #d3dfee;
  --color-panel: #ffffff;
  --color-text: #1a1a1a;
  --color-heading: #1a3d63;
  --color-muted: #5a5a5a;
  --color-border: #5f81a4;
  --color-border-dark: #3f5f80;
  --color-line: #b8cde0;
  --color-link: #0000ee;
  --color-link-visited: #551a8b;
  --color-accent: #b34700;
  --color-won-text: #1a6b2a;
  --color-gloss: linear-gradient(#ffffff, #eaf0f8 45%, #d5e0ee 50%, #eef3fa);
  --color-gloss-blue: linear-gradient(#8fb4e4, #4a7cba 45%, #2f5c92 50%, #5a8bc7);
  --color-header: linear-gradient(#84abe0, #4a7cba 45%, #2f5c92 55%, #4e80bd);
  --color-gold: linear-gradient(#fdf3c8, #f0d071 45%, #d9ab2a 55%, #f6e39a);
  --font-sans: Verdana, Geneva, sans-serif;
  --font-head: "Trebuchet MS", Verdana, Geneva, sans-serif;
  --page-width: 960px;
  --gutter: 28px;
}
```

### Palette roles

| Token | Hex | Use |
| --- | --- | --- |
| `--color-page-top` / `-bottom` | `#eef3f9` → `#d3dfee` | Page background gradient behind the panel |
| `--color-panel` | `#ffffff` | Card and panel fill |
| `--color-text` | `#1a1a1a` | Body copy |
| `--color-heading` | `#1a3d63` | Headings, labels, button text |
| `--color-muted` | `#5a5a5a` | Captions, metadata, de-emphasis |
| `--color-border` | `#5f81a4` | Hairlines, dotted rules, inset panels |
| `--color-border-dark` | `#3f5f80` | Interactive control borders |
| `--color-line` | `#b8cde0` | Internal separators inside a component |
| `--color-link` / `-visited` | `#0000ee` / `#551a8b` | The authentic period link colors |
| `--color-accent` | `#b34700` | One accent: hover, focus, active state, "live" marker |
| `--color-won-text` | `#1a6b2a` | Success / winner state |

### Verified contrast ratios

Measured, not estimated. All pass WCAG AA; keep it that way if you change values.

| Pair | Ratio | Grade |
| --- | --- | --- |
| `--color-text` on panel | 17.40 | AAA |
| `--color-heading` on panel | 11.10 | AAA |
| `--color-muted` on panel | 6.90 | AA |
| `--color-link` on panel | 9.40 | AAA |
| `--color-link-visited` on panel | 11.01 | AAA |
| `--color-accent` on panel | 5.50 | AA |
| White on `#2f5c92` (primary button) | 6.85 | AA |
| `--color-won-text` on panel | 6.60 | AA |
| Footer `#5c6b7d` on page gradient | 4.88 | AA |
| `--color-border-dark` on panel (UI boundary) | 6.65 | AA |
| `--color-border` on panel (UI boundary) | 4.07 | AA |
| `#4a3405` on gold badge | 7.83 | AAA |
| `#6b4a05` on gold badge | 5.36 | AA |
| `#7a4a06` on `#ffcf8f` (final tab) | 5.19 | AA |

**Two values were corrected for accessibility.** The original period-accurate
`#cc5500` accent measured 4.31 (below AA for text) and `#7b9cbf` border measured
2.86 (below the 3:1 minimum for UI boundaries). The tokens above use the
darkened replacements, which keep the same hue and read as the same color.

---

## 2. Typography

| Role | Family | Size | Weight | Extra |
| --- | --- | --- | --- | --- |
| Body / base | Verdana | 13px | 400 | `line-height: 1.6` |
| Page heading (`h1`) | Trebuchet MS | 21px | 700 | dotted bottom rule |
| Wordmark / header bar | Trebuchet MS | 19px | 700 | uppercase, `0.05em`, white + text-shadow |
| Card title | Trebuchet MS | 15px | 700 | — |
| Section label | Trebuchet MS | 11px | 700 | uppercase, `0.1em` |
| Caption / metadata | Verdana | 12px | 400 | `--color-muted` |
| Micro-label | Verdana | 10–11px | 400–700 | uppercase, `0.08em` |

Type scale is intentionally small and low-contrast-differentiated — that is the
period tell. Do not introduce a font above 24px except for a single hero moment.

### Global baseline

```css
body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
}
```

---

## 3. Layout shell

Two nested elements. The outer paints the page; the inner is the white panel that
holds content.

```html
<div class="page">
  <main class="screen">…</main>
  <footer class="site-footer">…</footer>
</div>
```

```css
.page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22px 16px 0;
  background: linear-gradient(var(--color-page-top), var(--color-page-bottom));
}

.screen {
  width: min(var(--page-width), 100%);
  margin: 0 auto;
  padding: 0 var(--gutter) 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: var(--color-panel);
  border: 1px solid var(--color-border-dark);
  box-shadow: inset 0 0 0 1px #ffffff, 3px 3px 0 rgba(31, 60, 95, 0.18);
}
```

**Rules that make it read as the era:**
- Fixed `--page-width: 960px`. Do not make it fluid — the fixed width *is* the look.
- The drop shadow is a hard offset (`3px 3px 0`), never blurred. Blur is anachronistic.
- The `inset 0 0 0 1px #ffffff` inner bevel is what makes borders look clickable.
- Content is **top-aligned**, never vertically centered. Centered pages are modern.

### Header bar + logo

The first child of every screen. Uses a negative margin to go full-bleed inside
the panel's padding, so one class styles every page's header with no JSX changes.

Keep the element a **block** (`<p>`, `<div>`) - do not set `display: flex` on it.
Chrome drops the implicit paragraph role from the accessibility tree when a `<p>`
becomes a flex container. Align the logo with `vertical-align` instead.

```css
.wordmark {
  align-self: stretch;
  margin: 0 calc(-1 * var(--gutter)) 22px;
  padding: 11px 20px;
  font-family: var(--font-head);
  font-size: 19px;
  font-weight: bold;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-align: left;
  color: #ffffff;
  background: var(--color-header);
  border-bottom: 1px solid #24486f;
  text-shadow: 1px 1px 0 rgba(20, 45, 75, 0.6);
}

.wordmark__mark {
  margin-right: 11px;
  vertical-align: middle;
  text-shadow: none;
}
```

The `text-shadow` is what stops the white text looking flat. Keep it, and reset it
on the logo so it does not bleed onto the mark.

### The logo mark

A glossy beveled badge carrying two opposing chevrons - a left/right pair that
reads as the choice mechanic. 28x28, inline SVG, `aria-hidden` because the
adjacent wordmark text already names the product.

```html
<svg class="wordmark__mark" width="28" height="28" viewBox="0 0 28 28"
     aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="fo-badge-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#d3e2f6" />
      <stop offset="46%"  stop-color="#7ba3d4" />
      <stop offset="52%"  stop-color="#3f6ba4" />
      <stop offset="100%" stop-color="#2b5588" />
    </linearGradient>
    <linearGradient id="fo-badge-gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.72" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="27" height="27" rx="4"
        fill="url(#fo-badge-fill)" stroke="#17375a" />
  <rect x="1.5" y="1.5" width="25" height="25" rx="3"
        fill="none" stroke="#ffffff" stroke-opacity="0.65" />
  <rect x="1.5" y="1.5" width="25" height="12" rx="3"
        fill="url(#fo-badge-gloss)" />
  <path d="M10.5 8.5 L6 14 L10.5 19.5" fill="none" stroke="#ffffff"
        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M17.5 8.5 L22 14 L17.5 19.5" fill="none" stroke="#ffffff"
        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
</svg>
Face-Off
```

Why it is built this way:
- **Four stacked rects, then two paths.** Outer rect is the badge, second is the
  white inner bevel, third is the top-half gloss, the paths are the chevrons. It is
  the same gloss recipe as the buttons, applied to a shape.
- **The 46%/52% hard stop** on the fill is the "wafer" highlight from section 4.
  Reuse it so the mark and the controls read as one system.
- **Gradient IDs are fixed, not generated.** Only one wordmark mounts at a time, so
  there is nothing to collide with. A duplicate would be harmless anyway, since both
  would resolve to the same definition.
- **Geometry:** the badge leaves a 5.5px inner margin on each side and the chevrons
  span x=6 to 22, so the mark is optically centered.

Wrap the logo and the text in a single component so every page stays consistent.

### Footer

```css
.site-footer {
  width: min(var(--page-width), 100%);
  margin: 0 auto;
  padding: 14px 20px 28px;
  font-size: 11px;
  line-height: 1.7;
  text-align: center;
  color: #5c6b7d;
  border-top: 1px dotted #a8bccf;
}

.site-footer__star { color: var(--color-accent); }
```

Fill with `★`-separated microcopy, e.g.
`★ Best viewed at 1024×768 ★ Powered by the YouTube Data API v3`.

### Headings

```css
h1 {
  font-family: var(--font-head);
  font-size: 21px;
  line-height: 1.25;
  color: var(--color-heading);
  margin: 0 0 14px;
  max-width: 34ch;
  padding-bottom: 10px;
  border-bottom: 1px dotted var(--color-border);
}
```

The dotted rule under the `h1` is a strong period signal. Reuse it for `h2`
inside prose blocks.

---

## 4. Buttons

Three-stop gloss with a hard highlight at the 50% line. The "wafer" look.

```css
.button {
  display: inline-block;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: bold;
  line-height: 1.2;
  padding: 8px 22px;
  color: var(--color-heading);
  text-decoration: none;
  text-shadow: 0 1px 0 #ffffff;
  background: var(--color-gloss);
  border: 1px solid var(--color-border-dark);
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px #ffffff, 1px 1px 0 rgba(31, 60, 95, 0.2);
  cursor: pointer;
}

.button:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.button--primary {
  color: #ffffff;
  text-shadow: 0 -1px 0 rgba(20, 45, 75, 0.55);
  background: var(--color-gloss-blue);
  border-color: #24486f;
}

.button--ghost {
  background: var(--color-panel);
  color: var(--color-link);
  text-shadow: none;
}
```

Radius is `4px` — small. Pill shapes and `border-radius: 8px+` look 2013+.

### Full-width action variant

```css
.button--choice {
  width: 100%;
  padding: 12px 18px;
  font-size: 14px;
}

.button--choice:hover {
  background: linear-gradient(#fff6ec, #ffe6cc 45%, #ffd2a8 50%, #fff1e2);
}
```

### Button group

```css
.ready__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
}
```

---

## 5. Focus styles — required, do not skip

The accent ring measures 5.50:1 on white but only **1.24:1 against the dark blue
primary button**, so filled buttons need a two-tone ring: white against the dark
fill, accent against the page.

```css
.button:focus-visible,
.link-button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.button--primary:focus-visible,
.button--primary:focus-visible:hover {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-accent);
}
```

Never remove outlines. If you add a dark filled surface, give it the same
dual-tone treatment.

---

## 6. Links and text links

```css
a           { color: var(--color-link); }
a:visited   { color: var(--color-link-visited); }
a:hover     { color: var(--color-accent); }

.link-button {
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--color-link);
  background: none;
  border: none;
  padding: 6px 4px;
  text-decoration: underline;
  cursor: pointer;
}
```

Blue `#0000ee` on white with a real underline is period-correct and scores 9.40:1.
Use it as-is. Do not "modernize" to a muted grey.

---

## 7. Cards, panels, media

```css
.card {
  padding: 14px;
  background: var(--color-panel);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  box-shadow: inset 0 0 0 1px #ffffff;
}

.thumbnail {
  display: block;
  width: 100%;
  max-width: 13rem;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  padding: 0;
  background: #eef1f5;
  border: 2px solid var(--color-border-dark);
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px #ffffff;
}

.result__thumbnail {
  max-width: 11rem;
  margin-top: 4px;
}

.thumbnail--placeholder {
  background: repeating-linear-gradient(
    45deg, #e8ecf1, #e8ecf1 6px, #f4f6f9 6px, #f4f6f9 12px
  );
}
```

YouTube channel avatars are square: the Data API returns 240x240 for `medium`, and
`youtube.readonly` gives nothing else. So the avatar must be `1 / 1` at
`border-radius: 50%` to match the original. A `16 / 9` ratio is a *video*
thumbnail ratio and it crops the square into a strip. `max-width` caps the avatar
at 13rem so two sit comfortably side by side; drop the hero avatar to 11rem.

The diagonal-stripe placeholder is a strong era cue and removes the need for any
image asset. Because the avatar is circular, use `padding: 0` and let the 2px
border form the ring, rather than the inset white frame used on rectangular media.

Inset panel (for grouped content that should read as recessed):

```css
.iset-panel {
  background: #f4f7fb;
  border: 1px solid var(--color-border);
  border-style: inset;
}
```

Status bar above a two-column area:

```css
.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-heading);
  background: #eef3f9;
  border: 1px solid var(--color-border);
  border-style: inset;
}
```

Centered "VS" divider between two options:

```css
.vs-badge {
  align-self: center;
  flex-shrink: 0;
  padding: 6px 13px;
  font-family: var(--font-head);
  font-size: 15px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 -1px 0 rgba(20, 45, 75, 0.5);
  background: var(--color-gloss-blue);
  border: 1px solid #24486f;
  border-radius: 4px;
}
```

---

## 8. Tournament bracket

A horizontally scrolling ladder of round columns. Rounds narrow left to right.

### Container

```css
.bracket__track {
  display: flex;
  align-items: stretch;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.bracket__round {
  flex: 0 0 auto;
  min-width: 15rem;
  display: flex;
  flex-direction: column;
}

.bracket__column {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 4px;
  flex: 1;
  min-height: 100%;
}
```

**The `gap` and the connector stub width must match.** The stub below is
`0.875rem` = 14px = the gap. Change one and you must change the other.

### Round label as a tab

```css
.bracket__round-label {
  font-family: var(--font-head);
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
  color: var(--color-heading);
  margin: 0 0 8px;
  padding: 5px 8px;
  background: linear-gradient(#ffffff, #dbe5f1);
  border: 1px solid var(--color-border);
  border-radius: 3px;
}

.bracket__round--final .bracket__round-label {
  color: #7a4a06;
  background: linear-gradient(#ffeccc, #ffcf8f);
  border-color: #b5771a;
}

.bracket__round--final .bracket__round-label::before {
  content: "\2605  ";
}
```

The `★` pseudo-element is a cheap, high-impact period detail.

### Match slots

```css
.bracket__match {
  position: relative;
  border: 1px solid var(--color-border-dark);
  border-radius: 4px;
  background: var(--color-gloss);
  box-shadow: inset 0 1px 0 #ffffff, 1px 1px 0 rgba(31, 60, 95, 0.15);
}

.bracket__slot {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 7px;
  min-width: 0;
}

.bracket__slot + .bracket__slot {
  border-top: 1px solid var(--color-line);
}
```

### Connector lines

Pure CSS, no SVG. A vertical merge line on the match's right edge, plus a
horizontal stub bridging to the next round. Suppressed on the last round.

```css
.bracket__match::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  right: -0.25rem;
  width: 2px;
  background: var(--color-border);
}

.bracket__round:not(:last-child) .bracket__match::after {
  content: "";
  position: absolute;
  top: 50%;
  right: -0.875rem;
  width: 0.875rem;
  height: 2px;
  background: var(--color-border);
}

.bracket__round:last-child .bracket__match::before {
  display: none;
}
```

If you use a different column gap, recompute the stub: `right: calc(-1 * gap)`
and `width: gap`.

### Match states

| State | Class | Treatment |
| --- | --- | --- |
| Played | `--played` | Default gloss, winner bold green, loser struck through |
| Active / live | `--active` | Orange wash + orange ring |
| Pending | `--pending` | Default gloss, neutral text |
| TBD / future | `--tbd` | Dashed border, transparent fill |
| Bye | `--bye` | Dotted border, flat grey fill |

```css
.bracket__match--active {
  border-color: var(--color-accent);
  background: linear-gradient(#fff4ea, #ffe3cc);
  box-shadow: inset 0 1px 0 #ffffff, 0 0 0 1px var(--color-accent);
}

.bracket__match--tbd {
  border-style: dashed;
  background: transparent;
  box-shadow: none;
}

.bracket__match--bye {
  border-style: dotted;
  background: #f2f4f7;
}
```

### Result states — never color alone

```css
.bracket__identity--won .bracket__name {
  font-weight: bold;
  color: var(--color-won-text);
}

.bracket__identity--lost {
  opacity: 0.6;
}

.bracket__identity--lost .bracket__name {
  text-decoration: line-through;
}
```

`text-decoration: line-through` on losers is **required** — it is the
non-color signal that keeps the bracket readable for colorblind users and
satisfies the PRD's "do not communicate state through color alone."

### Live marker and champion badge

```css
.bracket__vs {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  padding: 1px 4px;
  font-family: var(--font-head);
  font-size: 10px;
  font-weight: bold;
  color: #ffffff;
  background: linear-gradient(#e07f2a, #b34700);
  border: 1px solid #8a3700;
  border-radius: 3px;
}

.bracket__champion {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 7px 14px;
  background: var(--color-gold);
  border: 1px solid #a07810;
  border-radius: 4px;
  box-shadow: inset 0 1px 0 #fffbe8, 1px 1px 0 rgba(120, 90, 0, 0.25);
}

.bracket__champion-label {
  font-family: var(--font-head);
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b4a05;
}

.bracket__champion .bracket__identity--won .bracket__name {
  color: #4a3405;
}
```

Gold is used exactly once — the champion. It is the reward for scanning the
whole page.

### Avatars and truncation

```css
.bracket__avatar {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  object-fit: cover;
  background: #e8ecf1;
  border: 1px solid var(--color-border-dark);
  border-radius: 3px;
}

.bracket__avatar--empty {
  background: repeating-linear-gradient(
    45deg, #e8ecf1, #e8ecf1 4px, #f4f6f9 4px, #f4f6f9 8px
  );
}

.bracket__name {
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bracket__subs {
  font-size: 10px;
  color: var(--color-muted);
  white-space: nowrap;
}
```

---

## 9. Prose (privacy / about pages)

```css
.prose {
  text-align: left;
  max-width: 46rem;
  margin: 0;
}

.prose h2 {
  font-family: var(--font-head);
  font-size: 15px;
  color: var(--color-heading);
  margin: 20px 0 8px;
  padding-bottom: 5px;
  border-bottom: 1px dotted var(--color-border);
}

.prose p, .prose li {
  font-size: 13px;
  line-height: 1.65;
  color: #2b2b2b;
}

.prose ul { padding-left: 22px; margin: 8px 0 0; }
.prose li { margin-bottom: 5px; }

.prose code {
  padding: 1px 4px;
  font-size: 12px;
  background: #eef2f7;
  border: 1px solid var(--color-line);
  border-radius: 3px;
}
```

---

## 10. Responsive

The fixed 960px is the look, so collapse it rather than scaling it.

```css
@media (max-width: 720px) {
  :root { --gutter: 16px; }
  .page { padding: 12px 10px 0; }

  .matchup { flex-direction: column; }
  .matchup__vs { align-self: center; }

  h1 { font-size: 18px; }
  .wordmark { font-size: 16px; }
  .result__name { font-size: 20px; }
}

@media (min-width: 720px) {
  .bracket__round { min-width: 15rem; }
}
```

The bracket keeps `overflow-x: auto` on mobile — horizontal scroll is acceptable
and period-authentic. Do not try to reflow it into a vertical stack.

---

## 11. Accessibility requirements

Non-negotiable. The aesthetic is decoration; these are the contract.

1. **No motion at all.** This stylesheet contains zero `transition` and zero
   `@keyframes`, so `prefers-reduced-motion` is satisfied by construction. If you
   add a transition, also add:
   ```css
   @media (prefers-reduced-motion: reduce) {
     * { transition: none !important; animation: none !important; }
   }
   ```

2. **State is never color alone.** Losers get strikethrough *and* reduced
   opacity. Active matches get a border change *and* a wash *and* a text badge.

3. **Focus is always visible** and meets 3:1 against its background — use the
   dual-tone ring in §5 for any dark filled control.

4. **`aria-label` needs a role.** A bare `<div>` or `<span>` cannot take an
   accessible name. Add `role="group"` or `role="img"` alongside `aria-label`,
   or Lighthouse will fail the audit.

5. **Body text ≥ 4.5:1.** `--color-muted` (6.90) is the floor for any text.
   Never introduce a lighter grey for small type.

6. **Keep the contrast table in §1 accurate** if you edit any color.

---

## 12. Checklist for the implementing agent

- [ ] `:root` tokens pasted verbatim; all components reference variables, not hex
- [ ] Page is fixed 960px, top-aligned, hard `3px 3px 0` shadow, white inner bevel
- [ ] Every page starts with the gradient `.wordmark` header bar
- [ ] Logo mark sits left of the wordmark text, `aria-hidden`, aligned with `vertical-align`
- [ ] The header element stays a block, not a flex container (it loses its paragraph role)
- [ ] Buttons use a 3-stop gradient with a hard 50% highlight line, `4px` radius
- [ ] `h1` has a dotted bottom rule
- [ ] Links are `#0000ee`, underlined, with `#551a8b` visited
- [ ] Bracket stub width equals the column gap
- [ ] Losers have `text-decoration: line-through`
- [ ] Dark filled controls have the dual-tone focus ring
- [ ] Gold appears only on the champion
- [ ] No `transition` or `@keyframes` anywhere
- [ ] Every `aria-label` sits on an element that has a `role`
- [ ] Lighthouse accessibility = 1.0

---

## 13. What NOT to do

| Avoid | Why |
| --- | --- |
| Blurred box shadows | Reads as 2013+, not 2005 |
| `border-radius` above ~5px | Pills and 8px+ corners are post-2007 |
| Flex/grid centering the page vertically | Period pages are top-aligned |
| `font-family: system-ui` / Inter | Kills the era instantly |
| Grey-blue "modern" links | Use `#0000ee` |
| Subtle monochrome shadows | This era had hard, saturated, chunky shadows |
| Smooth scroll or fade transitions | No motion at all |
| Dark mode | Not a 2005 thing |

---

*Extracted from the Face-Off app (`src/styles.css`). Values verified against
WCAG 2.1 contrast requirements.*
