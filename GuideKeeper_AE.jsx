(function guideKeeperPanel(thisObj) {
    var PANEL_NAME = "GuideKeeper AE";
    var SCRIPT_VERSION = "1.0.0";
    var LABEL_RED = 1;
    var LABEL_SANDSTONE = 15;
    var VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "wmv", "mkv", "webm"];
    var IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "tif", "tiff", "psd", "ai", "eps", "bmp", "exr"];
    var AUDIO_EXTENSIONS = ["mp3", "aac", "wav", "flac", "ogg", "alac"];
    var DOCUMENT_README = "!_README";
    var DOCUMENT_WORKFLOW = "!_WORKFLOW_GUIDE";
    var RESERVED_FOLDER_PATHS = [
        "01_COMPS", "01_COMPS/MASTER", "01_COMPS/LANGUAGES", "01_COMPS/PRECOMPS",
        "01_COMPS/PRECOMPS/TEXT", "01_COMPS/PRECOMPS/PACKSHOTS", "01_COMPS/PRECOMPS/LOGOS",
        "01_COMPS/PRECOMPS/TRANSITIONS", "01_COMPS/PRECOMPS/BACKGROUNDS",
        "01_COMPS/PRECOMPS/FX", "01_COMPS/PRECOMPS/UNSORTED",
        "02_ASSETS", "02_ASSETS/FOOTAGE", "02_ASSETS/IMAGES", "02_ASSETS/AUDIO",
        "02_ASSETS/PACKSHOTS", "02_ASSETS/LOGOS", "02_ASSETS/UNSORTED", "03_GUIDES", "SOLIDS"
    ];
    function snapshotArray(values) {
        var result = [];
        var i;

        for (i = 0; i < values.length; i += 1) {
            result.push(values[i]);
        }

        return result;
    }

    function snapshotProjectItems() {
        var result = [];
        var i;

        for (i = 1; i <= app.project.numItems; i += 1) {
            result.push(app.project.item(i));
        }

        return result;
    }

    function snapshotFolderItems(folder) {
        var result = [];
        var i;

        for (i = 1; i <= folder.numItems; i += 1) {
            result.push(folder.item(i));
        }

        return result;
    }

    function containsItem(items, item) {
        var i;

        for (i = 0; i < items.length; i += 1) {
            if (items[i] === item) {
                return true;
            }
        }

        return false;
    }

    function nameStartsWith(itemName, prefix) {
        return String(itemName).toLowerCase().indexOf(prefix.toLowerCase()) === 0;
    }

    function nameContainsAny(itemName, fragments) {
        var lowerName = String(itemName).toLowerCase();
        var i;

        for (i = 0; i < fragments.length; i += 1) {
            if (lowerName.indexOf(fragments[i].toLowerCase()) !== -1) {
                return true;
            }
        }

        return false;
    }

    function extensionIn(extension, extensions) {
        var i;

        for (i = 0; i < extensions.length; i += 1) {
            if (extensions[i] === extension) {
                return true;
            }
        }

        return false;
    }

    function getFileExtension(item) {
        var file;
        var fileName;
        var dotIndex;

        // Generated and missing footage can legitimately have no File object.
        try {
            file = item.mainSource.file;
        } catch (error) {
            return "";
        }

        if (!file) {
            return "";
        }

        fileName = String(file.name).toLowerCase();
        dotIndex = fileName.lastIndexOf(".");
        return dotIndex === -1 ? "" : fileName.substring(dotIndex + 1);
    }

    function isInsideFolder(item, folder) {
        var parent = item.parentFolder;

        while (parent && parent !== app.project.rootFolder) {
            if (parent === folder) {
                return true;
            }
            parent = parent.parentFolder;
        }

        return false;
    }

    function projectFolderPath(folder) {
        var path = "";
        var parent = folder;

        while (parent && parent !== app.project.rootFolder) {
            path = parent.name + (path ? "/" + path : "");
            parent = parent.parentFolder;
        }

        return path;
    }

    function isReservedStructureFolder(folder) {
        var folderPath = projectFolderPath(folder);
        var i;

        for (i = 0; i < RESERVED_FOLDER_PATHS.length; i += 1) {
            if (RESERVED_FOLDER_PATHS[i] === folderPath) {
                return true;
            }
        }

        return false;
    }

    function findChildFolder(parentFolder, name) {
        var children = snapshotFolderItems(parentFolder);
        var i;

        for (i = 0; i < children.length; i += 1) {
            if (children[i] instanceof FolderItem && children[i].name === name) {
                return children[i];
            }
        }

        return null;
    }

    function findOrCreateFolder(parentFolder, name) {
        var folder = findChildFolder(parentFolder, name);

        if (!folder) {
            folder = app.project.items.addFolder(name);
            folder.parentFolder = parentFolder;
        }

        return folder;
    }

    function createStructure() {
        var root = app.project.rootFolder;
        var comps = findOrCreateFolder(root, "01_COMPS");
        var master = findOrCreateFolder(comps, "MASTER");
        var languages = findOrCreateFolder(comps, "LANGUAGES");
        var precomps = findOrCreateFolder(comps, "PRECOMPS");
        var text = findOrCreateFolder(precomps, "TEXT");
        var compPackshots = findOrCreateFolder(precomps, "PACKSHOTS");
        var compLogos = findOrCreateFolder(precomps, "LOGOS");
        var transitions = findOrCreateFolder(precomps, "TRANSITIONS");
        var backgrounds = findOrCreateFolder(precomps, "BACKGROUNDS");
        var effects = findOrCreateFolder(precomps, "FX");
        var compUnsorted = findOrCreateFolder(precomps, "UNSORTED");
        var assets = findOrCreateFolder(root, "02_ASSETS");
        var footage = findOrCreateFolder(assets, "FOOTAGE");
        var images = findOrCreateFolder(assets, "IMAGES");
        var audio = findOrCreateFolder(assets, "AUDIO");
        var assetPackshots = findOrCreateFolder(assets, "PACKSHOTS");
        var assetLogos = findOrCreateFolder(assets, "LOGOS");
        var assetUnsorted = findOrCreateFolder(assets, "UNSORTED");
        var guides = findOrCreateFolder(root, "03_GUIDES");
        var solids = findOrCreateFolder(root, "SOLIDS");

        return {
            master: master,
            languages: languages,
            text: text,
            compPackshots: compPackshots,
            compLogos: compLogos,
            transitions: transitions,
            backgrounds: backgrounds,
            effects: effects,
            compUnsorted: compUnsorted,
            footage: footage,
            images: images,
            audio: audio,
            assetPackshots: assetPackshots,
            assetLogos: assetLogos,
            assetUnsorted: assetUnsorted,
            guides: guides,
            solids: solids
        };
    }

    function findFirstCompInFolder(folder) {
        var children = snapshotFolderItems(folder);
        var found;
        var i;

        for (i = 0; i < children.length; i += 1) {
            if (children[i] instanceof CompItem) {
                return children[i];
            }
            if (children[i] instanceof FolderItem) {
                found = findFirstCompInFolder(children[i]);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    function firstResolvedComp(selection) {
        var found;
        var i;

        for (i = 0; i < selection.length; i += 1) {
            if (selection[i] instanceof CompItem) {
                return selection[i];
            }
            found = findFirstCompInFolder(selection[i]);
            if (found) {
                return found;
            }
        }

        return null;
    }

    function validateBuildSelection(selection) {
        var i;

        if (selection.length === 0) {
            alert("Select one or more compositions or folders containing compositions, then run Build Structure again.");
            return false;
        }

        for (i = 0; i < selection.length; i += 1) {
            if (!(selection[i] instanceof CompItem) && !(selection[i] instanceof FolderItem)) {
                alert("Build Structure accepts only compositions and folders. Remove other item types from the selection and try again.");
                return false;
            }
            if (selection[i] instanceof FolderItem && isReservedStructureFolder(selection[i])) {
                alert("Do not select GuideKeeper structure folders. Select the working folder or composition inside '" +
                    selection[i].name + "' instead.");
                return false;
            }
            if (selection[i] instanceof FolderItem && !findFirstCompInFolder(selection[i])) {
                alert("Every selected folder must contain at least one composition. Check '" + selection[i].name + "' and try again.");
                return false;
            }
        }

        return true;
    }

    function effectiveSelectedFolders(selection) {
        var folders = [];
        var result = [];
        var candidate;
        var nested;
        var i;
        var j;

        for (i = 0; i < selection.length; i += 1) {
            if (selection[i] instanceof FolderItem) {
                folders.push(selection[i]);
            }
        }

        for (i = 0; i < folders.length; i += 1) {
            candidate = folders[i];
            nested = false;
            for (j = 0; j < folders.length; j += 1) {
                if (i !== j && isInsideFolder(candidate, folders[j])) {
                    nested = true;
                    break;
                }
            }
            if (!nested) {
                result.push(candidate);
            }
        }

        return result;
    }

    function effectiveSelectedComps(selection, selectedFolders) {
        var result = [];
        var insideSelectedFolder;
        var i;
        var j;

        for (i = 0; i < selection.length; i += 1) {
            if (!(selection[i] instanceof CompItem)) {
                continue;
            }
            insideSelectedFolder = false;
            for (j = 0; j < selectedFolders.length; j += 1) {
                if (isInsideFolder(selection[i], selectedFolders[j])) {
                    insideSelectedFolder = true;
                    break;
                }
            }
            if (!insideSelectedFolder) {
                result.push(selection[i]);
            }
        }

        return result;
    }

    function destinationForComp(comp, selectedComps, destinations) {
        if (containsItem(selectedComps, comp)) {
            return destinations.master;
        }
        if (nameStartsWith(comp.name, "guide_") ||
                nameContainsAny(comp.name, ["safe zone", "safezone", "safe-zone"])) {
            return destinations.guides;
        }
        if (nameStartsWith(comp.name, "txt_")) {
            return destinations.text;
        }
        if (nameStartsWith(comp.name, "packshot_")) {
            return destinations.compPackshots;
        }
        if (nameStartsWith(comp.name, "logo_")) {
            return destinations.compLogos;
        }
        if (nameStartsWith(comp.name, "bg_")) {
            return destinations.backgrounds;
        }
        if (nameStartsWith(comp.name, "vfx_")) {
            return destinations.effects;
        }
        return destinations.compUnsorted;
    }

    function destinationForFootage(item, destinations) {
        var extension;

        if (item.mainSource instanceof SolidSource) {
            return destinations.solids;
        }

        extension = getFileExtension(item);
        if (extensionIn(extension, VIDEO_EXTENSIONS)) {
            return destinations.footage;
        }
        if (extensionIn(extension, IMAGE_EXTENSIONS) && nameStartsWith(item.name, "packshot_")) {
            return destinations.assetPackshots;
        }
        if (extensionIn(extension, IMAGE_EXTENSIONS) && nameStartsWith(item.name, "logo_")) {
            return destinations.assetLogos;
        }
        if (extensionIn(extension, IMAGE_EXTENSIONS)) {
            return destinations.images;
        }
        if (extensionIn(extension, AUDIO_EXTENSIONS)) {
            return destinations.audio;
        }
        return destinations.assetUnsorted;
    }

    function processSelectedFolder(folder, destinations) {
        var children = snapshotFolderItems(folder);
        var child;
        var extracted = false;
        var childExtracted;
        var i;

        for (i = 0; i < children.length; i += 1) {
            child = children[i];
            if (child instanceof FootageItem) {
                child.parentFolder = destinationForFootage(child, destinations);
                extracted = true;
            } else if (child instanceof CompItem) {
                child.label = LABEL_RED;
            } else if (child instanceof FolderItem) {
                childExtracted = processSelectedFolder(child, destinations);
                extracted = extracted || childExtracted;
                if (childExtracted && child.numItems === 0) {
                    child.remove();
                }
            }
        }

        return extracted;
    }

    function findCompAnywhere(name) {
        var items = snapshotProjectItems();
        var i;

        for (i = 0; i < items.length; i += 1) {
            if (items[i] instanceof CompItem && items[i].name === name) {
                return items[i];
            }
        }

        return null;
    }

    function dateStamp() {
        var now = new Date();
        var months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        return months[now.getMonth()] + now.getFullYear();
    }

    function documentationText(name) {
        if (name === DOCUMENT_README) {
            return "PROJECT: [Job number]_[CLIENT]_[PROJECT]\r" +
                "CREATED BY: [Name/Agency] | DATE: " + dateStamp() + " | AE VERSION: " + app.version + "\r" +
                "DESCRIPTION: [What the project delivers]\r" +
                "KEY COMPS: [List deliverables]\r" +
                "FONTS: [All fonts used in this project]\r" +
                "PLUGINS / SCRIPTS: [Name + version, provided in project folder]\r" +
                "KNOWN ISSUES: [Or None] | NOTES: [What to do, what not to touch]\r" +
                "GUIDEKEEPER VERSION: " + SCRIPT_VERSION;
        }

        return "Replace this placeholder with the team's hand-authored visual workflow summary.";
    }

    function ensureDocumentationComp(name, referenceComp) {
        var comp = findCompAnywhere(name);

        if (!comp) {
            comp = app.project.items.addComp(
                name,
                referenceComp ? referenceComp.width : 1920,
                referenceComp ? referenceComp.height : 1080,
                referenceComp ? referenceComp.pixelAspect : 1,
                referenceComp ? referenceComp.duration : 10,
                referenceComp ? referenceComp.frameRate : 25
            );
            comp.layers.addText(documentationText(name));
        }

        comp.parentFolder = app.project.rootFolder;
        return comp;
    }

    function labelAllFolders() {
        var items = snapshotProjectItems();
        var i;

        for (i = 0; i < items.length; i += 1) {
            if (items[i] instanceof FolderItem) {
                items[i].label = LABEL_SANDSTONE;
            }
        }
    }

    function labelCompsBelow(folder) {
        var children = snapshotFolderItems(folder);
        var i;

        for (i = 0; i < children.length; i += 1) {
            if (children[i] instanceof CompItem) {
                children[i].label = LABEL_RED;
            } else if (children[i] instanceof FolderItem) {
                labelCompsBelow(children[i]);
            }
        }
    }

    function restoreSelection(originalSelection) {
        var items = snapshotProjectItems();
        var i;

        for (i = 0; i < items.length; i += 1) {
            items[i].selected = false;
        }
        for (i = 0; i < originalSelection.length; i += 1) {
            originalSelection[i].selected = true;
        }
    }

    function errorMessage(error) {
        return error && error.toString ? error.toString() : String(error);
    }

    function buildStructure() {
        var originalSelection = snapshotArray(app.project.selection);
        var originalRootItems;
        var referenceComp;
        var selectedFolders;
        var selectedComps;
        var destinations;
        var item;
        var failure = null;
        var i;

        if (!validateBuildSelection(originalSelection)) {
            return;
        }

        referenceComp = firstResolvedComp(originalSelection);
        originalRootItems = snapshotFolderItems(app.project.rootFolder);
        selectedFolders = effectiveSelectedFolders(originalSelection);
        selectedComps = effectiveSelectedComps(originalSelection, selectedFolders);

        app.beginUndoGroup("GuideKeeper: Build Structure");
        try {
            destinations = createStructure();

            for (i = 0; i < selectedFolders.length; i += 1) {
                processSelectedFolder(selectedFolders[i], destinations);
                selectedFolders[i].parentFolder = destinations.master;
            }

            for (i = 0; i < selectedComps.length; i += 1) {
                selectedComps[i].parentFolder = destinations.master;
                selectedComps[i].label = LABEL_RED;
            }

            for (i = 0; i < originalRootItems.length; i += 1) {
                item = originalRootItems[i];
                if (item instanceof CompItem &&
                        item.name !== DOCUMENT_README &&
                        item.name !== DOCUMENT_WORKFLOW) {
                    item.parentFolder = destinationForComp(item, selectedComps, destinations);
                } else if (item instanceof FootageItem) {
                    item.parentFolder = destinationForFootage(item, destinations);
                }
            }

            ensureDocumentationComp(DOCUMENT_README, referenceComp);
            ensureDocumentationComp(DOCUMENT_WORKFLOW, referenceComp);
            labelAllFolders();
            labelCompsBelow(destinations.master);
        } catch (error) {
            failure = error;
        } finally {
            try {
                restoreSelection(originalSelection);
            } catch (selectionError) {
                if (!failure) {
                    failure = selectionError;
                }
            }
            app.endUndoGroup();
        }

        if (failure) {
            alert("Build Structure stopped: " + errorMessage(failure) +
                "\rUse Edit > Undo GuideKeeper: Build Structure to roll back this operation.");
        }
    }

    function labelForLayer(layer) {
        var name = String(layer.name).toLowerCase();

        if (name.indexOf("txt_") === 0) { return 1; }
        if (name.indexOf("audio_") === 0) { return 2; }
        if (name.indexOf("shape_") === 0) { return 4; }
        if (name.indexOf("packshot_") === 0) { return 6; }
        if (name.indexOf("logo_") === 0) { return 7; }
        if (name.indexOf("bg_") === 0) { return 9; }
        if (name.indexOf("adj_") === 0) { return 10; }
        if (name.indexOf("null_") === 0) { return 11; }
        if (name.indexOf("msk_") === 0) { return 12; }
        if (name.indexOf("vfx_") === 0) { return 13; }
        if (name.indexOf("guide_") === 0) { return 14; }
        if (layer instanceof LightLayer) { return 3; }
        if (layer instanceof CameraLayer) { return 5; }
        if (layer.source && layer.source instanceof CompItem) { return 8; }
        return LABEL_SANDSTONE;
    }

    function colourCodeLayers() {
        var comp = app.project.activeItem;
        var failure = null;
        var i;

        if (!(comp instanceof CompItem)) {
            alert("Open or activate a composition, then run Colour Code Layers again.");
            return;
        }

        app.beginUndoGroup("GuideKeeper: Colour Code Layers");
        try {
            for (i = 1; i <= comp.numLayers; i += 1) {
                comp.layer(i).label = labelForLayer(comp.layer(i));
            }
        } catch (error) {
            failure = error;
        } finally {
            app.endUndoGroup();
        }

        if (failure) {
            alert("Colour Code Layers stopped: " + errorMessage(failure) +
                "\rUse Edit > Undo GuideKeeper: Colour Code Layers to roll back this operation.");
        }
    }

    function collectCompsFromFolder(folder, result) {
        var children = snapshotFolderItems(folder);
        var i;

        for (i = 0; i < children.length; i += 1) {
            if (children[i] instanceof CompItem && !containsItem(result, children[i])) {
                result.push(children[i]);
            } else if (children[i] instanceof FolderItem) {
                collectCompsFromFolder(children[i], result);
            }
        }
    }

    function resolvedReduceComps(selection) {
        var result = [];
        var i;

        for (i = 0; i < selection.length; i += 1) {
            if (selection[i] instanceof CompItem) {
                if (!containsItem(result, selection[i])) {
                    result.push(selection[i]);
                }
            } else if (selection[i] instanceof FolderItem) {
                collectCompsFromFolder(selection[i], result);
            } else {
                return null;
            }
        }

        return result;
    }

    function reduceProject() {
        var originalSelection = snapshotArray(app.project.selection);
        var comps = resolvedReduceComps(originalSelection);
        var commandId;
        var i;

        if (!comps || comps.length === 0) {
            alert("Select one or more compositions or folders containing compositions before running Reduce Project.");
            return;
        }

        try {
            commandId = app.findMenuCommandId("Reduce Project");
            if (!commandId) {
                alert("After Effects could not find Reduce Project. The command may be unavailable or localized in this installation.");
                return;
            }

            restoreSelection([]);
            for (i = 0; i < comps.length; i += 1) {
                comps[i].selected = true;
            }
            app.executeCommand(commandId);
        } catch (error) {
            restoreSelection(originalSelection);
            alert("Reduce Project could not run: " + errorMessage(error) +
                "\rThe original Project selection was restored; no scripted rollback is available for this native command.");
        }
    }

    function collectFiles() {
        var commandId;

        try {
            commandId = app.findMenuCommandId("Collect Files...");
            if (!commandId) {
                commandId = app.findMenuCommandId("Collect Files");
            }
            if (!commandId) {
                alert("After Effects could not find Collect Files. The command may be unavailable or localized in this installation.");
                return;
            }
            app.executeCommand(commandId);
        } catch (error) {
            alert("Collect files could not run: " + errorMessage(error));
        }
    }

    function createPanel(owner) {
        var panel = owner instanceof Panel ?
            owner :
            new Window("palette", PANEL_NAME, undefined, { resizeable: true });
        var buttons = panel.add("group");
        var buildButton;
        var colourButton;
        var reduceButton;
        var collectButton;

        panel.orientation = "column";
        panel.alignChildren = ["fill", "fill"];
        panel.spacing = 6;
        panel.margins = 8;

        buttons.orientation = "column";
        buttons.alignChildren = ["fill", "fill"];
        buttons.alignment = ["fill", "fill"];

        buildButton = buttons.add("button", undefined, "Build Structure");
        colourButton = buttons.add("button", undefined, "Colour Code Layers");
        reduceButton = buttons.add("button", undefined, "Reduce Project");
        collectButton = buttons.add("button", undefined, "Collect files");

        buildButton.onClick = buildStructure;
        colourButton.onClick = colourCodeLayers;
        reduceButton.onClick = reduceProject;
        collectButton.onClick = collectFiles;

        panel.onResizing = panel.onResize = function () {
            buttons.orientation = this.size.width >= 520 ? "row" : "column";
            this.layout.resize();
        };

        panel.layout.layout(true);
        return panel;
    }

    var panel = createPanel(thisObj);

    if (panel instanceof Window) {
        panel.center();
        panel.show();
    }
}(this));
