const assert = require("node:assert/strict");
const test = require("node:test");

const { Harness } = require("./after-effects-harness");

test("renders exactly the four workflow buttons in contract order", () => {
    const harness = new Harness();

    assert.deepEqual(
        harness.buttons.map((button) => button.text),
        ["Build Structure", "Colour Code Layers", "Reduce Project", "Collect files"]
    );
    assert.equal(harness.windows.length, 1);
    assert.equal(harness.windows[0].shown, true);

    harness.windows[0].size.width = 600;
    harness.windows[0].onResize();
    assert.equal(harness.windows[0].children[0].orientation, "row");
    assert.equal(harness.windows[0].layout.resizeCalls, 1);

    harness.windows[0].size.width = 300;
    harness.windows[0].onResizing();
    assert.equal(harness.windows[0].children[0].orientation, "column");
    assert.equal(harness.windows[0].layout.resizeCalls, 2);
});

test("rejects invalid Build Structure selection before mutation or undo", () => {
    const harness = new Harness();
    const footage = harness.addFootage("clip", "clip.mov");
    harness.select(footage);
    const itemCount = harness.project.numItems;

    harness.click("Build Structure");

    assert.equal(harness.project.numItems, itemCount);
    assert.deepEqual(harness.undoBegins, []);
    assert.equal(harness.undoEnds, 0);
    assert.match(harness.alerts[0], /only compositions and folders/i);

    const emptyFolderHarness = new Harness();
    const emptyFolder = emptyFolderHarness.addFolder("Empty");
    emptyFolderHarness.select(emptyFolder);
    const emptyFolderItemCount = emptyFolderHarness.project.numItems;
    emptyFolderHarness.click("Build Structure");
    assert.equal(emptyFolderHarness.project.numItems, emptyFolderItemCount);
    assert.deepEqual(emptyFolderHarness.undoBegins, []);
    assert.match(emptyFolderHarness.alerts[0], /must contain at least one composition/i);
});

test("always routes a directly selected root comp to MASTER and Red", () => {
    const harness = new Harness();
    const selected = harness.addComp("guide_selected");
    harness.select(selected);

    harness.click("Build Structure");

    assert.equal(selected.parentFolder, harness.folderPath("01_COMPS", "MASTER"));
    assert.equal(selected.label, 1);
    assert.deepEqual(harness.project.selection, [selected]);
});

test("extracts selected-folder footage while preserving comp groups", () => {
    const harness = new Harness();
    const group = harness.addFolder("Campaign");
    const master = harness.addComp("Main", group);
    const nested = harness.addFolder("Nested", group);
    const nestedComp = harness.addComp("Nested Main", nested);
    const video = harness.addFootage("clip", "clip.mov", nested);
    const assetsOnly = harness.addFolder("Assets Only", group);
    const audio = harness.addFootage("voice", "voice.wav", assetsOnly);
    harness.select(group);

    harness.click("Build Structure");

    assert.equal(group.parentFolder, harness.folderPath("01_COMPS", "MASTER"));
    assert.equal(master.parentFolder, group);
    assert.equal(nested.parentFolder, group);
    assert.equal(nestedComp.parentFolder, nested);
    assert.equal(master.label, 1);
    assert.equal(nestedComp.label, 1);
    assert.equal(video.parentFolder, harness.folderPath("02_ASSETS", "FOOTAGE"));
    assert.equal(audio.parentFolder, harness.folderPath("02_ASSETS", "AUDIO"));
    assert.equal(assetsOnly.removed, true);
    assert.equal(group.removed, false);
});

test("routes an explicitly selected nested comp directly to MASTER", () => {
    const harness = new Harness();
    const group = harness.addFolder("Campaign");
    const nested = harness.addFolder("Nested", group);
    const selectedComp = harness.addComp("Selected Nested", nested);
    const groupedComp = harness.addComp("Grouped Nested", nested);
    harness.select(group, selectedComp);

    harness.click("Build Structure");

    const master = harness.folderPath("01_COMPS", "MASTER");
    assert.equal(group.parentFolder, master);
    assert.equal(selectedComp.parentFolder, master);
    assert.equal(selectedComp.label, 1);
    assert.equal(nested.parentFolder, group);
    assert.equal(groupedComp.parentFolder, nested);
    assert.equal(groupedComp.label, 1);
    assert.deepEqual(harness.project.selection, [group, selectedComp]);
});

