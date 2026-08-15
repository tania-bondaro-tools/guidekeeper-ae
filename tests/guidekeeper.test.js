"use strict";

var assert = require("node:assert/strict");
var test = require("node:test");
var createHarness = require("./after-effects-harness").createHarness;

function folderPaths(h) {
    return h.project._items.filter(function (item) {
        return item instanceof h.classes.FolderItem;
    }).map(function (folder) {
        return h.pathOf(folder);
    }).sort();
}

test("Build Structure classifies root items, preserves nested items, labels Project items, and restores selection", function () {
    var h = createHarness();
    var existingComps = h.addFolder("01_COMPS");
    var master = h.addComp("Final_Master", null, {
        width: 3840,
        height: 2160,
        duration: 30,
        frameRate: 50
    });
    var text = h.addComp("TXT_Title");
    var guide = h.addComp("Client Safe-Zone Overlay");
    var packshot = h.addComp("PACKSHOT_Product");
    var logo = h.addComp("logo_Brand");
    var background = h.addComp("BG_Gradient");
    var effect = h.addComp("VFX_Sparks");
    var unmatched = h.addComp("Scene_02");
    var video = h.addFootage("clip.MOV");
    var image = h.addFootage("still.PNG");
    var packshotImage = h.addFootage("PACKSHOT_Hero.PSD");
    var logoImage = h.addFootage("Logo_Client.AI");
    var audio = h.addFootage("music.WAV");
    var solid = h.addFootage("Red Solid 1", null, { solid: true });
    var unknown = h.addFootage("data.bin");
    var userFolder = h.addFolder("USER_WORK");
    var nestedComp = h.addComp("txt_nested", userFolder);
    var nestedFootage = h.addFootage("nested.mov", userFolder);

    h.selectOnly([master]);
    h.project.autoSelectCreated = true;
    h.click("Build Structure");

    assert.deepEqual(folderPaths(h), [
        "01_COMPS",
        "01_COMPS/LANGUAGES",
        "01_COMPS/MASTER",
        "01_COMPS/PRECOMPS",
        "01_COMPS/PRECOMPS/BACKGROUNDS",
        "01_COMPS/PRECOMPS/FX",
        "01_COMPS/PRECOMPS/LOGOS",
        "01_COMPS/PRECOMPS/PACKSHOTS",
        "01_COMPS/PRECOMPS/TEXT",
        "01_COMPS/PRECOMPS/TRANSITIONS",
        "01_COMPS/PRECOMPS/UNSORTED",
        "02_ASSETS",
        "02_ASSETS/AUDIO",
        "02_ASSETS/FOOTAGE",
        "02_ASSETS/IMAGES",
        "02_ASSETS/LOGOS",
        "02_ASSETS/PACKSHOTS",
        "02_ASSETS/UNSORTED",
        "03_GUIDES",
        "SOLIDS",
        "USER_WORK"
    ], "the exact current structure is created without replacing user folders");
    assert.equal(h.findFolderByPath("01_COMPS"), existingComps, "existing structural folders are reused");
    assert.equal(h.pathOf(master), "01_COMPS/MASTER/Final_Master");
    assert.equal(h.pathOf(text), "01_COMPS/PRECOMPS/TEXT/TXT_Title");
    assert.equal(h.pathOf(guide), "03_GUIDES/Client Safe-Zone Overlay");
    assert.equal(h.pathOf(packshot), "01_COMPS/PRECOMPS/PACKSHOTS/PACKSHOT_Product");
    assert.equal(h.pathOf(logo), "01_COMPS/PRECOMPS/LOGOS/logo_Brand");
    assert.equal(h.pathOf(background), "01_COMPS/PRECOMPS/BACKGROUNDS/BG_Gradient");
    assert.equal(h.pathOf(effect), "01_COMPS/PRECOMPS/FX/VFX_Sparks");
    assert.equal(h.pathOf(unmatched), "01_COMPS/PRECOMPS/UNSORTED/Scene_02");
    assert.equal(h.pathOf(video), "02_ASSETS/FOOTAGE/clip.MOV");
    assert.equal(h.pathOf(image), "02_ASSETS/IMAGES/still.PNG");
    assert.equal(h.pathOf(packshotImage), "02_ASSETS/PACKSHOTS/PACKSHOT_Hero.PSD");
    assert.equal(h.pathOf(logoImage), "02_ASSETS/LOGOS/Logo_Client.AI");
    assert.equal(h.pathOf(audio), "02_ASSETS/AUDIO/music.WAV");
    assert.equal(h.pathOf(solid), "SOLIDS/Red Solid 1");
    assert.equal(h.pathOf(unknown), "02_ASSETS/UNSORTED/data.bin");
    assert.equal(h.pathOf(nestedComp), "USER_WORK/txt_nested", "nested comps stay outside root sorting");
    assert.equal(h.pathOf(nestedFootage), "USER_WORK/nested.mov", "nested footage stays outside root sorting");
    assert.equal(master.label, 1, "the selected MASTER comp is Red in the Project panel");
    assert.ok(h.project._items.filter(function (item) {
        return item instanceof h.classes.FolderItem;
    }).every(function (folder) {
        return folder.label === 15;
    }), "every Project panel folder is Sandstone");
    assert.deepEqual(h.project.selection, [master], "only the original selection remains selected");
    assert.deepEqual(h.undoEvents, [
        { type: "begin", name: "Build Structure" },
        { type: "end" }
    ]);
});

