# GuideKeeper AE

GuideKeeper AE is a compact ScriptUI panel for Adobe After Effects. It creates a predictable Project-panel structure, applies the team's naming-label convention, and exposes safe wrappers for After Effects' native Reduce Project and Collect Files commands.

The panel has exactly four workflows:

1. **Build Structure**
2. **Colour Code Layers**
3. **Reduce Project**
4. **Collect files**

## Install

Copy `GuideKeeper_AE.jsx` into the After Effects `Scripts/ScriptUI Panels` directory, restart After Effects, then open **Window > GuideKeeper_AE.jsx**.

Typical locations:

- Windows: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`
- macOS: `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`

The panel is self-contained and has no runtime dependencies.

## Build Structure

Select one or more compositions, folders containing compositions, or a mixture of both. Invalid item types and selected folders without a composition are rejected before any project mutation or undo group begins.

Build Structure creates or reuses this exact hierarchy:

```text
!_README
!_WORKFLOW_GUIDE
01_COMPS/
    MASTER/
    LANGUAGES/
    PRECOMPS/
        TEXT/
        PACKSHOTS/
        LOGOS/
        TRANSITIONS/
        BACKGROUNDS/
        FX/
        UNSORTED/
02_ASSETS/
    FOOTAGE/
    IMAGES/
    AUDIO/
    PACKSHOTS/
    LOGOS/
    UNSORTED/