test("leaves unselected root folders and all of their contents in place", () => {
    const harness = new Harness();
    const selected = harness.addComp("Main");
    const userFolder = harness.addFolder("Do Not Touch");
    const nestedComp = harness.addComp("txt_inside", userFolder);
    const nestedFootage = harness.addFootage("logo_inside", "logo.png", userFolder);
    harness.select(selected);

    harness.click("Build Structure");

    assert.equal(userFolder.parentFolder, harness.project.rootFolder);
    assert.equal(nestedComp.parentFolder, userFolder);
    assert.equal(nestedFootage.parentFolder, userFolder);
});

test("routes every root comp and footage category to its destination", () => {
    const harness = new Harness();
    const selected = harness.addComp("guide_selected");
    const routes = [
        [harness.addComp("guide_overlay"), ["03_GUIDES"]],
        [harness.addComp("Client Safe-Zone"), ["03_GUIDES"]],
        [harness.addComp("txt_title"), ["01_COMPS", "PRECOMPS", "TEXT"]],
        [harness.addComp("packshot_end"), ["01_COMPS", "PRECOMPS", "PACKSHOTS"]],
        [harness.addComp("logo_brand"), ["01_COMPS", "PRECOMPS", "LOGOS"]],
        [harness.addComp("bg_gradient"), ["01_COMPS", "PRECOMPS", "BACKGROUNDS"]],
        [harness.addComp("vfx_glow"), ["01_COMPS", "PRECOMPS", "FX"]],
        [harness.addComp("misc"), ["01_COMPS", "PRECOMPS", "UNSORTED"]],
        [harness.addFootage("solid", null, null, true), ["SOLIDS"]],
        [harness.addFootage("clip", "clip.mp4"), ["02_ASSETS", "FOOTAGE"]],
        [harness.addFootage("packshot_product", "product.png"), ["02_ASSETS", "PACKSHOTS"]],
        [harness.addFootage("logo_brand", "brand.ai"), ["02_ASSETS", "LOGOS"]],
        [harness.addFootage("photo", "photo.jpg"), ["02_ASSETS", "IMAGES"]],
        [harness.addFootage("music", "music.aac"), ["02_ASSETS", "AUDIO"]],
        [harness.addFootage("unknown", "archive.xyz"), ["02_ASSETS", "UNSORTED"]]
    ];
    harness.select(selected);

    harness.click("Build Structure");

    assert.equal(selected.parentFolder, harness.folderPath("01_COMPS", "MASTER"));
    for (const [item, destination] of routes) {
        assert.equal(item.parentFolder, harness.folderPath(...destination), item.name);
    }
    assert.ok(harness.folderPath("01_COMPS", "LANGUAGES"));
    assert.ok(harness.folderPath("01_COMPS", "PRECOMPS", "TRANSITIONS"));
});

test("reuses documentation comps in place without overwriting content", () => {
    const harness = new Harness();
    const selected = harness.addComp("Main", null, {
        width: 3840,
        height: 2160,
        pixelAspect: 1.5,
        duration: 30,
        frameRate: 50
    });
    const userFolder = harness.addFolder("Notes");
    const existingReadme = harness.addComp("!_README", userFolder);
    const existingLayer = harness.addLayer(existingReadme, "Hand-authored");
    harness.select(selected);

    harness.click("Build Structure");
    harness.click("Build Structure");

    const workflow = harness.itemsNamed("!_WORKFLOW_GUIDE")[0];
    assert.equal(existingReadme.parentFolder, userFolder);
    assert.equal(existingReadme.numLayers, 1);
    assert.equal(existingReadme.layer(1), existingLayer);
    assert.equal(harness.itemsNamed("!_README").length, 1);
    assert.equal(harness.itemsNamed("!_WORKFLOW_GUIDE").length, 1);
    assert.equal(workflow.parentFolder, harness.project.rootFolder);
    assert.equal(workflow.numLayers, 1);
    assert.equal(workflow.width, 3840);
    assert.equal(workflow.height, 2160);
    assert.equal(workflow.pixelAspect, 1.5);
    assert.equal(workflow.duration, 30);
    assert.equal(workflow.frameRate, 50);
});

