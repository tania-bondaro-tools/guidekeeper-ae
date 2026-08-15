# GuideKeeper AE

GuideKeeper AE is a self-contained Adobe After Effects ExtendScript (`.jsx`) and
ScriptUI panel for motion designers and teams that share, hand off, or inherit
projects. It creates a predictable Project-panel structure, sorts root-level
items, applies naming-based labels, and safely prepares projects for After
Effects' native Reduce Project command.

The installed panel has no runtime dependencies. It targets desktop After
Effects versions that support ExtendScript ScriptUI panels and the host APIs
used by the script. The project does not currently publish a minimum-version
compatibility matrix.

## Install

1. Download `GuideKeeper_AE.jsx`.
2. Copy it into the After Effects `Scripts\ScriptUI Panels` directory:
   - **Windows:** `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`
   - **macOS:** `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
3. Restart After Effects.
4. Open **Window > GuideKeeper_AE.jsx**.
5. Use the panel as a floating palette or dock it with the rest of the
   After Effects interface.

## Panel

The workflow actions appear in this exact order:

| Action | Scope | Purpose |
| --- | --- | --- |
| **Build Structure** | Project and selected comps/folders | Creates or rebuilds the GuideKeeper structure and performs the full organization workflow |
| **Clean Up Root** | True project root only | Sorts newly imported root-level items into an existing structure |
| **Colour Code Current Comp** | Active comp only | Applies the naming and layer-type label convention to every layer in the current comp |
| **Reduce Project** | Resolved MASTER or manual comp set | Confirms the comp set, then invokes After Effects' native Reduce Project command |

**Build Structure** is the primary button and uses the `#00FFA3` GuideKeeper
accent when the host can render the custom treatment. The other three actions
remain native grey buttons. If custom drawing is unavailable, Build Structure
also falls back to a native button.

Every workflow action has a concise hover tooltip. The separate **?** utility
opens a resizable, non-destructive help palette covering Build/Rebuild, root
cleanup, current-comp labels, reduction, and selected-folder handling. Reusing
**?** focuses the open help palette; closing it allows a fresh palette to open.

## Build Structure

For a first build, or when only an incomplete structure exists, select one or
more compositions and/or folders containing compositions, then choose **Build
Structure**. The action:

- creates missing structural folders while reusing matching existing folders;
- creates or reuses the two root documentation comps;
- puts selected loose comps in `01_COMPS/MASTER`;
- processes selected group folders recursively;
- sorts other loose root items by the rules below;
- labels workflow folders and all comps recursively below `MASTER`;
- restores the original Project-panel selection; and
- performs its mutations in one **Build Structure** undo group.

A selected group folder moves to `01_COMPS/MASTER`. Its nested composition
hierarchy stays intact and all comps inside it become MASTER comps. If both a
folder and one of its descendants are selected, GuideKeeper processes the
top-level selected folder once and preserves the nested hierarchy. Footage is
extracted recursively and sorted by the normal asset rules. Supported OVERLORD
and matched Illustrator/Photoshop import groups remain intact. A full build
removes only nested folders that it empties while extracting assets from a
selected composition group. It preserves the selected group itself, unrelated
empty user folders, GuideKeeper folders, and preserved import groups.

Each selected folder must contain at least one composition. Asset-only or empty
folder selections stop before mutation and do not open an undo group.

If the complete GuideKeeper structure already exists, **Build Structure**
offers:

- **Rebuild Structure** - runs the complete workflow again using the current
  comp/folder selection.
- **Clean Up Root** - runs only the true-root maintenance workflow.
- **Cancel** - closes the dialog without mutation or an undo group.

Build and Rebuild are repeatable: they reuse the fixed folder hierarchy and
exact-name documentation comps instead of duplicating them.

## Project structure

The fixed structure is:

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
    FONTS/
    PACKSHOTS/
    LOGOS/
    UNSORTED/