test("Build Structure reuses folders and documentation comps without overwriting edits", function () {
    var h = createHarness();
    var master = h.addComp("Master");
    h.selectOnly([master]);

    h.click("Build Structure");

    var firstCount = h.project.numItems;
    var readme = h.findByName("!_README")[0];
    var workflowGuide = h.findByName("!_WORKFLOW_GUIDE")[0];
    var masterFolder = h.findFolderByPath("01_COMPS/MASTER");
    readme._layers[0].text = "Producer notes";
    workflowGuide._layers[0].text = "Custom workflow";

    h.chooseDialog("Rebuild Structure");
    h.click("Build Structure");

    assert.equal(h.project.numItems, firstCount);
    assert.deepEqual(h.findByName("!_README"), [readme]);
    assert.deepEqual(h.findByName("!_WORKFLOW_GUIDE"), [workflowGuide]);
    assert.equal(h.findFolderByPath("01_COMPS/MASTER"), masterFolder);
    assert.equal(readme._layers[0].text, "Producer notes");
    assert.equal(workflowGuide._layers[0].text, "Custom workflow");
});

test("Build Structure processes a selected group folder while preserving its hierarchy", function () {
    var h = createHarness();
    var group = h.addFolder("DELIVERABLE_GROUP");
    var groupComp = h.addComp("Comp A", group);
    var groupFootage = h.addFootage("plate.mp4", group);
    var nested = h.addFolder("Nested", group);
    var nestedComp = h.addComp("Comp B", nested);
    var deep = h.addFolder("Deep", nested);
    var deepComp = h.addComp("Comp C", deep);
    var nestedAudio = h.addFootage("voice.wav", deep);
    h.selectOnly([group]);

    h.click("Build Structure");

    var firstRunCount = h.project.numItems;
    assert.equal(h.pathOf(group), "01_COMPS/MASTER/DELIVERABLE_GROUP");
    assert.equal(h.pathOf(groupComp), "01_COMPS/MASTER/DELIVERABLE_GROUP/Comp A");
    assert.equal(h.pathOf(nestedComp), "01_COMPS/MASTER/DELIVERABLE_GROUP/Nested/Comp B");
    assert.equal(h.pathOf(deepComp), "01_COMPS/MASTER/DELIVERABLE_GROUP/Nested/Deep/Comp C");
    assert.equal(h.pathOf(groupFootage), "02_ASSETS/FOOTAGE/plate.mp4");
    assert.equal(h.pathOf(nestedAudio), "02_ASSETS/AUDIO/voice.wav");
    assert.equal(group.label, 15);
    assert.equal(groupComp.label, 1);
    assert.equal(nestedComp.label, 1);
    assert.equal(deepComp.label, 1);
    assert.deepEqual(h.project.selection, [group]);

    h.chooseDialog("Rebuild Structure");
    h.click("Build Structure");

    assert.equal(h.project.numItems, firstRunCount, "repeat runs reuse the same structure and documentation comps");
    assert.equal(h.pathOf(group), "01_COMPS/MASTER/DELIVERABLE_GROUP");
    assert.equal(h.pathOf(deepComp), "01_COMPS/MASTER/DELIVERABLE_GROUP/Nested/Deep/Comp C");
    assert.equal(h.pathOf(nestedAudio), "02_ASSETS/AUDIO/voice.wav");
    assert.deepEqual(h.project.selection, [group]);
    assert.deepEqual(h.undoEvents, [
        { type: "begin", name: "Build Structure" },
        { type: "end" },
        { type: "begin", name: "Build Structure" },
        { type: "end" }
    ]);
});

