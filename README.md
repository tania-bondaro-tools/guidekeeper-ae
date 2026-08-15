# GuideKeeper AE

A ScriptUI panel for After Effects that keeps a project organised around a fixed folder structure and a prefix-based naming and colour-coding convention, so every project ends up structured the same way without anyone sorting it by hand.

Built for a small motion design team spread across multiple locations sharing After Effects files.

## What it does

| Button | Scope | Action |
|---|---|---|
| Build Structure | Whole project | Builds the full structure on first use; on existing structures, offers Rebuild Structure, Clean Up Root, or Cancel |
| Clean up the root | Project root only | Sorts newly imported loose comps, assets, and folders without touching organised content |
| Colour Code Layers | Current comp only | Applies a label colour to every layer, by name prefix or layer type |
| Reduce Project | Whole project | Deletes anything unused by the selected composition(s), native After Effects command |
| Collect files | Whole project | Gathers all assets into one folder for handoff, native After Effects command |

Everything below is the convention the script ships with by default. None of it is hardcoded logic, the prefix lists and colour mapping sit in one place near the top of the script, plain constants you edit to match your own team's naming.

## Folder structure

`Build Structure` builds this (existing folders are reused, never duplicated):

```
!_README
!_WORKFLOW_GUIDE
01_COMPS/
    MASTER
    LANGUAGES
    PRECOMPS/
        TEXT
        PACKSHOTS
        LOGOS
        TRANSITIONS
        BACKGROUNDS
        FX
        UNSORTED
02_ASSETS/
    FOOTAGE
    IMAGES/
        OVERLORD              (when imported)
        <name>.ai + <name> Layers
        <name>.psd + <name> Layers
    AUDIO
    PACKSHOTS
    LOGOS
    UNSORTED
03_GUIDES
SOLIDS
```

`!_README` is a comp with one text layer, pre-filled with this template, sized and timed to match whichever comp you selected as master, only created once and never overwritten on repeat runs:

```
PROJECT: [Job number]_[CLIENT]_[PROJECT]
CREATED BY: [Name/Agency] | DATE: <auto> | AE VERSION: <auto>
DESCRIPTION: [What the project delivers]
KEY COMPS: [List deliverables]
FONTS: [All fonts used in this project]
PLUGINS / SCRIPTS: [Name + version, provided in project folder]
KNOWN ISSUES: [Or None] | NOTES: [What to do, what not to touch]
```

DATE and AE VERSION fill in automatically; everything else is a prompt to complete by hand. `!_WORKFLOW_GUIDE` is created the same way, as a placeholder for a real visual summary you add yourself, the script can't generate that content.

## Installation

1. Download `GuideKeeper_AE.jsx`
2. Copy it into your After Effects **Scripts/ScriptUI Panels** folder:
   - **Windows**: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`
   - **Mac**: `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
3. Restart After Effects
4. Open it from **Window > GuideKeeper_AE.jsx**, and dock it wherever's convenient

## Usage

### Build Structure

On first use, select your final composition(s) or a folder of compositions, then click. If nothing (or something other than a composition or folder) is selected, you'll get a "Please choose the main composition" alert. The complete structure is created and the current full organisation workflow runs inside one undo step. When it finishes, the selection is restored to exactly what you started with.

When a complete GuideKeeper structure already exists, Build Structure asks what to do:

- **Rebuild Structure** runs the full organisation workflow again and requires a valid comp/folder selection.
- **Clean Up Root** runs the lightweight root-only maintenance workflow described below.
- **Cancel** closes the dialog without mutating the project or opening an undo group.

**Compositions** are checked top to bottom, first match wins, case-insensitive substring match at the start of the name:

| If the comp name starts with... | Goes to |
|---|---|
| *(was selected before clicking)* | `01_COMPS/MASTER` |
| `guide_`, or contains "safe zone" / "safezone" / "safe-zone" | `03_GUIDES` |
| `txt_` | `01_COMPS/PRECOMPS/TEXT` |
| `packshot_` | `01_COMPS/PRECOMPS/PACKSHOTS` |
| `logo_` | `01_COMPS/PRECOMPS/LOGOS` |
| `bg_` | `01_COMPS/PRECOMPS/BACKGROUNDS` |
| `vfx_` | `01_COMPS/PRECOMPS/FX` |
| *(none of the above)* | `01_COMPS/PRECOMPS/UNSORTED` |