test("is idempotent across repeated Build Structure runs", () => {
    const harness = new Harness();
    const selected = harness.addComp("Main");
    harness.select(selected);

    harness.click("Build Structure");
    harness.click("Build Structure");

    const expectedFolders = [
        ["01_COMPS"],
        ["01_COMPS", "MASTER"],
        ["01_COMPS", "LANGUAGES"],
        ["01_COMPS", "PRECOMPS"],
        ["01_COMPS", "PRECOMPS", "TEXT"],
        ["01_COMPS", "PRECOMPS", "PACKSHOTS"],
        ["01_COMPS", "PRECOMPS", "LOGOS"],
        ["01_COMPS", "PRECOMPS", "TRANSITIONS"],
        ["01_COMPS", "PRECOMPS", "BACKGROUNDS"],
        ["01_COMPS", "PRECOMPS", "FX"],
        ["01_COMPS", "PRECOMPS", "UNSORTED"],
        ["02_ASSETS"],
        ["02_ASSETS", "FOOTAGE"],
        ["02_ASSETS", "IMAGES"],
        ["02_ASSETS", "AUDIO"],
        ["02_ASSETS", "PACKSHOTS"],
        ["02_ASSETS", "LOGOS"],
        ["02_ASSETS", "UNSORTED"],
        ["03_GUIDES"],
        ["SOLIDS"]
    ];

    for (const folderNames of expectedFolders) {
        assert.ok(harness.folderPath(...folderNames), folderNames.join("/"));
    }
    assert.equal(harness.itemsNamed("!_README").length, 1);
    assert.equal(harness.itemsNamed("!_WORKFLOW_GUIDE").length, 1);
    assert.equal(harness.itemsNamed("!_README")[0].numLayers, 1);
    assert.equal(harness.itemsNamed("!_WORKFLOW_GUIDE")[0].numLayers, 1);
    assert.equal(harness.project._items.filter((item) => item instanceof harness.FolderItem).length, 20);
});

test("rejects selected canonical folders before they can dismantle the structure", () => {
    const harness = new Harness();
    const selected = harness.addComp("txt_title");
    harness.select(selected);
    harness.click("Build Structure");
    const textFolder = harness.folderPath("01_COMPS", "PRECOMPS", "TEXT");
    const itemCount = harness.project.numItems;

    harness.select(textFolder);
    harness.click("Build Structure");

    assert.equal(textFolder.parentFolder, harness.folderPath("01_COMPS", "PRECOMPS"));
    assert.equal(harness.project.numItems, itemCount);
    assert.equal(harness.undoBegins.length, 1);
    assert.equal(harness.undoEnds, 1);
    assert.match(harness.alerts[0], /structure folders/i);
});