test("Build and Rebuild preserve root OVERLORD and matched AI/PSD import groups", function () {
    var h = createHarness();
    var master = h.addComp("Master");
    var overlord = h.addFolder("oVeRlOrD");
    var overlordNested = h.addFolder("Nested Artwork", overlord);
    var overlordAsset = h.addFootage("vector.ai", overlordNested);
    var illustrator = h.addFootage("Logo.ai");
    var illustratorLayers = h.addFolder("lOgO lAyErS");
    var illustratorNested = h.addFolder("Layer Set", illustratorLayers);
    var illustratorAsset = h.addFootage("Logo Shape.ai", illustratorNested);
    var photoshop = h.addFootage("Renamed Character", null, {
        fileName: "Character.PSD"
    });
    var photoshopLayers = h.addFolder("CHARACTER LAYERS");
    var genericLayers = h.addFolder("Layers");
    var genericChild = h.addComp("Generic Layer Comp", genericLayers);
    var unrelatedLayers = h.addFolder("Other Layers");
    var unrelatedChild = h.addFootage("other.png", unrelatedLayers);
    var missingCompanion = h.addFootage("logo_Solo.AI");
    h.selectOnly([master]);

    h.click("Build Structure");

    assert.equal(h.pathOf(overlord), "02_ASSETS/IMAGES/oVeRlOrD");
    assert.equal(h.pathOf(overlordNested), "02_ASSETS/IMAGES/oVeRlOrD/Nested Artwork");
    assert.equal(h.pathOf(overlordAsset), "02_ASSETS/IMAGES/oVeRlOrD/Nested Artwork/vector.ai");
    assert.equal(h.pathOf(illustrator), "02_ASSETS/IMAGES/Logo.ai");
    assert.equal(h.pathOf(illustratorLayers), "02_ASSETS/IMAGES/lOgO lAyErS");
    assert.equal(h.pathOf(illustratorNested), "02_ASSETS/IMAGES/lOgO lAyErS/Layer Set");
    assert.equal(h.pathOf(illustratorAsset), "02_ASSETS/IMAGES/lOgO lAyErS/Layer Set/Logo Shape.ai");
    assert.equal(h.pathOf(photoshop), "02_ASSETS/IMAGES/Renamed Character");
    assert.equal(h.pathOf(photoshopLayers), "02_ASSETS/IMAGES/CHARACTER LAYERS");
    assert.equal(photoshopLayers.numItems, 0, "an empty matched Layers folder is preserved");
    assert.equal(h.pathOf(genericLayers), "Layers");
    assert.equal(h.pathOf(genericChild), "Layers/Generic Layer Comp");
    assert.equal(h.pathOf(unrelatedLayers), "Other Layers");
    assert.equal(h.pathOf(unrelatedChild), "Other Layers/other.png");
    assert.equal(h.pathOf(missingCompanion), "02_ASSETS/LOGOS/logo_Solo.AI");

    var firstRunPaths = h.project._items.map(h.pathOf).sort();
    h.chooseDialog("Rebuild Structure");
    h.click("Build Structure");

    assert.deepEqual(h.project._items.map(h.pathOf).sort(), firstRunPaths);
    assert.equal(h.pathOf(overlordAsset), "02_ASSETS/IMAGES/oVeRlOrD/Nested Artwork/vector.ai");
    assert.equal(h.pathOf(illustratorAsset), "02_ASSETS/IMAGES/lOgO lAyErS/Layer Set/Logo Shape.ai");
    assert.equal(h.pathOf(photoshopLayers), "02_ASSETS/IMAGES/CHARACTER LAYERS");
});

