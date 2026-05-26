# Coding Style

These rules keep frontend changes predictable across themes.

## TypeScript

- Prefer explicit types at API and component boundaries.
- Avoid `any`; use narrow types or local parsing.
- Keep Supabase response normalization close to the data helper that fetches it.
- Do not duplicate DB contract types in multiple files unless there is a clear boundary.

## React

- Components should describe UI state clearly and keep side effects in hooks.
- Keep theme-specific state and rendering inside the theme directory.
- Avoid hidden global state for map or filter behavior.
- Use stable keys from DB ids, not array indexes, when rendering expedition data.

## CSS and UI

- Match the active theme before adding new styling.
- Do not introduce a new design system for one screen.
- Keep mobile controls reachable and sized consistently.
- Avoid changing global CSS for a theme-specific issue; prefer theme CSS.

## Data and Errors

- Handle missing optional files gracefully.
- Empty query results should render an empty state, not crash.
- Do not synthesize DB facts in the frontend when an RPC should provide them.

## Comments

Use comments only when code is not self-explanatory: complex map setup, coordinate transforms, browser-specific behavior, or DB contract assumptions.
