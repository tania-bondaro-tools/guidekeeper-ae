# Copilot instructions for GuideKeeper AE

## Repository and runtime

- Treat this as a single-file Adobe After Effects ScriptUI panel. Runtime behavior lives in `GuideKeeper_AE.jsx`; keep the README synchronized with user-visible behavior and conventions.
- Write for ExtendScript's older JavaScript dialect. Prefer `var`, function declarations/expressions, plain objects, and simple arrays; do not assume ES modules, npm packages, transpilation, browser APIs, or Node.js APIs.
- Keep the installed panel self-contained. Code running inside After Effects must not require external runtime dependencies.
- Use After Effects host APIs and host types (`app`, `Project`, `CompItem`, `FolderItem`, `FootageItem`, layers, sources) deliberately. Project items, folder children, and layers are one-based collections; normal JavaScript arrays remain zero-based.

## Safe project mutation

- Preserve user-created project content and hierarchy unless a requirement explicitly calls for a move or deletion. Understand the current intentional behavior before changing it: `Build Structure` can move selected group folders, extract their footage, and remove non-structural folders that become empty. Do not broaden that destructive scope.
- Make organizing operations safe to run repeatedly. Reuse existing named folders and documentation comps, avoid duplicates, do not overwrite user-edited comp content, and do not re-sort already organized items without an explicit reason.
- Snapshot host collections before reparenting or removing items because those mutations can change collection indexes.
- Wrap each user action's mutations in one clearly named undo group. Call `app.beginUndoGroup` immediately before mutation and guarantee the matching `app.endUndoGroup` with `try`/`finally`; report actionable errors without skipping cleanup.
- Do not add silent failures, broad empty `catch` blocks, or success-shaped fallbacks. If a narrow host operation is expected to fail for a known reason, document that reason and surface or handle the failure consistently.

## Conventions and structure

- Keep naming rules centralized. Current prefixes are `txt_`, `bg_`, `packshot_`, `logo_`, `null_`, `adj_`, `vfx_`, `msk_`, `shape_`, `Audio_`, and `guide_`; matching is case-insensitive even where the displayed convention uses capitalization.
- Label numbers assume After Effects' default label palette: 1 Red, 2 Yellow, 3 Aqua, 4 Pink, 5 Lavender, 6 Peach, 7 Sea Foam, 8 Blue, 9 Green, 10 Purple, 11 Orange, 12 Brown, 13 Fuchsia, 14 Cyan, and 15 Sandstone. Remember that users can customize palette colors locally.
- Reuse helpers such as `nameStartsWith`, `nameContainsAny`, `getFileExtension`, and `labelForLayer` instead of duplicating checks. Keep item classification decisions separate from hierarchy mutation, and share classification logic between root sorting and selected-folder processing.
- Keep changes small and focused. Do not combine guidance, cleanup, or refactoring with unrelated changes to panel behavior.

## Testing

- Keep the standard contributor and CI validation path dependency-light. It must not require Adobe After Effects or any other proprietary Adobe software.
- Where feasible, test logic with Node.js built-ins and minimal host mocks for one-based collections, `instanceof`-style item categories, naming rules, classification, and repeat-run behavior. Do not add runtime test dependencies to the installed panel.
- Maintainers may optionally smoke-test host and UI behavior in After Effects for release confidence when that environment is available. This validation is non-blocking, is not a contributor prerequisite, and is not a CI requirement.
- Review the final diff for accidental `GuideKeeper_AE.jsx` behavior changes and update documentation whenever user-visible behavior or conventions change.