test("Rebuild preserves asset groups encountered inside a selected composition folder", function () {
    var h = createHarness();
    var master = h.addComp("Master");
    h.selectOnly([master]);
    h.click("Build Structure");

    var selectedGroup = h.addFolder("DELIVERABLE_GROUP");
    var groupedComp = h.addComp("Grouped Comp", selectedGroup);
    var overlord = h.addFolder("OVERLORD", selectedGroup);
    var overlordChild = h.addFootage("keep.psd", overlord);
    var illustrator = h.addFootage("Icons.AI", selectedGroup);
    var illustratorLayers = h.addFolder("icons layers", selectedGroup);
    var layersChild = h.addFootage("Icon 1.ai", illustratorLayers);
    h.selectOnly([selectedGroup]);

    h.chooseDialog("Rebuild Structure");
    h.click("Build Structure");

    assert.equal(h.pathOf(selectedGroup), "01_COMPS/MASTER/DELIVERABLE_GROUP");
    assert.equal(h.pathOf(groupedComp), "01_COMPS/MASTER/DELIVERABLE_GROUP/Grouped Comp");
    assert.equal(h.pathOf(overlord), "02_ASSETS/IMAGES/OVERLORD");
    assert.equal(h.pathOf(overlordChild), "02_ASSETS/IMAGES/OVERLORD/keep.psd");
    assert.equal(h.pathOf(illustrator), "02_ASSETS/IMAGES/Icons.AI");
    assert.equal(h.pathOf(illustratorLayers), "02_ASSETS/IMAGES/icons layers");
    assert.equal(h.pathOf(layersChild), "02_ASSETS/IMAGES/icons layers/Icon 1.ai");
});

test("Build Structure never relocates a selected folder that belongs to its own structure", function () {
    var h = createHarness();
    var comps = h.addFolder("01_COMPS");
    h.selectOnly([comps]);

    h.click("Build Structure");

    assert.equal(h.pathOf(comps), "01_COMPS");
    assert.equal(h.findFolderByPath("01_COMPS/MASTER/01_COMPS"), null);
    assert.deepEqual(h.project.selection, [comps]);
});

test("Build Structure detects only a complete GuideKeeper structure", function () {
    var h = createHarness();
    h.addFolder("01_COMPS");
    h.addFolder("02_ASSETS");
    h.addFolder("03_GUIDES");
    h.addFolder("SOLIDS");
    var master = h.addComp("Master");
    h.selectOnly([master]);

    h.click("Build Structure");

    assert.deepEqual(h.dialogs, [], "an incomplete structure is repaired as a first build");
    assert.equal(h.pathOf(master), "01_COMPS/MASTER/Master");
    assert.equal(h.findFolderByPath("01_COMPS/PRECOMPS/UNSORTED").name, "UNSORTED");
    assert.equal(h.findFolderByPath("02_ASSETS/UNSORTED").name, "UNSORTED");
});

test("existing-structure Cancel makes no mutation and opens no undo group", function () {
    var h = createHarness();
    var master = h.addComp("Master");
    h.selectOnly([master]);
    h.click("Build Structure");
    var loose = h.addComp("txt_Later");
    var countBefore = h.project.numItems;
    var undoBefore = h.undoEvents.slice();

    h.chooseDialog("Cancel");
    h.click("Build Structure");

    assert.equal(h.project.numItems, countBefore);
    assert.equal(h.pathOf(loose), "txt_Later");
    assert.deepEqual(h.project.selection, [master]);
    assert.deepEqual(h.undoEvents, undoBefore);
    assert.deepEqual(h.dialogs, [{
        title: "GuideKeeper",
        message: "Existing GuideKeeper structure detected.\n\nWhat would you like to do?",
        choice: "Cancel"
    }]);
});