03_GUIDES/
SOLIDS/
```

The two documentation comps intentionally remain at the true project root.
`LANGUAGES` and `TRANSITIONS` are manual destinations: GuideKeeper creates
them but does not auto-sort into them. `FONTS` is also a supplied-font
destination; the current file-type classifier does not automatically detect
font files.

GuideKeeper does **not** create a Project-panel `DATA` folder. The generated
workflow guide's `DATA/TRANSLATIONS.CSV` reference describes an optional
on-disk path next to the `.aep`.

### Composition classification

Rules are case-insensitive and the first match wins.

| Composition | Destination |
| --- | --- |
| Selected loose comp | `01_COMPS/MASTER` |
| Name starts with `guide_`, or contains `safe zone`, `safezone`, or `safe-zone` | `03_GUIDES` |
| Name starts with `txt_` | `01_COMPS/PRECOMPS/TEXT` |
| Name starts with `packshot_` | `01_COMPS/PRECOMPS/PACKSHOTS` |
| Name starts with `logo_` | `01_COMPS/PRECOMPS/LOGOS` |
| Name starts with `bg_` | `01_COMPS/PRECOMPS/BACKGROUNDS` |
| Name starts with `vfx_` | `01_COMPS/PRECOMPS/FX` |
| No rule matches | `01_COMPS/PRECOMPS/UNSORTED` |

### Footage and folder classification

| Item | Destination |
| --- | --- |
| Actual After Effects `SolidSource` | `SOLIDS` |
| `mp4`, `mov`, `avi`, `wmv`, `mkv`, or `webm` | `02_ASSETS/FOOTAGE` |
| Image named `packshot_*` | `02_ASSETS/PACKSHOTS` |
| Image named `logo_*` | `02_ASSETS/LOGOS` |
| Other `jpeg`, `jpg`, `png`, `gif`, `webp`, `svg`, `tiff`, `tif`, `raw`, `bmp`, `ai`, `eps`, `cdr`, or `psd` | `02_ASSETS/IMAGES` |
| `mp3`, `aac`, `wav`, `flac`, `ogg`, or `alac` | `02_ASSETS/AUDIO` |
| Unrecognized footage | `02_ASSETS/UNSORTED` |
| Other loose root folder | `02_ASSETS/UNSORTED`, intact |

GuideKeeper specially preserves common imported-artwork groups:

- A folder named `OVERLORD` (case-insensitive) moves intact to
  `02_ASSETS/IMAGES`, including all descendants.
- An Illustrator `.ai` item and a sibling `<basename> Layers` folder move
  together to `02_ASSETS/IMAGES`.
- A Photoshop `.psd` item and a sibling `<basename> Layers` folder move
  together to `02_ASSETS/IMAGES`.

AI/PSD matching is case-insensitive and uses the imported file basename or the
Project-item basename. A generic `Layers` folder, an unrelated `Other Layers`
folder, or an unmatched AI/PSD item is not treated as a pair. Matched Layers
folders and OVERLORD folders are preserved even when empty.

## Clean Up Root

Use **Clean Up Root** after importing material into a project that already has
the complete GuideKeeper structure. It processes only items sitting directly
at the true project root:

- loose comps and footage use the same classification rules as Build;
- OVERLORD and matching AI/PSD import groups move intact to `IMAGES`;
- other loose folders move intact to `02_ASSETS/UNSORTED`; and
- the root documentation comps and structural folders remain in place.

Content already inside any folder is not moved, reclassified, or flattened.
This preserves organized work and makes cleanup safe to rerun. The action
restores the Project-panel selection, refreshes workflow-folder and recursive
MASTER comp labels, and uses one **Clean Up Root** undo group. Without a
complete structure, it stops and asks the user to run Build Structure first.

## Labels

Project-panel item labels and current-comp layer labels are separate workflows.

Build, Rebuild, and Clean Up Root apply these Project-panel labels:

- all fixed GuideKeeper folders use label 15 (Sandstone); and
- every composition recursively below `01_COMPS/MASTER` uses label 1 (Red).

Nested user folders below MASTER keep their own labels. Comps outside MASTER,
unrelated project items, and layers inside comps are not relabeled by those
organization actions.

**Colour Code Current Comp** changes every layer in the currently active comp.
It does not process other comps or recurse into precomp contents.

| Default label | Layer category | Detection |
| --- | --- | --- |
| Red | Text | `txt_` prefix |
| Yellow | Audio | `Audio_` prefix |
| Aqua | Light | After Effects layer type |
| Pink | Shape | `shape_` prefix |
| Lavender | Camera | After Effects layer type |
| Peach | Packshot | `packshot_` prefix |
| Sea Foam | Logo | `logo_` prefix |
| Blue | Precomp | Layer source is a composition |
| Green | Background/media | `bg_` prefix |
| Purple | Adjustment | `adj_` prefix |
| Orange | Null/controller | `null_` prefix |
| Brown | Mask/matte | `msk_` prefix |
| Fuchsia | VFX/transition | `vfx_` prefix |
| Cyan | Guide/safe zone | `guide_` prefix |
| None | Unclassified | No prefix or type rule matches |

Prefix rules take precedence over light, camera, and precomp type fallbacks.
Matching is case-insensitive.

The names above assume After Effects' default label palette. Label numbers are
used by the script, while each user's label colors and names are local,
customizable After Effects preferences. A customized palette can therefore
display different colors for the same labels.

## Reduce Project

**Reduce Project** selects a safe, explicit comp set before invoking After
Effects' destructive native reduction command:

1. With a valid GuideKeeper structure, it recursively discovers every comp
   below `01_COMPS/MASTER`. The current Project-panel selection is ignored.
2. Only when no valid complete structure exists, it falls back to the selected
   comps and/or folders. Selected folders are searched recursively and duplicate
   comps are removed.
3. It displays the resolved comp count and names and asks for confirmation.
4. After confirmation, it looks up the native **Reduce Project** command,
   selects exactly the resolved comps, and executes it.

Canceling the confirmation preserves the original selection and invokes
nothing. A valid structure with no MASTER comps stops with an explanation; it
does not use a manual fallback. Empty manual selections, unsupported selected
items, and selected folders containing no comps also stop before mutation.
Native command lookup or execution errors are surfaced to the user. If native
execution throws, GuideKeeper attempts to restore the pre-command selection; it
does not claim to roll back any project changes the native command may already
have made.

Save a backup before reducing a project and inspect the confirmation list
carefully. The command name is resolved through the After Effects host, so its
availability can vary by host version or localization. If GuideKeeper reports
that it cannot find **Reduce Project**, use an After Effects installation where
that native command is available or run the native workflow manually.

## Generated project documentation

Build and Rebuild ensure two production documentation comps exist at the true
project root:

| Comp | Purpose |
| --- | --- |
| `!_README` | Project handoff template for project identity, creator, date, After Effects version, description, key comps, fonts, tools, issues, and notes |
| `!_WORKFLOW_GUIDE` | Onboarding reference for text precomps, language rollout, Essential Properties, naming labels, and folder locations |

New documentation comps are 1250 x 2160, 10 seconds, and 25 fps. Each has a
black full-frame solid, a white Arial body, and a 48 px Arial Bold header in
`#00FFA3`. `!_README` uses a 24 px body; `!_WORKFLOW_GUIDE` uses a 15 px body.
The background solid sources are stored in `SOLIDS`.

