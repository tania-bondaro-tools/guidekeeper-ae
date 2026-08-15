// GuideKeeper_AE.jsx
// ScriptUI panel that organises an After Effects project into a fixed
// folder structure and applies a layer/item colour-coding convention.
// Built around prefix-based naming: edit the prefix lists and colour
// mapping below to match your own team's convention.
//
// ── Build Structure ─────────────────────────────────────────────────
// Select composition(s), or a folder containing compositions, before
// clicking. Builds this structure (creating folders only if missing)
// and sorts loose items into it:
//
//   !_README            <- generated project handoff documentation
//   !_WORKFLOW_GUIDE     <- generated onboarding and workflow reference
//   01_COMPS/
//     MASTER             <- every selected comp, plus comps inside any
//                           selected folder (all coloured Red)
//     LANGUAGES          <- manual only, never auto-sorted
//     PRECOMPS/
//       TEXT             <- txt_
//       PACKSHOTS        <- packshot_
//       LOGOS            <- logo_
//       TRANSITIONS      <- manual only, shares the vfx_ prefix with FX
//       BACKGROUNDS      <- bg_
//       FX               <- vfx_
//       UNSORTED         <- comps matching no prefix
//   02_ASSETS/
//     FOOTAGE            <- video files
//     IMAGES             <- image files, intact OVERLORD folders, and
//                           paired AI/PSD source + Layers folders
//     AUDIO              <- audio files
//     FONTS              <- font files supplied with the project
//     PACKSHOTS          <- image files named packshot_
//     LOGOS              <- image files named logo_
//     UNSORTED           <- anything unrecognised that isn't a solid
//   03_GUIDES             <- guide_, or "safe zone" / "safezone" / "safe-zone"
//   SOLIDS                <- solid-source footage specifically
//
// If a selected item is a FOLDER instead of a loose comp, its contents
// are processed recursively: footage inside gets sorted normally, comps
// stay in place and turn Red, then the whole folder relocates into
// MASTER. Useful when comps already sit in their own working groups.
//
// Only items sitting loose at the true project root get sorted; loose user
// folders move intact to ASSETS/UNSORTED. Anything already inside a folder
// is left where it is, so re-running this doesn't re-touch organised content
// or undo what selected group-folder processing just did.
//
// After sorting, every GuideKeeper workflow folder is coloured Sandstone
// and every comp anywhere below MASTER is coloured Red, both at the
// Project-panel item level (separate from the per-layer colours Colour
// Code Current Comp sets on layers).
//
// ── Colour Code Current Comp ────────────────────────────────────────
// Applies label colours to every layer in the CURRENT comp, per the
// prefix/colour table below.