test("Clean up the root sorts only loose root items and is safe to rerun", function () {
    var h = createHarness();
    var master = h.addComp("Master");
    h.selectOnly([master]);
    h.click("Build Structure");

    var organizedComp = h.addComp("txt_Organized", h.findFolderByPath("01_COMPS/MASTER"));
    var organizedAsset = h.addFootage("organized.mov", h.findFolderByPath("02_ASSETS/IMAGES"));
    organizedComp.label = 6;
    organizedAsset.label = 4;

    var looseText = h.addComp("TXT_Later");
    var looseGuide = h.addComp("Client Safe Zone");
    var looseVideo = h.addFootage("new.MOV");
    var looseImage = h.addFootage("logo_New.AI");
    var looseUnknown = h.addFootage("new.dat");
    var looseFolder = h.addFolder("IMPORT_BATCH");
    var nestedComp = h.addComp("txt_Nested", looseFolder);
    var nestedAsset = h.addFootage("nested.wav", looseFolder);
    var readme = h.findByName("!_README")[0];
    var workflowGuide = h.findByName("!_WORKFLOW_GUIDE")[0];
    h.selectOnly([looseText, looseFolder]);

    h.click("Clean up the root");

    assert.equal(h.pathOf(looseText), "01_COMPS/PRECOMPS/TEXT/TXT_Later");
    assert.equal(h.pathOf(looseGuide), "03_GUIDES/Client Safe Zone");
    assert.equal(h.pathOf(looseVideo), "02_ASSETS/FOOTAGE/new.MOV");
    assert.equal(h.pathOf(looseImage), "02_ASSETS/LOGOS/logo_New.AI");
    assert.equal(h.pathOf(looseUnknown), "02_ASSETS/UNSORTED/new.dat");
    assert.equal(h.pathOf(looseFolder), "02_ASSETS/UNSORTED/IMPORT_BATCH");
    assert.equal(h.pathOf(nestedComp), "02_ASSETS/UNSORTED/IMPORT_BATCH/txt_Nested");
    assert.equal(h.pathOf(nestedAsset), "02_ASSETS/UNSORTED/IMPORT_BATCH/nested.wav");
    assert.equal(looseFolder.label, 15, "a loose folder moved by cleanup is Sandstone");
    assert.equal(h.pathOf(organizedComp), "01_COMPS/MASTER/txt_Organized");
    assert.equal(h.pathOf(organizedAsset), "02_ASSETS/IMAGES/organized.mov");
    assert.equal(organizedComp.label, 6, "organized comp labels are untouched");
    assert.equal(organizedAsset.label, 4, "organized asset labels are untouched");
    assert.equal(h.pathOf(readme), "!_README");
    assert.equal(h.pathOf(workflowGuide), "!_WORKFLOW_GUIDE");
    assert.deepEqual(h.project.selection, [looseText, looseFolder]);

    var pathsAfterFirstRun = h.project._items.map(h.pathOf).sort();
    h.click("Clean up the root");

    assert.deepEqual(h.project._items.map(h.pathOf).sort(), pathsAfterFirstRun);
    assert.deepEqual(h.project.selection, [looseText, looseFolder]);
    assert.deepEqual(h.undoEvents.slice(-4), [
        { type: "begin", name: "Clean Up Root" },
        { type: "end" },
        { type: "begin", name: "Clean Up Root" },
        { type: "end" }
    ]);
});

