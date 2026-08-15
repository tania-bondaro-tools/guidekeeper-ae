# GuideKeeper AE

A ScriptUI panel for After Effects that keeps a project organised around a fixed folder structure and a prefix-based naming and colour-coding convention, so every project ends up structured the same way without anyone sorting it by hand.

Built for a small motion design team spread across multiple locations sharing After Effects files.

## What it does

| Button | Scope | Action |
|---|---|---|
| Build Structure | Whole project | Builds the folder structure and two documentation comps, then sorts every comp and footage item into it |
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
02_ASSETS/
    FOOTAGE
    IMAGES
    AUDIO
    PACKSHOTS
    LOGOS
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

Select your final composition(s) first, compositions only, then click. Required, if nothing (or something other than a composition) is selected, you'll get a "Please choose the main composition" alert. Runs inside one undo step. When it finishes, the selection is reset to just the comp(s) you started with, now inside `MASTER`, so they stay visible and selected instead of seeming to disappear into the new structure.

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
| *(none of the above)* | `01_COMPS/PRECOMPS` |

`LANGUAGES` and `TRANSITIONS` are built but never auto-populated: language versions are usually named with a country code that's too open-ended to guess reliably, and TRANSITIONS shares its prefix with FX, so there's no automatic way to tell them apart.

**Footage** follows this order:

| If the footage... | Goes to |
|---|---|
| Has a video extension (mp4, mov, avi, wmv, mkv, webm) | `02_ASSETS/FOOTAGE` |
| Has an image extension and starts with `packshot_` | `02_ASSETS/PACKSHOTS` |
| Has an image extension and starts with `logo_` | `02_ASSETS/LOGOS` |
| Has an image extension, otherwise | `02_ASSETS/IMAGES` |
| Has an audio extension (mp3, aac, wav, flac, ogg, alac) | `02_ASSETS/AUDIO` |
| Matches none of the above (includes solids) | `SOLIDS` |

Folders that already existed before the script ran are never moved; if sorting leaves one empty, it's deleted during cleanup. The folders this tool builds are never deleted this way, even when empty.

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
- Run **Build Structure** on comps and a nested group folder; inspect the actual moves, preserved hierarchy, Project-panel labels, selection restoration, and repeat-run reuse.
- Run **Colour Code Layers** on representative prefix, light, camera, precomp, and unmatched layers with the default label palette.
- Undo each mutating action once and confirm the project returns to its prior state; also exercise invalid-selection and host error alerts.
- Open the native **Reduce Project** and **Collect Files** dialogs and cancel them without changing the test project.

## License

Not yet chosen. Add a `LICENSE` file before making the repo public so people know what they're allowed to do with this. MIT is the common choice for a small utility like this if you want others to freely use, modify, and redistribute it with attribution.
