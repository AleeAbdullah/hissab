# UI Composition, Theme, And Accessibility Standard

Use this standard for screens, shared components, styling, icons, forms, status communication, charts, light/dark appearance, or Figma/mockup-driven work.

## Shared Composition

- Reuse `Screen`, `Card`, `Row`, `Field`, `Notice`, `Loading`, `ErrorMessage`, and the primitives under `src/components/ui/` before adding substitutes.
- Keep screens compositional. Extract feature components when a block has domain behavior, multiple consumers, or enough internal state to obscure the route.
- A visible control must work or be visibly disabled with truthful copy. Do not ship decorative controls that imply unavailable behavior.
- Use selectable text for user-relevant values and messages when the existing primitive supports it.

## Theme And Styling

- Use semantic NativeWind classes backed by `global.css` and `tailwind.config.js`: background, foreground, card, primary, muted, accent, destructive, positive, warning, border, input, and ring.
- Do not add raw color literals in components when a semantic token exists. Add a token centrally only when a new semantic role is real.
- Raw theme values are limited to native APIs that cannot consume classes. Access them through `src/lib/theme.ts`; preserve ESLint's boundary.
- Support automatic light/dark appearance. Check contrast and meaning in both schemes.
- Follow the Tally Stick system: 4-point spacing grid, 20-point page gutters, 16-point card gaps/field padding, 32-point major sections, 12-point controls, 16-point cards, 20-point sheets/dialogs, and no card shadows.
- Copper `#A83A1B` is the primary action/brand color; Ink `#1D1D1B` is core text; Paper `#F7F3EC` is the warm light surface. Green is semantic success/positive money only.

## Accessibility

- Minimum touch targets are 44 pt on iOS and 48 dp on Android. Visible button bodies may be smaller only when the surrounding hit region meets the platform target.
- Buttons have exactly two sizes: `default` (visible body at least 48, for full-width/primary actions, bottom bars, form submit, dialog actions) and `compact` (visible body at least 32 inside a 48 dp/44 pt region at least 48 wide, for row/card actions and chips). Both grow with text; do not add other heights.
- Give icon-only controls an `accessibilityLabel`; expose role and disabled/selected/checked state. Keep reading and focus order meaningful.
- Inputs need persistent visible labels, matching accessibility labels, correct keyboard/content types, and explicit error or hint text. Placeholder text is not the only label.
- Support text scaling to 200% without hiding essential actions or values. Avoid fixed text containers, permit wrapping, and test long names and translated-length copy even before localization is implemented.
- Never communicate balance direction, success, warning, error, selection, or status with color alone. Pair color with words, signs, icons, or structure.
- Charts require a textual equivalent. Respect reduced motion and avoid animation required to understand state.
- Keep typography sans serif except the Tally Stick wordmark and editorial welcome heading.

## Visual Source Rules

- `mockups/` defines visual intent and state variants, not backend availability or business rules.
- Update Python builders and rebuild with `python3 mockups/_build/build.py` after changing mockup sources or shared styles.
- Final wordmark, icon, localization/RTL, and tablet behavior are open decisions. Do not invent them.