03_GUIDES/
SOLIDS/
```

`!_README` and `!_WORKFLOW_GUIDE` are compositions, not folders. Newly created documentation comps are placed at the Project root and use the first composition resolved from the selection for size, pixel aspect, duration, and frame rate. Each receives one plain text layer. If an exact-name documentation comp already exists anywhere, GuideKeeper reuses it without changing its parent or content and does not create a duplicate.

There is deliberately no Project-panel `FONTS` folder. Fonts are installed system resources and belong in the handoff's disk-level documentation, not as importable After Effects project items.

### Selection behavior

- Every directly selected composition moves to `01_COMPS/MASTER` and receives label 1 (Red), even when a selected ancestor folder also contains it.
- A selected folder keeps its composition and subfolder grouping intact, then moves into `MASTER`.
- Existing GuideKeeper structure folders are rejected as selections so a later run cannot move or nest the canonical tree into itself.
- Footage is extracted recursively from selected folders and classified into `02_ASSETS` or `SOLIDS`.
- Compositions inside selected folders stay in place and receive Red.
- A nested folder is deleted only if that exact extraction emptied it. The selected root folder is never deleted.
- Descendant folder selections are deduplicated when an ancestor is also selected.

### Root-folder safety

The general sorting pass acts only on compositions and footage that were at the true Project root when the workflow began.

Unselected user folders at the root are never moved, flattened, or deleted. Their contents are not inspected or sorted. Items already inside any unselected folder remain untouched, including exact-name documentation comps. This boundary also makes repeated runs idempotent.

### Composition routing

Rules are case-insensitive and first-match wins:

| Condition | Destination |
|---|---|
| Directly selected | `01_COMPS/MASTER` |
| `guide_` prefix or safe-zone keyword | `03_GUIDES` |
| `txt_` prefix | `01_COMPS/PRECOMPS/TEXT` |
| `packshot_` prefix | `01_COMPS/PRECOMPS/PACKSHOTS` |
| `logo_` prefix | `01_COMPS/PRECOMPS/LOGOS` |
| `bg_` prefix | `01_COMPS/PRECOMPS/BACKGROUNDS` |
| `vfx_` prefix | `01_COMPS/PRECOMPS/FX` |
| Unmatched | `01_COMPS/PRECOMPS/UNSORTED` |

`LANGUAGES` and `TRANSITIONS` are manual destinations because the naming convention does not distinguish them reliably.

### Footage routing

| Condition | Destination |
|---|---|
| `SolidSource` | `SOLIDS` |
| Video extension | `02_ASSETS/FOOTAGE` |
| Image extension and `packshot_` prefix | `02_ASSETS/PACKSHOTS` |
| Image extension and `logo_` prefix | `02_ASSETS/LOGOS` |
| Other image extension | `02_ASSETS/IMAGES` |
| Audio extension | `02_ASSETS/AUDIO` |
| Unknown or missing extension | `02_ASSETS/UNSORTED` |

Supported video extensions are `mp4`, `mov`, `avi`, `wmv`, `mkv`, and `webm`. Supported audio extensions are `mp3`, `aac`, `wav`, `flac`, `ogg`, and `alac`. Common Adobe, raster, and still-image extensions are recognized.

### Project labels and safety

Build Structure applies label 15 (Sandstone) to every Project-panel folder and label 1 (Red) to every composition below `MASTER`. Other project-item labels are left unchanged.

The workflow snapshots the original selection and root items before creating anything, performs all mutations inside one named undo group, restores the exact original selection, and pairs the undo group with `try`/`finally`. If a host mutation fails, GuideKeeper reports the error and directs the user to undo the operation.

GuideKeeper does not claim to control Project-panel expansion, reveal, scrolling, or insertion order; those behaviors have no documented scripting API.

## Colour Code Layers

This workflow affects only the active composition. Prefix rules take precedence over layer-type fallbacks.

| Match | Default label |
|---|---:|
| `txt_` | 1 Red |
| `audio_` | 2 Yellow |
| Light layer | 3 Aqua |
| `shape_` | 4 Pink |
| Camera layer | 5 Lavender |
| `packshot_` | 6 Peach |
| `logo_` | 7 Sea Foam |
| Source is a composition | 8 Blue |
| `bg_` | 9 Green |
| `adj_` | 10 Purple |
| `null_` | 11 Orange |
| `msk_` | 12 Brown |
| `vfx_` | 13 Fuchsia |
| `guide_` | 14 Cyan |
| Unmatched | 15 Sandstone |

The workflow uses one named undo group. Label numbers assume After Effects' default label palette; locally customized label colors can look different.

## Reduce Project

Select compositions and/or folders. Folder contents are resolved recursively and duplicate compositions are removed from the native command selection.

GuideKeeper resolves `app.findMenuCommandId("Reduce Project")` and executes only a nonzero result. It does not use an undocumented numeric fallback and does not wrap the native command in a scripted undo group. If lookup or execution throws, the original Project selection is restored and an actionable alert is shown.

Native Reduce Project can delete project content. Review the selection before running it and use After Effects' own undo behavior where available.

## Collect files

This workflow has no selection precondition. It tries the documented menu captions `Collect Files...` and `Collect Files`, then executes only a nonzero command ID. Failure to resolve a command is reported as a possible localization or availability issue. The native command is not wrapped in a scripted undo group.

## Automated contract tests

Run:

```powershell
npm test
```

The dependency-free Node/V8 suite uses a minimal one-based After Effects host mock. It covers the panel contract, selection validation, structure and routing rules, selected-folder extraction, root-folder isolation, documentation reuse, repeat-run behavior, labels, undo pairing, selection restoration, and native command lookup.

These are algorithmic and contract tests. They do **not** prove compatibility with the real After Effects host, ScriptUI implementation, menu localization, or native command side effects.

## Optional maintainer smoke test

Real-host testing is optional for contributors and non-blocking for CI, but required before merging this host-facing rewrite:

1. Install the panel in After Effects and test both docked and floating layouts, including resize behavior.
2. In a disposable project, verify invalid Build Structure selections make no changes.
3. Select a root comp and confirm it moves to `01_COMPS/MASTER`, turns Red, and remains selected.
4. Select a nested working folder containing comps, footage, and empty-after-extraction subfolders; confirm grouping is preserved and only extracted-empty nested folders are removed.
5. Confirm an unrelated root folder and everything inside it remain untouched.
6. Run Build Structure twice and confirm no structural folders or documentation comps are duplicated.
7. Edit both documentation comps, rerun Build Structure, and confirm their content remains unchanged at the Project root.
8. Check every comp/footage route and verify folder, master-comp, and layer labels against the default palette.
9. Trigger a controlled Build Structure failure in a disposable project if practical; confirm one undo step is available and the alert is actionable.
10. Test Reduce Project on disposable content with direct comps and nested folders, including a localized After Effects installation if available.
11. Test both Collect Files menu-caption variants where available and complete a disposable collection.

## Compatibility

The runtime uses the legacy ExtendScript dialect and documented After Effects host classes and APIs. It has no Node.js, browser, module, network, or external file-system dependency.