test("Clean up the root preserves imported groups without crossing organization boundaries", function () {
    var h = createHarness();
    var master = h.addComp("Master");
    h.selectOnly([master]);
    h.click("Build Structure");

    var images = h.findFolderByPath("02_ASSETS/IMAGES");
    var organizedSource = h.addFootage("Organized.psd", images);
    var organizedLayers = h.addFolder("Organized Layers", images);
    var organizedChild = h.addFootage("organized child.png", organizedLayers);
    organizedSource.label = 4;
    organizedLayers.label = 6;

    var overlord = h.addFolder("overlord");
    var illustrator = h.addFootage("Campaign.AI");
    var illustratorLayers = h.addFolder("campaign LAYERS");
    var illustratorChild = h.addFootage("Campaign 1.ai", illustratorLayers);
    var photoshop = h.addFootage("Character.psd");
    var photoshopLayers = h.addFolder("Character Layers");
    var photoshopNested = h.addFolder("Nested", photoshopLayers);
    var photoshopChild = h.addFootage("Character 1.psd", photoshopNested);
    var genericLayers = h.addFolder("Layers");
    var genericChild = h.addComp("Loose Comp", genericLayers);
    var missingCompanion = h.addFootage("logo_Unpaired.psd");
    var importBatch = h.addFolder("IMPORT_BATCH");
    var nestedSource = h.addFootage("Nested.ai", importBatch);
    var nestedLayers = h.addFolder("Nested Layers", importBatch);
    var nestedChild = h.addFootage("Nested 1.ai", nestedLayers);

    h.click("Clean up the root");

    assert.equal(h.pathOf(overlord), "02_ASSETS/IMAGES/overlord");
    assert.equal(overlord.numItems, 0, "an empty OVERLORD folder remains intact");
    assert.equal(h.pathOf(illustrator), "02_ASSETS/IMAGES/Campaign.AI");
    assert.equal(h.pathOf(illustratorLayers), "02_ASSETS/IMAGES/campaign LAYERS");
    assert.equal(h.pathOf(illustratorChild), "02_ASSETS/IMAGES/campaign LAYERS/Campaign 1.ai");
    assert.equal(h.pathOf(photoshop), "02_ASSETS/IMAGES/Character.psd");
    assert.equal(h.pathOf(photoshopLayers), "02_ASSETS/IMAGES/Character Layers");
    assert.equal(h.pathOf(photoshopNested), "02_ASSETS/IMAGES/Character Layers/Nested");
    assert.equal(h.pathOf(photoshopChild), "02_ASSETS/IMAGES/Character Layers/Nested/Character 1.psd");
    assert.equal(h.pathOf(genericLayers), "02_ASSETS/UNSORTED/Layers");
    assert.equal(h.pathOf(genericChild), "02_ASSETS/UNSORTED/Layers/Loose Comp");
    assert.equal(h.pathOf(missingCompanion), "02_ASSETS/LOGOS/logo_Unpaired.psd");
    assert.equal(h.pathOf(importBatch), "02_ASSETS/UNSORTED/IMPORT_BATCH");
    assert.equal(h.pathOf(nestedSource), "02_ASSETS/UNSORTED/IMPORT_BATCH/Nested.ai");
    assert.equal(h.pathOf(nestedLayers), "02_ASSETS/UNSORTED/IMPORT_BATCH/Nested Layers");
    assert.equal(h.pathOf(nestedChild), "02_ASSETS/UNSORTED/IMPORT_BATCH/Nested Layers/Nested 1.ai");
    assert.equal(h.pathOf(organizedSource), "02_ASSETS/IMAGES/Organized.psd");
    assert.equal(h.pathOf(organizedLayers), "02_ASSETS/IMAGES/Organized Layers");
    assert.equal(h.pathOf(organizedChild), "02_ASSETS/IMAGES/Organized Layers/organized child.png");
    assert.equal(organizedSource.label, 4);
    assert.equal(organizedLayers.label, 6);

    var firstRunPaths = h.project._items.map(h.pathOf).sort();
    h.click("Clean up the root");

    assert.deepEqual(h.project._items.map(h.pathOf).sort(), firstRunPaths);
    assert.equal(organizedSource.label, 4);
    assert.equal(organizedLayers.label, 6);
});