`LANGUAGES` and `TRANSITIONS` are built but never auto-populated: language versions are usually named with a country code that's too open-ended to guess reliably, and TRANSITIONS shares its prefix with FX, so there's no automatic way to tell them apart.

**Footage** follows this order:

| If the footage... | Goes to |
|---|---|
| Uses After Effects' actual `SolidSource` type | `SOLIDS` |
| Has a video extension (mp4, mov, avi, wmv, mkv, webm) | `02_ASSETS/FOOTAGE` |
| Has an image extension and starts with `packshot_` | `02_ASSETS/PACKSHOTS` |
| Has an image extension and starts with `logo_` | `02_ASSETS/LOGOS` |
| Has an image extension, otherwise | `02_ASSETS/IMAGES` |
| Has an audio extension (mp3, aac, wav, flac, ogg, alac) | `02_ASSETS/AUDIO` |
| Matches none of the above | `02_ASSETS/UNSORTED` |

Layered Illustrator and Photoshop imports are kept together. When an `.ai` or `.psd` footage item has a sibling folder named `<source basename> Layers` (case-insensitive), both move to `02_ASSETS/IMAGES`; the Layers folder and everything inside it stay intact. Matching uses the imported file or Project-item basename, so unrelated folders named only `Layers` are not coupled accidentally. An unmatched `.ai` or `.psd` item continues to use the normal image and prefix rules above.

A folder named `OVERLORD` (case-insensitive) also moves intact to `02_ASSETS/IMAGES`, without inspecting or reorganising any of its children. These preserved OVERLORD and matched Layers folders are not removed by empty-folder cleanup.

Other loose root folders move intact to `02_ASSETS/UNSORTED`; their children and hierarchy are not reorganised. A folder explicitly selected as a composition group instead moves to `01_COMPS/MASTER`, keeps its comp hierarchy, and has its footage extracted by the normal asset rules. Selected composition groups preserve any OVERLORD or matched AI/PSD group they encounter. The folders GuideKeeper builds are reused on repeat runs and are never removed when empty.

After Build or Rebuild, the only items intentionally left at the true project root are the four structural folders and the `!_README` / `!_WORKFLOW_GUIDE` documentation comps.

### Project-panel labels

Build, Rebuild, and Clean Up Root apply After Effects Project-panel labels separately from layer labels:

- Every GuideKeeper workflow folder listed in the structure above uses label 15 (Sandstone).
- Every composition anywhere below `01_COMPS/MASTER`, including comps inside nested selected groups, uses label 1 (Red).
- Unrelated folders and comps outside `MASTER` keep their existing labels.

These operations do not alter layer labels inside compositions. Use **Colour Code Layers** explicitly for that separate current-comp workflow.

### Clean up the root

Use this after importing new material into a project that already has a complete GuideKeeper structure. It processes only items sitting loose at the true project root:

- Loose comps and footage use the same naming and file-type classification rules as Build Structure.
- Loose `OVERLORD` and matched AI/PSD Layers folders move intact to `02_ASSETS/IMAGES` with their paired source item where applicable.
- Other loose folders move intact to `02_ASSETS/UNSORTED`; their children and hierarchy are not reorganised.
- Structural folders, documentation comps, and items already inside folders are not moved or reorganised; only the workflow-folder and recursive `MASTER` comp labels described above are refreshed.

The action is safe to rerun, preserves the current Project-panel selection, refreshes workflow-folder and recursive `MASTER` comp labels, and runs inside one **Clean Up Root** undo group. If no complete GuideKeeper structure exists, it asks you to run Build Structure first and makes no mutation.

### Colour Code Layers

Operates only on whatever comp is currently open and active, not the whole project, and not recursively into nested precomps. Applies After Effects' native label colours:

| Colour | Category | Detected by |
|---|---|---|
| Red | Text | name starts with `txt_` |
| Yellow | Audio | name starts with `Audio_` |
| Aqua | Light layer | layer type |
| Pink | Shape | name starts with `shape_` |
| Lavender | Camera layer | layer type |
| Peach | Packshots | name starts with `packshot_` |
| Sea Foam | Logos | name starts with `logo_` |
| Blue | Precomp | layer's source is a composition |
| Green | Footage / media | name starts with `bg_` |
| Purple | Adjustment | name starts with `adj_` |
| Orange | Nulls / controllers | name starts with `null_` |
| Brown | Masks / mattes | name starts with `msk_` |
| Fuchsia | VFX / transitions | name starts with `vfx_` |
| Cyan | Guides / safe zones | name starts with `guide_` |

Prefix matches are checked first; the light/camera/precomp rules only apply as a fallback when no prefix matches. A layer matching nothing is left with no colour on purpose, as a visible flag that it doesn't follow the naming convention rather than a silent pass.

One thing worth knowing: label colours and names are a local After Effects preference, not something stored in the project file. This script assumes the default palette (Red is label 1, Green is label 9, and so on); if a teammate has customised their own label names, the same script will show different colours on their machine. Sharing a label colour preset (Preferences > Labels > Export) alongside the script keeps everyone in sync.

### Reduce Project / Collect files

Both are thin wrappers around native After Effects commands. Reduce Project requires a comp selection first, like Build Structure; Collect files needs no precondition.

## Customising the rules

The prefix list and label colours both live in constants near the top of the script:

```javascript
var PREFIX_TEXT       = "txt_";
var PREFIX_BACKGROUND = "bg_";
var PREFIX_PACKSHOT   = "packshot_";
var PREFIX_LOGO       = "logo_";
var PREFIX_NULL       = "null_";
var PREFIX_ADJUSTMENT = "adj_";
var PREFIX_VFX        = "vfx_";
var PREFIX_MASK       = "msk_";
var PREFIX_SHAPE      = "shape_";
var PREFIX_AUDIO      = "Audio_";
var PREFIX_GUIDE      = "guide_";
```

Edit these, and the corresponding folder names inside `buildStructure()`, to match your own team's convention, no other code changes needed.

## Compatibility

Written in ExtendScript (`.jsx`), which is still the scripting language After Effects uses for the Scripts / ScriptUI Panels system.

## Testing

Run the automated regression suite with Node.js:

```powershell
npm test
```

This standard contributor and CI path uses only Node's built-in test runner and `vm` module to execute the production `.jsx` file in a mocked After Effects host. It installs no dependencies, requires no Adobe software, and adds no runtime dependency to the panel.

### OPTIONAL After Effects release smoke check

**This check is non-blocking maintainer/release validation only. It is not a contributor prerequisite and is not required in CI.** When After Effects is available:

- Open the panel as both a floating window and a docked panel; resize it across the row/column breakpoint.
- Run **Build Structure** on comps and a nested group folder; inspect the actual moves, preserved hierarchy, Project-panel labels, and selection restoration.
- Import representative OVERLORD, layered Illustrator, and layered Photoshop groups; confirm Build/Rebuild and root cleanup keep each hierarchy and source/Layers pair intact under `02_ASSETS/IMAGES`.
- Run Build Structure again and exercise **Rebuild Structure**, **Clean Up Root**, and **Cancel**; confirm Cancel is mutation-free and cleanup touches only loose root items.
- Run **Clean up the root** twice with loose comps, footage, and an intact folder; confirm organised content and folder children remain untouched.
- Run **Colour Code Layers** on representative prefix, light, camera, precomp, and unmatched layers with the default label palette.
- Undo each mutating action once and confirm the project returns to its prior state; also exercise invalid-selection and host error alerts.
- Open the native **Reduce Project** and **Collect Files** dialogs and cancel them without changing the test project.

## License

Not yet chosen. Add a `LICENSE` file before making the repo public so people know what they're allowed to do with this. MIT is the common choice for a small utility like this if you want others to freely use, modify, and redistribute it with attribution.