test("applies project labels and every layer-label rule including Sandstone", () => {
    const harness = new Harness();
    const selectedFolder = harness.addFolder("Masters");
    const selected = harness.addComp("Main", selectedFolder);
    const unselectedFolder = harness.addFolder("User Folder");
    const nonMaster = harness.addComp("txt_title");
    nonMaster.label = 6;
    harness.select(selectedFolder);
    harness.click("Build Structure");

    for (const item of harness.project._items) {
        if (item instanceof harness.FolderItem) {
            assert.equal(item.label, 15, item.name);
        }
    }
    assert.equal(selected.label, 1);
    assert.equal(nonMaster.label, 6);
    assert.equal(unselectedFolder.label, 15);

    const active = harness.addComp("Layer Labels");
    const precomp = harness.addComp("Source");
    const cases = [
        [harness.addLayer(active, "TXT_Title"), 1],
        [harness.addLayer(active, "Audio_VO"), 2],
        [harness.addLayer(active, "shape_box"), 4],
        [harness.addLayer(active, "packshot_product"), 6],
        [harness.addLayer(active, "logo_brand"), 7],
        [harness.addLayer(active, "bg_plate"), 9],
        [harness.addLayer(active, "adj_grade"), 10],
        [harness.addLayer(active, "null_control"), 11],
        [harness.addLayer(active, "msk_matte"), 12],
        [harness.addLayer(active, "vfx_glow"), 13],
        [harness.addLayer(active, "guide_safe"), 14],
        [harness.addLayer(active, "Light", { type: "light" }), 3],
        [harness.addLayer(active, "Camera", { type: "camera" }), 5],
        [harness.addLayer(active, "Nested", { source: precomp }), 8],
        [harness.addLayer(active, "Naming violation"), 15]
    ];
    harness.project.activeItem = active;

    harness.click("Colour Code Layers");

    for (const [layer, label] of cases) {
        assert.equal(layer.label, label, layer.name);
    }
    assert.deepEqual(
        harness.undoBegins,
        ["GuideKeeper: Build Structure", "GuideKeeper: Colour Code Layers"]
    );
    assert.equal(harness.undoEnds, 2);
});

test("pairs Build Structure undo groups on success and mutation error", () => {
    const success = new Harness();
    const successComp = success.addComp("Main");
    success.select(successComp);
    success.click("Build Structure");
    assert.deepEqual(success.undoBegins, ["GuideKeeper: Build Structure"]);
    assert.equal(success.undoEnds, 1);

    const failure = new Harness();
    const failureComp = failure.addComp("Main");
    failure.select(failureComp);
    failure.failMoveItem = failureComp;
    failure.click("Build Structure");
    assert.deepEqual(failure.undoBegins, ["GuideKeeper: Build Structure"]);
    assert.equal(failure.undoEnds, 1);
    assert.deepEqual(failure.project.selection, [failureComp]);
    assert.match(failure.alerts[0], /simulated move failure/i);
    assert.match(failure.alerts[0], /undo/i);
});

test("Reduce Project resolves folder comps recursively and deduplicates them", () => {
    const harness = new Harness();
    const parent = harness.addFolder("Parent");
    const compA = harness.addComp("A", parent);
    const nested = harness.addFolder("Nested", parent);
    const compB = harness.addComp("B", nested);
    harness.select(parent, nested, compA);
    harness.menuCommands["Reduce Project"] = 42;

    harness.click("Reduce Project");

    assert.deepEqual(harness.executedCommands, [42]);
    assert.deepEqual(harness.executedSelections[0], [compA, compB]);
    assert.deepEqual(harness.undoBegins, []);
});

test("Reduce Project restores the exact original selection when execution fails", () => {
    const harness = new Harness();
    const folder = harness.addFolder("Parent");
    harness.addComp("A", folder);
    const rootComp = harness.addComp("Root");
    harness.select(folder, rootComp);
    harness.menuCommands["Reduce Project"] = 42;
    harness.executeError = new Error("native command failed");

    harness.click("Reduce Project");

    assert.deepEqual(harness.project.selection, [folder, rootComp]);
    assert.match(harness.alerts[0], /original Project selection was restored/i);
});

test("Collect files tries both documented command names and executes only a nonzero ID", () => {
    const ellipsis = new Harness();
    ellipsis.menuCommands["Collect Files..."] = 10;
    ellipsis.click("Collect files");
    assert.deepEqual(ellipsis.findMenuCalls, ["Collect Files..."]);
    assert.deepEqual(ellipsis.executedCommands, [10]);

    const plain = new Harness();
    plain.menuCommands["Collect Files"] = 11;
    plain.click("Collect files");
    assert.deepEqual(plain.findMenuCalls, ["Collect Files...", "Collect Files"]);
    assert.deepEqual(plain.executedCommands, [11]);

    const missing = new Harness();
    missing.click("Collect files");
    assert.deepEqual(missing.executedCommands, []);
    assert.match(missing.alerts[0], /localized/i);
    assert.deepEqual(missing.undoBegins, []);
});