test("existing-structure Clean Up Root choice uses root-only maintenance", function () {
    var h = createHarness();
    var master = h.addComp("Master");
    h.selectOnly([master]);
    h.click("Build Structure");
    var loose = h.addFootage("late.wav");
    var nested = h.addFootage("stay.mov", h.findFolderByPath("01_COMPS/MASTER"));

    h.chooseDialog("Clean Up Root");
    h.click("Build Structure");

    assert.equal(h.pathOf(loose), "02_ASSETS/AUDIO/late.wav");
    assert.equal(h.pathOf(nested), "01_COMPS/MASTER/stay.mov");
    assert.deepEqual(h.undoEvents.slice(-2), [
        { type: "begin", name: "Clean Up Root" },
        { type: "end" }
    ]);
});

test("existing-structure Rebuild Structure explicitly performs the full build workflow", function () {
    var h = createHarness();
    var firstMaster = h.addComp("First Master");
    h.selectOnly([firstMaster]);
    h.click("Build Structure");
    var nextMaster = h.addComp("Next Master");
    var selectedGroup = h.addFolder("SELECTED_GROUP");
    var groupedComp = h.addComp("Grouped", selectedGroup);
    var groupedAsset = h.addFootage("plate.mp4", selectedGroup);
    h.selectOnly([nextMaster, selectedGroup]);

    h.chooseDialog("Rebuild Structure");
    h.click("Build Structure");

    assert.equal(h.pathOf(nextMaster), "01_COMPS/MASTER/Next Master");
    assert.equal(h.pathOf(selectedGroup), "01_COMPS/MASTER/SELECTED_GROUP");
    assert.equal(h.pathOf(groupedComp), "01_COMPS/MASTER/SELECTED_GROUP/Grouped");
    assert.equal(h.pathOf(groupedAsset), "02_ASSETS/FOOTAGE/plate.mp4");
    assert.equal(nextMaster.label, 1);
    assert.equal(groupedComp.label, 1);
    assert.deepEqual(h.project.selection, [nextMaster, selectedGroup]);
    assert.deepEqual(h.undoEvents.slice(-2), [
        { type: "begin", name: "Build Structure" },
        { type: "end" }
    ]);
});

test("Clean up the root requires an existing complete structure", function () {
    var h = createHarness();
    var loose = h.addFootage("clip.mov");

    h.click("Clean up the root");

    assert.equal(h.pathOf(loose), "clip.mov");
    assert.deepEqual(h.alerts, ["No GuideKeeper structure detected. Build Structure first."]);
    assert.deepEqual(h.undoEvents, []);
});

test("Colour Code Layers applies case-insensitive prefix precedence and type fallbacks", function () {
    var h = createHarness();
    var active = h.addComp("Active");
    var precomp = h.addComp("Source");
    var cases = [
        { name: "TXT_Key", type: "light", expected: 1 },
        { name: "audio_VO", expected: 2 },
        { name: "Light 1", type: "light", expected: 3 },
        { name: "shape_Circle", expected: 4 },
        { name: "Camera 1", type: "camera", expected: 5 },
        { name: "packshot_Product", expected: 6 },
        { name: "logo_Client", expected: 7 },
        { name: "Nested Comp", source: precomp, expected: 8 },
        { name: "bg_Plate", expected: 9 },
        { name: "adj_Grade", expected: 10 },
        { name: "null_Control", expected: 11 },
        { name: "msk_Matte", expected: 12 },
        { name: "vfx_Glow", expected: 13 },
        { name: "guide_Safe", expected: 14 },
        { name: "Unclassified", expected: 0 }
    ];

    cases.forEach(function (entry) {
        entry.layer = h.addLayer(active, entry);
        entry.layer.label = 15;
    });
    h.project.activeItem = active;

    h.click("Colour Code Layers");

    cases.forEach(function (entry) {
        assert.equal(entry.layer.label, entry.expected, entry.name);
    });
    assert.deepEqual(h.undoEvents, [
        { type: "begin", name: "Colour Code Layers" },
        { type: "end" }
    ]);
});

