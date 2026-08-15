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
//   !_README            <- auto-filled template
//   !_WORKFLOW_GUIDE     <- placeholder, needs a real visual summary
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
// Code Layers sets on layers).
//
// ── Colour Code Layers ──────────────────────────────────────────────
// Applies label colours to every layer in the CURRENT comp, per the
// prefix/colour table below.

(function GuideKeeper(thisObj) {

    // ── UI ───────────────────────────────────────────────────────────

    function buildUI(thisObj) {
        var pal = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "GuideKeeper", undefined, { resizeable: true });

        if (!pal) return null;

        pal.orientation   = "row";
        pal.alignChildren = ["center", "center"];
        pal.spacing = 6;
        pal.margins = 8;

        function addBtn(label, cb) {
            var btn = pal.add("button", undefined, label);
            btn.size = [150, 36];
            btn.onClick = cb;
            return btn;
        }

        addBtn("Build Structure",      function () { buildStructure();   });
        addBtn("Clean up the root",    function () { cleanUpRoot();      });
        addBtn("Colour Code Layers",   function () { colourCodeLayers(); });
        addBtn("Reduce Project",       function () { reduceProject();    });
        addBtn("Collect files",        function () { collectFiles();     });

        // Threshold below which buttons switch from row → column.
        // ~800px fits 5 text buttons (150px each) side by side with spacing/margins.
        var ROW_THRESHOLD = 800;

        function applyOrientation() {
            var w = (pal.size && pal.size[0]) ? pal.size[0] : ROW_THRESHOLD + 1;
            var newOri = (w >= ROW_THRESHOLD) ? "row" : "column";
            if (pal.orientation !== newOri) {
                pal.orientation = newOri;
                pal.layout.layout(true);
            }
        }

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

    // Find an existing comp by exact name anywhere in the project, or
    // create it with the given settings and one text layer pre-filled
    // with initialText. Never overwrites an existing comp's content.
    function findOrCreateComp(name, width, height, duration, frameRate, initialText) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var it = app.project.item(i);
            if (it instanceof CompItem && it.name === name) return it;
        }
        var comp = app.project.items.addComp(name, width, height, 1, duration, frameRate);
        comp.layers.addText(initialText);
        return comp;
    }

    // Require at least 1 selected item, and every selected item must be a
    // CompItem or a FolderItem. Shared by "Build Structure" and
    // "Reduce Project".
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
        var plan = { imageItems: [], groupFolders: [] };
        var folders = [];
        var i;

        for (i = 0; i < items.length; i++) {
            if (!(items[i] instanceof FolderItem)) continue;
            folders.push(items[i]);
            if (isOverlordFolder(items[i])) {
                addUniqueItem(plan.imageItems, items[i]);
                addUniqueItem(plan.groupFolders, items[i]);
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
                addUniqueItem(plan.groupFolders, folders[j]);
            }
            if (matched) addUniqueItem(plan.imageItems, items[i]);
        }
        return plan;
    }

    function collectPreservedGroupFolders(proj) {
        var containers = [proj.rootFolder];
        var preserved = [];
        var i;

        for (i = 1; i <= proj.numItems; i++) {
            var item = proj.item(i);
            if (item instanceof FolderItem) containers.push(item);
        }
        for (i = 0; i < containers.length; i++) {
            var plan = createAssetPreservationPlan(snapshotFolderItems(containers[i]));
            for (var j = 0; j < plan.groupFolders.length; j++) {
                addUniqueItem(preserved, plan.groupFolders[j]);
            }
        }
        return preserved;
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
        structure.asPackshots = findOrCreate(structure.assets, "PACKSHOTS");
        structure.asLogos     = findOrCreate(structure.assets, "LOGOS");
        structure.asUnsorted  = findOrCreate(structure.assets, "UNSORTED");

        structure.guides = findOrCreate(root, "03_GUIDES");
        structure.solids = findOrCreate(root, "SOLIDS");

        structure.folders = [
            structure.comps, structure.master, structure.languages, structure.precomps,
            structure.pcText, structure.pcPackshots, structure.pcLogos,
            structure.pcTrans, structure.pcBg, structure.pcFx, structure.pcUnsorted,
            structure.assets, structure.footage, structure.images, structure.audio,
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
        structure.asPackshots = findChildFolder(structure.assets, "PACKSHOTS");
        structure.asLogos = findChildFolder(structure.assets, "LOGOS");
        structure.asUnsorted = findChildFolder(structure.assets, "UNSORTED");
        if (!structure.footage || !structure.images || !structure.audio ||
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
            structure.assets, structure.footage, structure.images, structure.audio,
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

    // Returns every comp discovered in the selected group hierarchy. The
    // caller currently needs only the mutations, while later operations can
    // reuse the discovery result without walking the hierarchy differently.
    function processSelectedGroupFolder(folder, structure) {
        var masterComps = [];

        function processFolder(currentFolder) {
            var children = snapshotFolderItems(currentFolder);
            var preservationPlan = createAssetPreservationPlan(children);
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (itemIsInList(child, preservationPlan.imageItems)) {
                    child.parentFolder = structure.images;
                } else if (child instanceof FootageItem) {
                    child.parentFolder = classifyFootageItem(child, structure);
                } else if (child instanceof CompItem) {
                    child.label = 1;
                    masterComps.push(child);
                } else if (child instanceof FolderItem) {
                    processFolder(child);
                }
            }
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

    function createDocumentationComps(root, masterComp) {
        var w   = masterComp ? masterComp.width     : 1920;
        var h   = masterComp ? masterComp.height    : 1080;
        var dur = masterComp ? masterComp.duration  : 10;
        var fr  = masterComp ? masterComp.frameRate : 25;

        var monthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
        var now = new Date();
        var dateStamp = monthNames[now.getMonth()] + now.getFullYear();

        var readmeText =
            "PROJECT: [Job number]_[CLIENT]_[PROJECT]\r" +
            "CREATED BY: [Name/Agency] | DATE: " + dateStamp + " | AE VERSION: " + app.version + "\r" +
            "DESCRIPTION: [What the project delivers]\r" +
            "KEY COMPS: [List deliverables]\r" +
            "FONTS: [All fonts used in this project]\r" +
            "PLUGINS / SCRIPTS: [Name + version, provided in project folder]\r" +
            "KNOWN ISSUES: [Or None] | NOTES: [What to do, what not to touch]";
        var readmeComp = findOrCreateComp("!_README", w, h, dur, fr, readmeText);
        readmeComp.parentFolder = root;

        var guideText =
            "WORKFLOW GUIDE\r" +
            "(Replace with a visual summary: folder structure, multilingual rollout, where to find things.)";
        var workflowGuideComp = findOrCreateComp("!_WORKFLOW_GUIDE", w, h, dur, fr, guideText);
        workflowGuideComp.parentFolder = root;

        return [readmeComp, workflowGuideComp];
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

        app.beginUndoGroup("Build Structure");
        try {
            var root = proj.rootFolder;
            var structure = createProjectStructure(root);

            var masterComp = null;
            for (var mc = 0; mc < sel.length; mc++) {
                if (sel[mc] instanceof CompItem) { masterComp = sel[mc]; break; }
            }
            var documentationComps = createDocumentationComps(root, masterComp);

            // Plan root-level preserved groups before selected folders move.
            // This also prevents a selected Layers/OVERLORD folder from being
            // treated as a composition group and relocated into MASTER.
            var snapshot = snapshotRootItems(proj, root);
            var rootPreservationPlan = createAssetPreservationPlan(snapshot);

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
                processSelectedGroupFolder(groupFolder, structure);
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

            removeEmptyUserFolders(
                structure.folders,
                collectPreservedGroupFolders(proj)
            );

            applyProjectItemLabels(structure);

            // Reveal: clear only whatever is currently selected, not the
            // whole project (that was expanding every folder as a side
            // effect), then reselect exactly what was chosen at the start.
            restoreProjectSelection(proj, sel);

        } catch (e) {
            alert("Error: " + e.toString());
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
    // Deletes empty FolderItems that are NOT part of our structure above.
    // Runs in a loop so nested empty user folders get cleaned up too.
    // Checks the full project on every pass (not just root-level), since
    // an empty folder can turn up at any depth once its contents are
    // extracted.

    function removeEmptyUserFolders(structural, preservedGroups) {
        var changed = true;
        while (changed) {
            changed = false;
            var snap = [];
            for (var i = 1; i <= app.project.numItems; i++) {
                snap.push(app.project.item(i));
            }
            for (var j = 0; j < snap.length; j++) {
                var folder = snap[j];
                if (!(folder instanceof FolderItem)) continue;
                if (itemIsInList(folder, structural)) continue; // keep our structure
                if (itemIsInList(folder, preservedGroups)) continue;
                if (folder.numItems === 0) {
                    folder.remove();
                    changed = true;
                }
            }
        }
    }

    // ── Button 3: Colour Code Layers ──────────────────────────────────
    // Applies label colours to every layer in the CURRENT comp only.

    function colourCodeLayers() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Open a composition first.");
            return;
        }

        app.beginUndoGroup("Colour Code Layers");
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

    function reduceProject() {
        var sel = requireSelectedComps();
        if (!sel) return;

        app.beginUndoGroup("Reduce Project");
        try {
            var reduceId = app.findMenuCommandId("Reduce Project");
            if (reduceId && reduceId !== 0) {
                app.executeCommand(reduceId);
            } else {
                alert("Cannot find 'Reduce Project' command.");
            }
        } catch (e) {
            alert("Error executing 'Reduce Project':\n" + e.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // ── Button 5: Collect Files ───────────────────────────────────────

    function collectFiles() {
        if (!app.project) return;
        try {
            var id = app.findMenuCommandId("Collect Files...");
            if (!id || id === 0) id = app.findMenuCommandId("Collect Files");
            if (id && id !== 0) {
                app.executeCommand(id);
            } else {
                alert("Cannot find 'Collect Files...' command.");
            }
        } catch (e) {
            alert("Error executing 'Collect Files...':\n" + e.toString());
        }
    }

    // ── Launch ───────────────────────────────────────────────────────

    buildUI(thisObj);

})(this);