(function GuideKeeper(thisObj) {

    // ── UI ───────────────────────────────────────────────────────────

    var GUIDEKEEPER_ACCENT = [0, 1, 163 / 255, 1];
    var GUIDEKEEPER_ACCENT_TEXT = [0, 0, 0, 1];
    var helpWindow = null;

    function applyPrimaryButtonStyle(button) {
        var graphics = button && button.graphics;
        if (!graphics
                || !graphics.BrushType
                || !graphics.PenType
                || typeof graphics.newBrush !== "function"
                || typeof graphics.newPen !== "function"
                || typeof graphics.drawOSControl !== "function"
                || typeof graphics.rectPath !== "function"
                || typeof graphics.fillPath !== "function"
                || typeof graphics.measureString !== "function"
                || typeof graphics.drawString !== "function") {
            return false;
        }

        try {
            var accentBrush = graphics.newBrush(
                graphics.BrushType.SOLID_COLOR,
                GUIDEKEEPER_ACCENT
            );
            var textPen = graphics.newPen(
                graphics.PenType.SOLID_COLOR,
                GUIDEKEEPER_ACCENT_TEXT,
                1
            );

            button.onDraw = function () {
                var g = this.graphics;
                g.drawOSControl();
                if (!this.enabled) return;

                var width = this.size.width || this.size[0];
                var height = this.size.height || this.size[1];
                var textSize = g.measureString(this.text, g.font);
                var textWidth = textSize.width || textSize[0];
                var textHeight = textSize.height || textSize[1];

                g.rectPath(2, 2, width - 4, height - 4);
                g.fillPath(accentBrush);
                g.drawString(
                    this.text,
                    textPen,
                    (width - textWidth) / 2,
                    (height - textHeight) / 2,
                    g.font
                );
            };
            return true;
        } catch (styleError) {
            button.onDraw = null;
            return false;
        }
    }

    function applyAccentText(control) {
        var graphics = control && control.graphics;
        if (!graphics
                || !graphics.PenType
                || typeof graphics.newPen !== "function") {
            return false;
        }

        try {
            graphics.foregroundColor = graphics.newPen(
                graphics.PenType.SOLID_COLOR,
                GUIDEKEEPER_ACCENT,
                1
            );
            return true;
        } catch (styleError) {
            return false;
        }
    }

    function addHelpSection(container, heading, body) {
        var section = container.add("group");
        section.orientation = "column";
        section.alignChildren = ["fill", "top"];
        section.spacing = 2;

        var title = section.add("statictext", undefined, heading);
        applyAccentText(title);
        var bodyText = section.add("statictext", undefined, body, { multiline: true });
        bodyText.preferredSize = [360, 44];
    }

    function showHelpWindow() {
        if (helpWindow) {
            helpWindow.show();
            helpWindow.active = true;
            return;
        }

        helpWindow = new Window(
            "palette",
            "GuideKeeper Help",
            undefined,
            { closeButton: true, resizeable: true }
        );
        helpWindow.orientation = "column";
        helpWindow.alignChildren = ["fill", "top"];
        helpWindow.spacing = 8;
        helpWindow.margins = 14;
        helpWindow.minimumSize = [390, 420];

        var heading = helpWindow.add("statictext", undefined, "GUIDEKEEPER HELP");
        applyAccentText(heading);

        addHelpSection(
            helpWindow,
            "Build Structure",
            "Creates the GuideKeeper folders and organises the project. If a complete structure exists, choose Rebuild Structure to run the full workflow again."
        );
        addHelpSection(
            helpWindow,
            "Clean Up Root",
            "Sorts newly imported root-level items into an existing GuideKeeper structure without reorganising content already inside folders."
        );
        addHelpSection(
            helpWindow,
            "Colour Code Current Comp",
            "Applies the GuideKeeper naming and layer-type label convention to layers in the active composition."
        );
        addHelpSection(
            helpWindow,
            "Reduce Project",
            "Confirms the resolved MASTER compositions, or selected compositions when no structure exists, before running After Effects' native Reduce Project command."
        );
        addHelpSection(
            helpWindow,
            "Selected folders and Rebuild",
            "Select composition folders before Build Structure, or before its Rebuild Structure choice. Their groups are placed in 01_COMPS/MASTER while footage is sorted and supported OVERLORD and matched AI/PSD imports are preserved."
        );

        helpWindow.onClose = function () {
            helpWindow = null;
        };
        helpWindow.onResizing = helpWindow.onResize = function () {
            this.layout.resize();
        };
        helpWindow.layout.layout(true);
        helpWindow.center();
        helpWindow.show();
    }

    function buildUI(thisObj) {
        var pal = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "GuideKeeper", undefined, { resizeable: true });

        if (!pal) return null;

        pal.orientation   = "column";
        pal.alignChildren = ["fill", "top"];
        pal.spacing = 6;
        pal.margins = 8;

        var header = pal.add("group");
        header.orientation = "row";
        header.alignChildren = ["fill", "center"];
        header.alignment = ["fill", "top"];
        var panelTitle = header.add("statictext", undefined, "GuideKeeper");
        panelTitle.alignment = ["fill", "center"];
        var helpButton = header.add("button", undefined, "?");
        helpButton.size = [28, 24];
        helpButton.alignment = ["right", "center"];
        helpButton.helpTip = "Open GuideKeeper Help.";
        helpButton.onClick = showHelpWindow;

        var actions = pal.add("group");
        actions.orientation = "row";
        actions.alignChildren = ["center", "center"];
        actions.alignment = ["fill", "fill"];
        actions.spacing = 6;

        function addBtn(label, helpTip, cb) {
            var btn = actions.add("button", undefined, label);
            btn.size = [150, 36];
            btn.helpTip = helpTip;
            btn.onClick = cb;
            return btn;
        }

        var buildButton = addBtn(
            "Build Structure",
            "Creates or rebuilds the GuideKeeper structure and organises selected composition groups.",
            function () { buildStructure(); }
        );
        addBtn(
            "Clean Up Root",
            "Sorts newly imported root-level items into an existing GuideKeeper structure.",
            function () { cleanUpRoot(); }
        );
        addBtn(
            "Colour Code Current Comp",
            "Applies GuideKeeper label colours to layers in the current composition.",
            function () { colourCodeLayers(); }
        );
        addBtn(
            "Reduce Project",
            "Keeps only assets used by MASTER compositions, or by manually selected compositions.",
            function () { reduceProject(); }
        );
        applyPrimaryButtonStyle(buildButton);

        // Threshold below which buttons switch from row → column.
        // ~650px fits 4 text buttons (150px each) side by side with spacing/margins.
        var ROW_THRESHOLD = 650;

        function applyOrientation() {
            var w = (pal.size && pal.size[0]) ? pal.size[0] : ROW_THRESHOLD + 1;
            var newOri = (w >= ROW_THRESHOLD) ? "row" : "column";
            if (actions.orientation !== newOri) {
                actions.orientation = newOri;
                pal.layout.layout(true);
            }
        }

        applyOrientation();
        pal.layout.layout(true);
        pal.onResizing = function () { this.layout.resize(); };
        pal.onResize   = function () { applyOrientation(); };

        if (pal instanceof Window) {
            pal.center();
            pal.show();
        }
        return pal;
    }

    // ── Helpers ──────────────────────────────────────────────────────

    function getFileExtension(item) {
        try {
            if (item.mainSource && item.mainSource.file) {
                var name = item.mainSource.file.name;
                var dot  = name.lastIndexOf(".");
                if (dot >= 0) return name.substring(dot + 1).toLowerCase();
            }
        } catch (e) {}
        var n   = item.name;
        var dot = n.lastIndexOf(".");
        return dot >= 0 ? n.substring(dot + 1).toLowerCase() : "";
    }

    function findChildFolder(parentFolder, name) {
        for (var i = 1; i <= parentFolder.numItems; i++) {
            var item = parentFolder.item(i);
            if (item instanceof FolderItem && item.name === name) return item;
        }
        return null;
    }

    // Find an existing subfolder by name, or create it inside parentFolder
    function findOrCreate(parentFolder, name) {
        var existing = findChildFolder(parentFolder, name);
        if (existing) return existing;
        var f = app.project.items.addFolder(name);
        f.parentFolder = parentFolder;
        return f;
    }

    function findCompByName(name) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var it = app.project.item(i);
            if (it instanceof CompItem && it.name === name) return it;
        }
        return null;
    }

    // Require at least 1 selected item, and every selected item must be a
    // CompItem or a FolderItem.
    function requireSelectedComps() {
        var proj = app.project;
        if (!proj) { alert("Please choose the main composition or a folder of compositions"); return null; }

        var sel = proj.selection;
        if (!sel || sel.length < 1) {
            alert("Please choose the main composition or a folder of compositions");
            return null;
        }
        for (var s = 0; s < sel.length; s++) {
            if (!(sel[s] instanceof CompItem) && !(sel[s] instanceof FolderItem)) {
                alert("Please choose the main composition or a folder of compositions");
                return null;
            }
            if (sel[s] instanceof FolderItem &&
                    collectCompsFromItems([sel[s]]).length === 0) {
                alert("Each selected folder must contain at least one composition.");
                return null;
            }
        }
        return sel;
    }

    // ── Naming prefixes — EDIT THESE to match your own convention ──────
    var PREFIX_TEXT       = "txt_";
    var PREFIX_BACKGROUND = "bg_";
    var PREFIX_PACKSHOT   = "packshot_";
    var PREFIX_LOGO       = "logo_";
    var PREFIX_NULL       = "null_";
    var PREFIX_ADJUSTMENT = "adj_";
    var PREFIX_VFX        = "vfx_"; // also covers "transitions", see header note
    var PREFIX_MASK       = "msk_";
    var PREFIX_SHAPE      = "shape_";
    var PREFIX_AUDIO      = "Audio_";
    var PREFIX_GUIDE      = "guide_";

    // Extra fragments treated as guide/safe-zone content alongside guide_
    var GUIDE_EXTRA_KEYWORDS = ["safe zone", "safezone", "safe-zone"];

    var VIDEO_EXTENSIONS = { mp4:1, mov:1, avi:1, wmv:1, mkv:1, webm:1 };
    var IMAGE_EXTENSIONS = { jpeg:1, jpg:1, png:1, gif:1, webp:1, svg:1,
                             tiff:1, tif:1, raw:1, bmp:1, ai:1, eps:1, cdr:1, psd:1 };
    var SOUND_EXTENSIONS = { mp3:1, aac:1, wav:1, flac:1, ogg:1, alac:1 };

    function nameStartsWith(name, prefix) {
        var lower = (name || "").toLowerCase();
        return lower.indexOf(prefix.toLowerCase()) === 0;
    }

    function nameContainsAny(name, keywords) {
        var lower = (name || "").toLowerCase();
        for (var i = 0; i < keywords.length; i++) {
            if (lower.indexOf(keywords[i].toLowerCase()) !== -1) return true;
        }
        return false;
    }

    function itemIsInList(item, items) {
        for (var i = 0; i < items.length; i++) {
            if (item === items[i]) return true;
        }
        return false;
    }

    function addUniqueItem(items, item) {
        if (!itemIsInList(item, items)) items.push(item);
    }

    function addUniqueName(names, name) {
        if (!name) return;
        for (var i = 0; i < names.length; i++) {
            if (names[i] === name) return;
        }
        names.push(name);
    }

    function folderIsDescendantOf(folder, possibleAncestor) {
        var parent = folder.parentFolder;
        while (parent && parent !== app.project.rootFolder) {
            if (parent === possibleAncestor) return true;
            parent = parent.parentFolder;
        }
        return false;
    }

    function keepTopLevelFolders(folders) {
        var topLevel = [];
        for (var i = 0; i < folders.length; i++) {
            var hasSelectedAncestor = false;
            for (var j = 0; j < folders.length; j++) {
                if (i !== j && folderIsDescendantOf(folders[i], folders[j])) {
                    hasSelectedAncestor = true;
                    break;
                }
            }
            if (!hasSelectedAncestor) topLevel.push(folders[i]);
        }
        return topLevel;
    }

    function normalizeAssetName(name) {
        return (name || "").replace(/^\s+|\s+$/g, "").toLowerCase();
    }

    function importedAssetBaseName(name) {
        var normalized = normalizeAssetName(name);
        if (normalized.substring(normalized.length - 3) === ".ai") {
            normalized = normalized.substring(0, normalized.length - 3);
        } else if (normalized.substring(normalized.length - 4) === ".psd") {
            normalized = normalized.substring(0, normalized.length - 4);
        }
        return normalizeAssetName(normalized);
    }

    function getImportedAssetBaseNames(item) {
        var ext = getFileExtension(item);
        if (ext !== "ai" && ext !== "psd") return [];

        var baseNames = [];
        addUniqueName(baseNames, importedAssetBaseName(item.name));

        // AE normally keeps the source file name even if its Project item is
        // renamed, so either basename can identify the sibling Layers folder.
        try {
            if (item.mainSource && item.mainSource.file) {
                addUniqueName(baseNames, importedAssetBaseName(item.mainSource.file.name));
            }
        } catch (e) {}
        return baseNames;
    }

    function isOverlordFolder(item) {
        return item instanceof FolderItem &&
            normalizeAssetName(item.name) === "overlord";
    }

    function folderMatchesImportedAsset(folder, baseNames) {
        if (!(folder instanceof FolderItem)) return false;
        var folderName = normalizeAssetName(folder.name);
        for (var i = 0; i < baseNames.length; i++) {
            if (folderName === baseNames[i] + " layers") return true;
        }
        return false;
    }

    // After Effects creates layered AI/PSD imports as sibling items such as
    // "Logo.ai" and "Logo Layers". Only that exact basename relationship is
    // preserved; a generic or unrelated Layers folder is not a companion.
    function createAssetPreservationPlan(items) {
        var plan = { imageItems: [] };
        var folders = [];
        var i;

        for (i = 0; i < items.length; i++) {
            if (!(items[i] instanceof FolderItem)) continue;
            folders.push(items[i]);
            if (isOverlordFolder(items[i])) {
                addUniqueItem(plan.imageItems, items[i]);
            }
        }

        for (i = 0; i < items.length; i++) {
            if (!(items[i] instanceof FootageItem)) continue;
            var baseNames = getImportedAssetBaseNames(items[i]);
            if (baseNames.length === 0) continue;

            var matched = false;
            for (var j = 0; j < folders.length; j++) {
                if (!folderMatchesImportedAsset(folders[j], baseNames)) continue;
                matched = true;
                addUniqueItem(plan.imageItems, folders[j]);
            }
            if (matched) addUniqueItem(plan.imageItems, items[i]);
        }
        return plan;
    }

    function createProjectStructure(root) {
        var structure = {};

        structure.comps       = findOrCreate(root, "01_COMPS");
        structure.master      = findOrCreate(structure.comps, "MASTER");
        structure.languages   = findOrCreate(structure.comps, "LANGUAGES");
        structure.precomps    = findOrCreate(structure.comps, "PRECOMPS");
        structure.pcText      = findOrCreate(structure.precomps, "TEXT");
        structure.pcPackshots = findOrCreate(structure.precomps, "PACKSHOTS");
        structure.pcLogos     = findOrCreate(structure.precomps, "LOGOS");
        structure.pcTrans     = findOrCreate(structure.precomps, "TRANSITIONS");
        structure.pcBg        = findOrCreate(structure.precomps, "BACKGROUNDS");
        structure.pcFx        = findOrCreate(structure.precomps, "FX");
        structure.pcUnsorted  = findOrCreate(structure.precomps, "UNSORTED");

        structure.assets      = findOrCreate(root, "02_ASSETS");
        structure.footage     = findOrCreate(structure.assets, "FOOTAGE");
        structure.images      = findOrCreate(structure.assets, "IMAGES");
        structure.audio       = findOrCreate(structure.assets, "AUDIO");
        structure.fonts       = findOrCreate(structure.assets, "FONTS");
        structure.asPackshots = findOrCreate(structure.assets, "PACKSHOTS");
        structure.asLogos     = findOrCreate(structure.assets, "LOGOS");
        structure.asUnsorted  = findOrCreate(structure.assets, "UNSORTED");

        structure.guides = findOrCreate(root, "03_GUIDES");
        structure.solids = findOrCreate(root, "SOLIDS");

        structure.folders = [
            structure.comps, structure.master, structure.languages, structure.precomps,
            structure.pcText, structure.pcPackshots, structure.pcLogos,
            structure.pcTrans, structure.pcBg, structure.pcFx, structure.pcUnsorted,
            structure.assets, structure.footage, structure.images, structure.audio, structure.fonts,
            structure.asPackshots, structure.asLogos, structure.asUnsorted,
            structure.guides, structure.solids
        ];

        return structure;
    }

    function findExistingProjectStructure(root) {
        var structure = {};

        structure.comps = findChildFolder(root, "01_COMPS");
        if (!structure.comps) return null;
        structure.master = findChildFolder(structure.comps, "MASTER");
        structure.languages = findChildFolder(structure.comps, "LANGUAGES");
        structure.precomps = findChildFolder(structure.comps, "PRECOMPS");
        if (!structure.master || !structure.languages || !structure.precomps) return null;

        structure.pcText = findChildFolder(structure.precomps, "TEXT");
        structure.pcPackshots = findChildFolder(structure.precomps, "PACKSHOTS");
        structure.pcLogos = findChildFolder(structure.precomps, "LOGOS");
        structure.pcTrans = findChildFolder(structure.precomps, "TRANSITIONS");
        structure.pcBg = findChildFolder(structure.precomps, "BACKGROUNDS");
        structure.pcFx = findChildFolder(structure.precomps, "FX");
        structure.pcUnsorted = findChildFolder(structure.precomps, "UNSORTED");
        if (!structure.pcText || !structure.pcPackshots || !structure.pcLogos ||
                !structure.pcTrans || !structure.pcBg || !structure.pcFx ||
                !structure.pcUnsorted) {
            return null;
        }

        structure.assets = findChildFolder(root, "02_ASSETS");
        if (!structure.assets) return null;
        structure.footage = findChildFolder(structure.assets, "FOOTAGE");
        structure.images = findChildFolder(structure.assets, "IMAGES");
        structure.audio = findChildFolder(structure.assets, "AUDIO");
        structure.fonts = findChildFolder(structure.assets, "FONTS");
        structure.asPackshots = findChildFolder(structure.assets, "PACKSHOTS");
        structure.asLogos = findChildFolder(structure.assets, "LOGOS");
        structure.asUnsorted = findChildFolder(structure.assets, "UNSORTED");
        if (!structure.footage || !structure.images || !structure.audio || !structure.fonts ||
                !structure.asPackshots || !structure.asLogos || !structure.asUnsorted) {
            return null;
        }

        structure.guides = findChildFolder(root, "03_GUIDES");
        structure.solids = findChildFolder(root, "SOLIDS");
        if (!structure.guides || !structure.solids) return null;

        structure.folders = [
            structure.comps, structure.master, structure.languages, structure.precomps,
            structure.pcText, structure.pcPackshots, structure.pcLogos,
            structure.pcTrans, structure.pcBg, structure.pcFx, structure.pcUnsorted,
            structure.assets, structure.footage, structure.images, structure.audio, structure.fonts,
            structure.asPackshots, structure.asLogos, structure.asUnsorted,
            structure.guides, structure.solids
        ];
        return structure;
    }

    function isStructuralItem(item, structure) {
        return itemIsInList(item, structure.folders);
    }

    function classifyFootageItem(item, structure) {
        if (item.mainSource instanceof SolidSource) return structure.solids;

        var ext = getFileExtension(item);
        if (VIDEO_EXTENSIONS[ext]) return structure.footage;
        if (IMAGE_EXTENSIONS[ext]) {
            if (nameStartsWith(item.name, PREFIX_PACKSHOT)) return structure.asPackshots;
            if (nameStartsWith(item.name, PREFIX_LOGO))     return structure.asLogos;
            return structure.images;
        }
        if (SOUND_EXTENSIONS[ext]) return structure.audio;
        return structure.asUnsorted;
    }

    function classifyCompItem(item, selectedCompIds, structure) {
        if (selectedCompIds[item.id]) {
            return structure.master;
        }
        if (nameStartsWith(item.name, PREFIX_GUIDE) || nameContainsAny(item.name, GUIDE_EXTRA_KEYWORDS)) {
            return structure.guides;
        }
        if (nameStartsWith(item.name, PREFIX_TEXT)) {
            return structure.pcText;
        }
        if (nameStartsWith(item.name, PREFIX_PACKSHOT)) {
            return structure.pcPackshots;
        }
        if (nameStartsWith(item.name, PREFIX_LOGO)) {
            return structure.pcLogos;
        }
        if (nameStartsWith(item.name, PREFIX_BACKGROUND)) {
            return structure.pcBg;
        }
        if (nameStartsWith(item.name, PREFIX_VFX)) {
            return structure.pcFx;
        }
        return structure.pcUnsorted;
    }

    function classifyProjectItem(item, selectedCompIds, structure) {
        if (item instanceof CompItem) {
            return classifyCompItem(item, selectedCompIds, structure);
        }
        if (item instanceof FootageItem) {
            return classifyFootageItem(item, structure);
        }
        return structure.asUnsorted;
    }

    function snapshotFolderItems(folder) {
        var items = [];
        for (var i = 1; i <= folder.numItems; i++) {
            items.push(folder.item(i));
        }
        return items;
    }

    function collectCompsFromItems(items) {
        var comps = [];

        function collectFromFolder(folder) {
            var children = snapshotFolderItems(folder);
            for (var i = 0; i < children.length; i++) {
                if (children[i] instanceof CompItem) {
                    addUniqueItem(comps, children[i]);
                } else if (children[i] instanceof FolderItem) {
                    collectFromFolder(children[i]);
                }
            }
        }

        for (var i = 0; i < items.length; i++) {
            if (items[i] instanceof CompItem) {
                addUniqueItem(comps, items[i]);
            } else if (items[i] instanceof FolderItem) {
                collectFromFolder(items[i]);
            }
        }
        return comps;
    }

    // Returns every comp discovered in the selected group hierarchy. The
    // caller currently needs only the mutations, while later operations can
    // reuse the discovery result without walking the hierarchy differently.
    function processSelectedGroupFolder(folder, structure, emptyFolderCandidates) {
        var masterComps = [];
        emptyFolderCandidates = emptyFolderCandidates || [];

        function processFolder(currentFolder) {
            var children = snapshotFolderItems(currentFolder);
            var preservationPlan = createAssetPreservationPlan(children);
            var extractedAsset = false;
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (itemIsInList(child, preservationPlan.imageItems)) {
                    child.parentFolder = structure.images;
                    extractedAsset = true;
                } else if (child instanceof FootageItem) {
                    child.parentFolder = classifyFootageItem(child, structure);
                    extractedAsset = true;
                } else if (child instanceof CompItem) {
                    child.label = 1;
                    masterComps.push(child);
                } else if (child instanceof FolderItem) {
                    if (processFolder(child)) {
                        addUniqueItem(emptyFolderCandidates, child);
                        extractedAsset = true;
                    }
                }
            }
            return extractedAsset;
        }

        processFolder(folder);
        return masterComps;
    }

    function snapshotRootItems(proj, root) {
        var items = [];
        for (var i = 1; i <= proj.numItems; i++) {
            var item = proj.item(i);
            if (item.parentFolder === root) {
                items.push(item);
            }
        }
        return items;
    }

    function processRootItems(root, items, selectedCompIds, structure, documentationComps, preservationPlan) {
        var plan = preservationPlan || createAssetPreservationPlan(items);
        for (var i = items.length - 1; i >= 0; i--) {
            var item = items[i];

            // Earlier selected-group processing can move an item from this
            // snapshot before the shared root pass reaches it.
            if (item.parentFolder !== root) continue;
            if (itemIsInList(item, documentationComps)) continue;
            if (isStructuralItem(item, structure)) continue;
            if (itemIsInList(item, plan.imageItems)) {
                item.parentFolder = structure.images;
                continue;
            }
            if (item instanceof FolderItem) {
                item.parentFolder = classifyProjectItem(item, selectedCompIds, structure);
                continue;
            }

            var target = classifyProjectItem(item, selectedCompIds, structure);
            if (item instanceof CompItem && selectedCompIds[item.id]) {
                item.label = 1;
            }
            item.parentFolder = target;
        }
    }

    function findDocumentationComps(root) {
        var documentationComps = [];
        for (var i = 1; i <= root.numItems; i++) {
            var item = root.item(i);
            if (item instanceof CompItem &&
                    (item.name === "!_README" || item.name === "!_WORKFLOW_GUIDE")) {
                documentationComps.push(item);
            }
        }
        return documentationComps;
    }

    function padTwoDigits(value) {
        return value < 10 ? "0" + value : String(value);
    }

    function formatDocumentationDate(now) {
        return now.getFullYear() + "-" +
            padTwoDigits(now.getMonth() + 1) + "-" +
            padTwoDigits(now.getDate());
    }

    function setDocumentationTextStyle(layer, text, font, fontSize, color, position) {
        var textProperties = layer.property("ADBE Text Properties");
        var sourceText = textProperties.property("ADBE Text Document");
        var textDocument = sourceText.value;
        textDocument.text = text;
        textDocument.font = font;
        textDocument.fontSize = fontSize;
        textDocument.applyFill = true;
        textDocument.fillColor = color;
        textDocument.applyStroke = false;
        sourceText.setValue(textDocument);

        layer.property("ADBE Transform Group")
            .property("ADBE Position")
            .setValue(position);
    }

    function cleanupDocumentationCreation(comp, backgroundSource) {
        var cleanupErrors = [];
        if (comp) {
            try {
                comp.remove();
            } catch (compCleanupError) {
                cleanupErrors.push("could not remove incomplete comp: " + compCleanupError.toString());
            }
        }
        if (backgroundSource) {
            try {
                backgroundSource.remove();
            } catch (solidCleanupError) {
                cleanupErrors.push("could not remove background source: " + solidCleanupError.toString());
            }
        }
        return cleanupErrors;
    }

    function createDocumentationComp(name, headerText, bodyText, bodyFontSize, bodyPosition, solidsFolder) {
        var comp = null;
        var backgroundSource = null;
        try {
            comp = app.project.items.addComp(name, 1250, 2160, 1, 10, 25);
            comp.bgColor = [0, 0, 0];

            var background = comp.layers.addSolid(
                [0, 0, 0],
                name + " BACKGROUND",
                1250,
                2160,
                1,
                comp.duration
            );
            backgroundSource = background.source;
            backgroundSource.parentFolder = solidsFolder;

            var body = comp.layers.addText(bodyText);
            body.name = "BODY";
            setDocumentationTextStyle(
                body,
                bodyText,
                "ArialMT",
                bodyFontSize,
                [1, 1, 1],
                bodyPosition
            );

            var header = comp.layers.addText(headerText);
            header.name = "HEADER";
            setDocumentationTextStyle(
                header,
                headerText,
                "Arial-BoldMT",
                48,
                [0, 1, 163 / 255],
                [60, 100]
            );
            return {
                comp: comp,
                backgroundSource: backgroundSource
            };
        } catch (creationError) {
            var cleanupErrors = cleanupDocumentationCreation(comp, backgroundSource);
            var message = "Could not create documentation comp '" + name + "': " +
                creationError.toString();
            if (cleanupErrors.length > 0) {
                message += " (" + cleanupErrors.join("; ") + ")";
            }
            throw new Error(message);
        }
    }

    function ensureDocumentationComp(root, solidsFolder, name, headerText, bodyText, bodyFontSize, bodyPosition, createdRecords, movedRecords) {
        var existing = findCompByName(name);
        if (existing) {
            if (existing.parentFolder !== root) {
                movedRecords.push({
                    comp: existing,
                    parentFolder: existing.parentFolder
                });
                existing.parentFolder = root;
            }
            return existing;
        }

        var creation = createDocumentationComp(
            name,
            headerText,
            bodyText,
            bodyFontSize,
            bodyPosition,
            solidsFolder
        );
        try {
            creation.comp.parentFolder = root;
        } catch (placementError) {
            var cleanupErrors = cleanupDocumentationCreation(
                creation.comp,
                creation.backgroundSource
            );
            var message = "Could not place documentation comp '" + name + "': " +
                placementError.toString();
            if (cleanupErrors.length > 0) {
                message += " (" + cleanupErrors.join("; ") + ")";
            }
            throw new Error(message);
        }
        createdRecords.push(creation);
        return creation.comp;
    }

    function createDocumentationComps(root, solidsFolder) {
        var dateStamp = formatDocumentationDate(new Date());
        var readmeText = [
            "PROJECT 1234567_PRODUCTNAME_CAMPAIGN_DATE",
            "",
            "CREATED BY MOTION DESIGNER NAME / AGENCY",
            "",
            "DATE " + dateStamp,
            "",
            "AE VERSION " + app.version,
            "",
            "DESCRIPTION CAMPAIGN DESCRIPTION. WHAT FORMATS. WHAT LANGUAGES. MULTILINGUAL ROLLOUT: EN / FR / NL / IT",
            "",
            "KEY COMPS",
            "",
            "FONTS ALL FONTS PROVIDED IN 02_ASSETS/FONTS",
            "",
            "PLUGINS / SCRIPTS OLIVER - TEXT ROLLOUT V1.0 (SCRIPTUI PANEL) NO THIRD-PARTY PLUGINS REQUIRED",
            "",
            "KNOWN ISSUES",
            "",
            "NOTES TEXT LAYERS ARE IN PRECOMPS (01_COMPS/PRECOMPS/TEXT/) SEE !_WORKFLOW_GUIDE COMP FOR NAMING RULES AND FULL INSTRUCTIONS."
        ].join("\r");

        var workflowGuideText = [
            "PROJECT TEMPLATE — REFERENCE V1.0",
            "",
            "HOW THIS PROJECT WORKS",
            "",
            "ALL TEXT LAYERS ARE IN PRECOMPS INSIDE 01_COMPS/PRECOMPS/TEXT/ EACH TEXT PRECOMP IS NAMED TXT_FIELDNAME (TXT_CTA, TXT_LEGAL, ETC.) EACH TEXT LAYER INSIDE MUST ALSO BE NAMED TXT_FIELDNAME MASTER COMPS REFERENCE THESE PRECOMPS — DO NOT PUT TEXT DIRECTLY IN MASTERS",
            "",
            "SWITCHING LANGUAGES",
            "",
            "METHOD 1 — CSV ROLLOUT PANEL (RECOMMENDED FOR BULK CHANGES) WINDOW > OLIVER - TEXT ROLLOUT SELECT LANGUAGE > CLICK ROLLOUT > ALL TEXTS UPDATE AT ONCE CSV FILE: DATA/TRANSLATIONS.CSV (ON DISK, NEXT TO THE .AEP)",
            "",
            "METHOD 2 — ESSENTIAL PROPERTIES (FOR QUICK SINGLE EDITS) IN A MASTER COMP, SELECT A TXT_ PRECOMP LAYER EDIT THE TEXT IN THE ESSENTIAL PROPERTIES PANEL",
            "",
            "ADDING A NEW TEXT FIELD",
            "CREATE A NEW PRECOMP: NAME IT TXT_YOURFIELD",
            "INSIDE, CREATE A TEXT LAYER: NAME IT TXT_YOURFIELD",
            "PLACE THE PRECOMP IN YOUR MASTER COMP(S)",
            "ADD A ROW IN TRANSLATIONS.CSV: YOURFIELD,EN TEXT,FR TEXT,...",
            "IN THE PRECOMP, OPEN ESSENTIAL GRAPHICS > ADD SOURCE TEXT",
            "",
            "ADDING A NEW LANGUAGE",
            "ADD A COLUMN IN TRANSLATIONS.CSV (E.G. ES, DE, PT)",
            "THE ROLLOUT PANEL DETECTS IT AUTOMATICALLY",
            "",
            "NAMING CONVENTION",
            "",
            "TXT_ = TEXT LAYERS (LABEL: RED) BG_ = BACKGROUNDS/FOOTAGE (LABEL: GREEN) LOGO_ = LOGOS (LABEL: SEA FOAM) PACKSHOT_ = PRODUCT SHOTS (LABEL: PEACH) ADJ_ = ADJUSTMENT LAYERS (LABEL: PURPLE) NULL_ = CONTROLLERS (LABEL: ORANGE) GUIDE_ = SAFE ZONES/GUIDES (LABEL: CYAN) AUDIO_ = AUDIO FILES (LABEL: YELLOW) SHAPE_ = SHAPE LAYERS (LABEL: PINK) VFX_ = EFFECTS/TRANSITIONS (LABEL: FUCHSIA) MSK_ = MASKS/MATTES (LABEL: BROWN)",
            "",
            "FOLDER STRUCTURE",
            "",
            "01_COMPS/MASTER/ = FINAL RENDER COMPS 01_COMPS/LANGUAGES/ = MANUAL LANGUAGE VERSIONS 01_COMPS/PRECOMPS/ = TEXT, PACKSHOTS, LOGOS, TRANSITIONS, BACKGROUNDS, FX, UNSORTED 02_ASSETS/ = FOOTAGE, IMAGES, AUDIO, FONTS, PACKSHOTS, LOGOS, UNSORTED 03_GUIDES/ = SAFE ZONE COMPS SOLIDS/ = NATIVE SOLID SOURCES DATA/TRANSLATIONS.CSV = ON DISK, NEXT TO THE .AEP",
            "",
            "QUESTIONS: DAVIDLEBRIS@INSIDEIDEAS.AGENCY"
        ].join("\r");

        var createdRecords = [];
        var movedRecords = [];
        try {
            var readmeComp = ensureDocumentationComp(
                root,
                solidsFolder,
                "!_README",
                "!_README",
                readmeText,
                24,
                [60, 180],
                createdRecords,
                movedRecords
            );
            var workflowGuideComp = ensureDocumentationComp(
                root,
                solidsFolder,
                "!_WORKFLOW_GUIDE",
                "!_WORKFLOW_GUIDE — HOW TO USE THIS TEMPLATE",
                workflowGuideText,
                15,
                [60, 200],
                createdRecords,
                movedRecords
            );

            return [readmeComp, workflowGuideComp];
        } catch (creationError) {
            var cleanupErrors = [];
            var i;
            for (i = createdRecords.length - 1; i >= 0; i--) {
                cleanupErrors = cleanupErrors.concat(cleanupDocumentationCreation(
                    createdRecords[i].comp,
                    createdRecords[i].backgroundSource
                ));
            }
            for (i = movedRecords.length - 1; i >= 0; i--) {
                try {
                    movedRecords[i].comp.parentFolder = movedRecords[i].parentFolder;
                } catch (moveCleanupError) {
                    cleanupErrors.push(
                        "could not restore existing comp '" +
                        movedRecords[i].comp.name + "': " +
                        moveCleanupError.toString()
                    );
                }
            }
            if (cleanupErrors.length > 0) {
                throw new Error(
                    creationError.toString() + " (" + cleanupErrors.join("; ") + ")"
                );
            }
            throw creationError;
        }
    }

    function labelMasterComps(masterFolder) {
        var children = snapshotFolderItems(masterFolder);
        for (var i = 0; i < children.length; i++) {
            var item = children[i];
            if (item instanceof CompItem) {
                item.label = 1;
            } else if (item instanceof FolderItem) {
                labelMasterComps(item);
            }
        }
    }

    function applyProjectItemLabels(structure) {
        for (var i = 0; i < structure.folders.length; i++) {
            structure.folders[i].label = 15;
        }
        labelMasterComps(structure.master);
    }

    function restoreProjectSelection(proj, selection) {
        var currentSelection = proj.selection;
        for (var i = 0; i < currentSelection.length; i++) {
            currentSelection[i].selected = false;
        }
        for (var j = 0; j < selection.length; j++) {
            selection[j].selected = true;
        }
    }

    // ── Button 1: Build Structure ─────────────────────────────────────

    function chooseExistingStructureAction() {
        var choice = "cancel";
        var dialog = new Window("dialog", "GuideKeeper");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.spacing = 10;
        dialog.margins = 16;
        dialog.add("statictext", undefined,
            "Existing GuideKeeper structure detected.\n\nWhat would you like to do?");

        var buttons = dialog.add("group");
        buttons.orientation = "row";
        var rebuildButton = buttons.add("button", undefined, "Rebuild Structure");
        var cleanupButton = buttons.add("button", undefined, "Clean Up Root");
        var cancelButton = buttons.add("button", undefined, "Cancel");

        rebuildButton.onClick = function () {
            choice = "rebuild";
            dialog.close();
        };
        cleanupButton.onClick = function () {
            choice = "cleanup";
            dialog.close();
        };
        cancelButton.onClick = function () {
            dialog.close();
        };

        dialog.defaultElement = cleanupButton;
        dialog.cancelElement = cancelButton;
        dialog.center();
        dialog.show();
        return choice;
    }

    function buildStructure() {
        var proj = app.project;
        if (proj) {
            var existingStructure = findExistingProjectStructure(proj.rootFolder);
            if (existingStructure) {
                var action = chooseExistingStructureAction();
                if (action === "cancel") return;
                if (action === "cleanup") {
                    cleanUpRoot(existingStructure);
                    return;
                }
            }
        }

        performFullBuild();
    }

    function performFullBuild() {
        var proj = app.project;
        var sel  = requireSelectedComps();
        if (!sel) return;

        var selectedCompIds      = {};
        var selectedGroupFolders = [];
        for (var s = 0; s < sel.length; s++) {
            if (sel[s] instanceof CompItem) {
                selectedCompIds[sel[s].id] = true;
            } else if (sel[s] instanceof FolderItem) {
                selectedGroupFolders.push(sel[s]);
            }
        }
        selectedGroupFolders = keepTopLevelFolders(selectedGroupFolders);

        app.beginUndoGroup("Build Structure");
        try {
            var root = proj.rootFolder;
            var structure = createProjectStructure(root);

            var documentationComps = createDocumentationComps(root, structure.solids);

            // Plan root-level preserved groups before selected folders move.
            // This also prevents a selected Layers/OVERLORD folder from being
            // treated as a composition group and relocated into MASTER.
            var snapshot = snapshotRootItems(proj, root);
            var rootPreservationPlan = createAssetPreservationPlan(snapshot);
            var emptyFolderCandidates = [];

            // Process any selected group folders FIRST, so the main sort
            // loop below (root-level items only) never encounters them,
            // they've already been relocated into MASTER by this point.
            for (var gf = 0; gf < selectedGroupFolders.length; gf++) {
                var groupFolder = selectedGroupFolders[gf];
                if (isStructuralItem(groupFolder, structure)) continue;
                if (itemIsInList(groupFolder, rootPreservationPlan.imageItems)) {
                    groupFolder.parentFolder = structure.images;
                    continue;
                }
                processSelectedGroupFolder(
                    groupFolder,
                    structure,
                    emptyFolderCandidates
                );
                groupFolder.parentFolder = structure.master;
            }

            // Sort items. Processed in reverse (see header note on
            // ordering): assuming After Effects inserts reparented items
            // at the top of their destination folder, reverse processing
            // should keep the final order close to the original.
            processRootItems(
                root,
                snapshot,
                selectedCompIds,
                structure,
                documentationComps,
                rootPreservationPlan
            );

            removeEmptyUserFolders(emptyFolderCandidates);

            applyProjectItemLabels(structure);

            // Reveal: clear only whatever is currently selected, not the
            // whole project (that was expanding every folder as a side
            // effect), then reselect exactly what was chosen at the start.
            restoreProjectSelection(proj, sel);

        } catch (e) {
            var message = "Error: " + e.toString();
            try {
                restoreProjectSelection(proj, sel);
            } catch (selectionError) {
                message += "\nCould not restore the original selection: " +
                    selectionError.toString();
            }
            alert(message);
        } finally {
            app.endUndoGroup();
        }
    }

    // ── Button 2: Clean Up Root ───────────────────────────────────────

    function cleanUpRoot(existingStructure) {
        var proj = app.project;
        if (!proj) {
            alert("No GuideKeeper structure detected. Build Structure first.");
            return;
        }

        var structure = existingStructure || findExistingProjectStructure(proj.rootFolder);
        if (!structure) {
            alert("No GuideKeeper structure detected. Build Structure first.");
            return;
        }

        var selection = proj.selection;
        app.beginUndoGroup("Clean Up Root");
        try {
            var snapshot = snapshotRootItems(proj, proj.rootFolder);
            processRootItems(
                proj.rootFolder,
                snapshot,
                {},
                structure,
                findDocumentationComps(proj.rootFolder)
            );
            applyProjectItemLabels(structure);
            restoreProjectSelection(proj, selection);
        } catch (e) {
            alert("Error: " + e.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // ── Remove empty user folders ────────────────────────────────────
    // Removes only nested folders that this build actually emptied while
    // extracting assets from selected composition groups. Candidates are
    // recorded deepest-first, so parents can become empty safely in one pass.

    function removeEmptyUserFolders(emptyFolderCandidates) {
        for (var i = 0; i < emptyFolderCandidates.length; i++) {
            var folder = emptyFolderCandidates[i];
            if (folder.numItems === 0) {
                folder.remove();
            }
        }
    }

    // ── Button 3: Colour Code Current Comp ────────────────────────────
    // Applies label colours to every layer in the CURRENT comp only.

    function colourCodeLayers() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Open a composition first.");
            return;
        }

        app.beginUndoGroup("Colour Code Current Comp");
        try {
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);
                layer.label = labelForLayer(layer);
            }
        } catch (e) {
            alert("Error: " + e.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // Label numbers are After Effects' default label palette (Edit >
    // Preferences > Labels): 1 Red, 2 Yellow, 3 Aqua, 4 Pink, 5 Lavender,
    // 6 Peach, 7 Sea Foam, 8 Blue, 9 Green, 10 Purple, 11 Orange, 12 Brown,
    // 13 Fuchsia, 14 Cyan, 15 Sandstone. If anyone's local prefs have been
    // customised, these numbers may render as different names/colours on
    // their machine.
    function labelForLayer(layer) {
        var name = layer.name || "";

        if (nameStartsWith(name, PREFIX_TEXT))       return 1;  // Red - Text
        if (nameStartsWith(name, PREFIX_AUDIO))      return 2;  // Yellow - Audio
        if (nameStartsWith(name, PREFIX_SHAPE))      return 4;  // Pink - Shape
        if (nameStartsWith(name, PREFIX_PACKSHOT))   return 6;  // Peach - Packshots
        if (nameStartsWith(name, PREFIX_LOGO))       return 7;  // Sea Foam - Logos
        if (nameStartsWith(name, PREFIX_BACKGROUND)) return 9;  // Green - Footage/media
        if (nameStartsWith(name, PREFIX_ADJUSTMENT)) return 10; // Purple - Adjustment
        if (nameStartsWith(name, PREFIX_NULL))       return 11; // Orange - Nulls/controllers
        if (nameStartsWith(name, PREFIX_MASK))       return 12; // Brown - Masks/mattes
        if (nameStartsWith(name, PREFIX_VFX))        return 13; // Fuchsia - VFX/transitions
        if (nameStartsWith(name, PREFIX_GUIDE))      return 14; // Cyan - Guides/safe zones

        if (layer instanceof LightLayer)             return 3;  // Aqua - Light
        if (layer instanceof CameraLayer)            return 5;  // Lavender - Camera
        if (layer.source instanceof CompItem)        return 8;  // Blue - Precomp

        return 0; // None: doesn't follow the naming convention, left unlabeled on purpose
    }

    // ── Button 4: Reduce Project ──────────────────────────────────────

    function reduceProjectConfirmation(comps, usingStructure) {
        var source = usingStructure
            ? "the compositions in 01_COMPS/MASTER"
            : "the selected compositions";
        var noun = comps.length === 1 ? "composition" : "compositions";
        var lines = [
            "Reduce Project will keep only assets used by " + source + ".",
            "",
            comps.length + " " + noun + ":"
        ];
        var shown = Math.min(comps.length, 8);
        for (var i = 0; i < shown; i++) {
            lines.push("- " + comps[i].name);
        }
        if (comps.length > shown) {
            lines.push("- ...and " + (comps.length - shown) + " more");
        }
        lines.push("", "Reduce the project based on " + (comps.length === 1 ? "this composition?" : "these compositions?"));
        return lines.join("\n");
    }

    function reduceProject() {
        var proj = app.project;
        if (!proj) {
            alert("Open a project before using Reduce Project.");
            return;
        }

        var originalSelection = proj.selection;
        var structure = findExistingProjectStructure(proj.rootFolder);
        var comps;
        if (structure) {
            comps = collectCompsFromItems([structure.master]);
            if (comps.length === 0) {
                alert("GuideKeeper structure detected, but no compositions were found in 01_COMPS/MASTER. Add at least one MASTER composition before using Reduce Project.");
                return;
            }
        } else {
            var selection = proj.selection;
            if (!selection || selection.length === 0) {
                alert("Select one or more compositions, or folders containing compositions, before using Reduce Project.");
                return;
            }
            for (var i = 0; i < selection.length; i++) {
                if (!(selection[i] instanceof CompItem) && !(selection[i] instanceof FolderItem)) {
                    alert("Select only compositions or folders containing compositions before using Reduce Project.");
                    return;
                }
            }
            comps = collectCompsFromItems(selection);
            if (comps.length === 0) {
                alert("No compositions were found in the current selection. Select a composition or a folder containing compositions.");
                return;
            }
        }

        if (!confirm(reduceProjectConfirmation(comps, !!structure))) return;

        var selectionMayHaveChanged = false;
        try {
            var reduceId = app.findMenuCommandId("Reduce Project");
            if (!reduceId || reduceId === 0) {
                alert("Cannot find 'Reduce Project' command.");
                return;
            }

            selectionMayHaveChanged = true;
            restoreProjectSelection(proj, comps);
            app.executeCommand(reduceId);
        } catch (e) {
            var message = "Error executing 'Reduce Project':\n" + e.toString();
            if (selectionMayHaveChanged) {
                try {
                    restoreProjectSelection(proj, originalSelection);
                } catch (selectionError) {
                    message += "\nCould not restore the original selection: " +
                        selectionError.toString();
                }
            }
            alert(message);
        }
    }

    // ── Launch ───────────────────────────────────────────────────────

    buildUI(thisObj);

})(this);