`!_README` automatically records the creation date in `YYYY-MM-DD` format and
the current After Effects version. If either exact-name comp already exists,
GuideKeeper moves it to the project root if needed and does not overwrite its
dimensions, layers, styling, or user-edited content. Repeated builds therefore
do not duplicate or reset the documentation. If the documentation pair cannot
be completed, newly created documentation comps and their solid sources are
removed, and existing documentation comps are returned to their prior folders.

## Customize conventions

GuideKeeper has no preferences UI, external configuration file, or runtime
prefix editor. Customization means editing `GuideKeeper_AE.jsx` and
redistributing that edited self-contained panel.

The shipped case-insensitive prefixes are:

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

Edit those constants to change naming prefixes. Changing label numbers,
extension lists, guide keywords, or folder names requires corresponding source
and test updates; folder names in particular participate in both structure
creation and complete-structure detection.

## Contributing and testing

The standard contributor and CI path is dependency-free and does not require
After Effects or any other Adobe software. With a recent Node.js version, run:

```powershell
npm test
```

The suite uses only Node.js built-ins and a minimal mocked After Effects host to
execute the production `.jsx`.

### OPTIONAL After Effects smoke checks

**Real After Effects validation is optional, non-blocking maintainer/release
validation. It is not a contributor prerequisite and is not required in CI.**

When After Effects is available, useful release checks include:

- opening and docking the panel, resizing between row and column layouts, and
  confirming only Build Structure receives the accent treatment;
- opening, reusing, closing, and reopening the **?** help palette;
- building and rebuilding with loose comps and nested selected group folders;
- checking OVERLORD and matching Illustrator/Photoshop import preservation;
- running Clean Up Root twice and confirming organized folder content is
  untouched;
- checking Project-panel and current-comp labels with the default palette; and
- canceling and accepting Reduce Project confirmation with nested MASTER comps.

## Troubleshooting and limitations

- GuideKeeper runs in the older ExtendScript host, not a browser or Node.js
  runtime. Keep the installed `.jsx` self-contained.
- If the panel is missing from **Window**, confirm the file is in the active
  After Effects version's `ScriptUI Panels` directory, then restart the app.
- If displayed label colors differ between machines, compare
  **Preferences > Labels**; GuideKeeper assumes the default numeric palette.
- Clean Up Root requires the complete fixed structure. Use Build Structure to
  create or repair an incomplete one.
- Build Structure and Clean Up Root are undo-grouped, but native Reduce Project
  is destructive. Keep backups and use its confirmation prompt.

## License

No license has been selected and the repository does not contain a `LICENSE`
file. No permission to use, modify, or redistribute the project is granted
beyond applicable law until the maintainers add one.