test("invalid selections alert without opening an undo group", function () {
    var h = createHarness();
    var footage = h.addFootage("clip.mov");
    h.selectOnly([footage]);

    h.click("Build Structure");
    h.click("Reduce Project");
    h.click("Colour Code Layers");

    assert.deepEqual(h.alerts, [
        "Please choose the main composition or a folder of compositions",
        "Please choose the main composition or a folder of compositions",
        "Open a composition first."
    ]);
    assert.deepEqual(h.undoEvents, []);
});

test("undo groups close when mutating actions report an error", async function (t) {
    await t.test("Build Structure", function () {
        var h = createHarness();
        var comp = h.addComp("Master");
        h.selectOnly([comp]);
        h.project.failAddFolder = true;

        h.click("Build Structure");

        assert.match(h.alerts[0], /^Error: Error: Cannot create folder$/);
        assert.deepEqual(h.undoEvents, [
            { type: "begin", name: "Build Structure" },
            { type: "end" }
        ]);
    });

    await t.test("Clean Up Root", function () {
        var h = createHarness();
        var comp = h.addComp("Master");
        h.selectOnly([comp]);
        h.click("Build Structure");
        var loose = h.addFootage("late.mov");
        loose.failReparent = true;

        h.click("Clean up the root");

        assert.match(h.alerts[0], /^Error: Error: Cannot move late.mov$/);
        assert.deepEqual(h.undoEvents.slice(-2), [
            { type: "begin", name: "Clean Up Root" },
            { type: "end" }
        ]);
    });

    await t.test("Colour Code Layers", function () {
        var h = createHarness();
        var comp = h.addComp("Active");
        var layer = h.addLayer(comp, { name: "txt_Title" });
        layer.failLabel = true;
        h.project.activeItem = comp;

        h.click("Colour Code Layers");

        assert.match(h.alerts[0], /^Error: Error: Cannot label layer txt_Title$/);
        assert.deepEqual(h.undoEvents, [
            { type: "begin", name: "Colour Code Layers" },
            { type: "end" }
        ]);
    });

    await t.test("Reduce Project", function () {
        var h = createHarness();
        var comp = h.addComp("Master");
        h.selectOnly([comp]);
        h.commandIds["Reduce Project"] = 42;
        h.app.failExecuteCommand = true;

        h.click("Reduce Project");

        assert.match(h.alerts[0], /^Error executing 'Reduce Project':\nError: Native command failed$/);
        assert.deepEqual(h.undoEvents, [
            { type: "begin", name: "Reduce Project" },
            { type: "end" }
        ]);
    });
});

test("Reduce Project and Collect Files look up and invoke native commands", function () {
    var h = createHarness();
    var comp = h.addComp("Master");
    h.selectOnly([comp]);
    h.commandIds["Reduce Project"] = 42;
    h.commandIds["Collect Files"] = 88;

    h.click("Reduce Project");
    h.click("Collect files");

    assert.deepEqual(h.commandLookups, [
        "Reduce Project",
        "Collect Files...",
        "Collect Files"
    ]);
    assert.deepEqual(h.executedCommands, [42, 88]);
    assert.deepEqual(h.undoEvents, [
        { type: "begin", name: "Reduce Project" },
        { type: "end" }
    ]);
});

test("unavailable native commands preserve their current alerts and undo behavior", function () {
    var h = createHarness();
    var comp = h.addComp("Master");
    h.selectOnly([comp]);

    h.click("Reduce Project");
    h.click("Collect files");

    assert.deepEqual(h.commandLookups, [
        "Reduce Project",
        "Collect Files...",
        "Collect Files"
    ]);
    assert.deepEqual(h.executedCommands, []);
    assert.deepEqual(h.alerts, [
        "Cannot find 'Reduce Project' command.",
        "Cannot find 'Collect Files...' command."
    ]);
    assert.deepEqual(h.undoEvents, [
        { type: "begin", name: "Reduce Project" },
        { type: "end" }
    ]);
});
