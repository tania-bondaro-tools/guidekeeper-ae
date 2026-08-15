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

var WORKFLOW_FOLDER_PATHS = [
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
    "02_ASSETS/FONTS",
    "02_ASSETS/FOOTAGE",
    "02_ASSETS/IMAGES",
    "02_ASSETS/LOGOS",
    "02_ASSETS/PACKSHOTS",
    "02_ASSETS/UNSORTED",
    "03_GUIDES",
    "SOLIDS"
];

test("panel exposes exactly four workflow actions in order", function () {
    var h = createHarness();

    assert.deepEqual(h.panelButtonLabels, [
        "Build Structure",
        "Clean Up Root",
        "Colour Code Current Comp",
        "Reduce Project"
    ]);
    assert.deepEqual(h.panelUtilityLabels, ["?"]);
    assert.throws(function () {
        h.click("Collect files");
    }, /Button not found: Collect files/);
});

test("only Build Structure receives the exact accent treatment with a native fallback", function () {
    var h = createHarness();
    var build = h.getButton("Build Structure");
    var secondaries = [
        h.getButton("Clean Up Root"),
        h.getButton("Colour Code Current Comp"),
        h.getButton("Reduce Project")
    ];

    assert.equal(typeof build.onDraw, "function");
    secondaries.forEach(function (button) {
        assert.equal(button.onDraw, null);
    });

    build.onDraw();
    assert.deepEqual(build.graphics.operations[0], { type: "drawOSControl" });
    var fill = build.graphics.operations.filter(function (operation) {
        return operation.type === "fillPath";
    })[0];
    assert.deepEqual(Array.from(fill.brush.color), [0, 1, 163 / 255, 1]);
    var text = build.graphics.operations.filter(function (operation) {
        return operation.type === "drawString";
    })[0];
    assert.equal(text.text, "Build Structure");
    assert.deepEqual(Array.from(text.pen.color), [0, 0, 0, 1]);

    build.enabled = false;
    build.graphics.operations.length = 0;
    build.onDraw();
    assert.deepEqual(build.graphics.operations, [{ type: "drawOSControl" }]);

    var fallback = createHarness({ scriptUIGraphics: false });
    assert.equal(fallback.getButton("Build Structure").onDraw, null);
    assert.equal(fallback.getButton("Build Structure").label, "Build Structure");
});

test("workflow actions and help utility expose concise plain-text helpTips", function () {
    var h = createHarness();

    assert.deepEqual([
        h.getButton("Build Structure").helpTip,
        h.getButton("Clean Up Root").helpTip,
        h.getButton("Colour Code Current Comp").helpTip,
        h.getButton("Reduce Project").helpTip,
        h.getButton("?").helpTip
    ], [
        "Creates or rebuilds the GuideKeeper structure and organises selected composition groups.",
        "Sorts newly imported root-level items into an existing GuideKeeper structure.",
        "Applies GuideKeeper label colours to layers in the current composition.",
        "Keeps only assets used by MASTER compositions, or by manually selected compositions.",
        "Open GuideKeeper Help."
    ]);
});

test("help explains current workflows without mutating the project and can be reopened", function () {
    var h = createHarness();
    var beforeItems = h.project._items.slice();

    h.click("?");

    var firstHelp = h.windows[1];
    var helpText = h.windowText(firstHelp).join("\n");
    assert.equal(firstHelp.title, "GuideKeeper Help");
    assert.match(helpText, /Build Structure/);
    assert.match(helpText, /Clean Up Root/);
    assert.match(helpText, /Colour Code Current Comp/);
    assert.match(helpText, /Reduce Project/);
    assert.match(helpText, /Rebuild Structure choice/);
    assert.match(helpText, /01_COMPS\/MASTER/);
    assert.match(helpText, /OVERLORD/);
    assert.match(helpText, /matched AI\/PSD imports/);
    assert.equal(
        helpText.match(/Sort Selected Folder/g),
        null,
        "obsolete standalone action is not advertised"
    );
    assert.deepEqual(h.project._items, beforeItems);
    assert.deepEqual(h.undoEvents, []);

    var helpHeading = findControlInWindow(firstHelp, "statictext", "GUIDEKEEPER HELP");
    assert.deepEqual(
        Array.from(helpHeading.graphics.foregroundColor.color),
        [0, 1, 163 / 255, 1]
    );

    h.click("?");
    assert.equal(h.windows.length, 2, "an open help palette is reused");
    assert.equal(firstHelp._showCount, 2);
    firstHelp.close();
    h.click("?");
    assert.equal(h.windows.length, 3, "closing help allows a fresh palette");
    assert.equal(h.windows[2].title, "GuideKeeper Help");
    assert.deepEqual(h.project._items, beforeItems);
    assert.deepEqual(h.undoEvents, []);
});

test("action buttons switch row and column layout without moving help chrome", function () {
    var h = createHarness();
    var actions = h.getButton("Build Structure").parent;

    assert.equal(h.panel.orientation, "column");
    assert.equal(actions.orientation, "row");

    h.panel.size = [600, 500];
    h.panel.onResize();
    assert.equal(h.panel.orientation, "column");
    assert.equal(actions.orientation, "column");

    h.panel.size = [700, 200];
    h.panel.onResize();
    assert.equal(actions.orientation, "row");
    assert.equal(h.getButton("?").parent.orientation, "row");
});

function findControlInWindow(owner, kind, label) {
    for (var i = 0; i < owner._children.length; i++) {
        var child = owner._children[i];
        if (child.kind === kind && child.label === label) return child;
        var nested = findControlInWindow(child, kind, label);
        if (nested) return nested;
    }
    return null;
}

function assertWorkflowFolderLabels(h) {
    WORKFLOW_FOLDER_PATHS.forEach(function (folderPath) {
        assert.equal(h.findFolderByPath(folderPath).label, 15, folderPath + " is Sandstone");
    });
}

function normalizeLineEndings(text) {
    return text.replace(/\r\n?/g, "\n");
}

function textDocument(layer) {
    return layer.property("ADBE Text Properties")
        .property("ADBE Text Document")
        .value;
}

function assertPosition(layer, expected) {
    assert.deepEqual(Array.from(layer.position), expected);
}

function processableRootItems(h) {
    var intentionalRootNames = {
        "!_README": true,
        "!_WORKFLOW_GUIDE": true,
        "01_COMPS": true,
        "02_ASSETS": true,
        "03_GUIDES": true,
        "SOLIDS": true
    };
    return h.project._items.filter(function (item) {
        return item.parentFolder === h.project.rootFolder && !intentionalRootNames[item.name];
    });
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
    userFolder.label = 4;
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
        "02_ASSETS/FONTS",
        "02_ASSETS/FOOTAGE",
        "02_ASSETS/IMAGES",
        "02_ASSETS/LOGOS",
        "02_ASSETS/PACKSHOTS",
        "02_ASSETS/UNSORTED",
        "02_ASSETS/UNSORTED/USER_WORK",
        "03_GUIDES",
        "SOLIDS"
    ], "the exact current structure is created and loose user folders move intact");
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
    assert.equal(h.pathOf(userFolder), "02_ASSETS/UNSORTED/USER_WORK");
    assert.equal(h.pathOf(nestedComp), "02_ASSETS/UNSORTED/USER_WORK/txt_nested");
    assert.equal(h.pathOf(nestedFootage), "02_ASSETS/UNSORTED/USER_WORK/nested.mov");
    assert.equal(userFolder.label, 4, "unrelated folder labels are preserved");
    assert.equal(master.label, 1, "the selected MASTER comp is Red in the Project panel");
    assertWorkflowFolderLabels(h);
    assert.deepEqual(processableRootItems(h), []);
    assert.deepEqual(h.project.selection, [master], "only the original selection remains selected");
    assert.deepEqual(h.undoEvents, [
        { type: "begin", name: "Build Structure" },
        { type: "end" }
    ]);
});

test("Build Structure generates production documentation comps with exact native styling and content", function () {
    var h = createHarness({ now: "2026-08-15T12:00:00" });
    h.app.version = "25.4.1";
    var master = h.addComp("Master");
    h.selectOnly([master]);

    h.click("Build Structure");

    var readme = h.findByName("!_README")[0];
    var workflowGuide = h.findByName("!_WORKFLOW_GUIDE")[0];
    [readme, workflowGuide].forEach(function (comp) {
        assert.equal(comp.parentFolder, h.project.rootFolder);
        assert.equal(comp.width, 1250);
        assert.equal(comp.height, 2160);
        assert.deepEqual(Array.from(comp.bgColor), [0, 0, 0]);
        assert.equal(comp.numLayers, 3);
        assert.equal(comp.layer(1).name, "HEADER");
        assert.equal(comp.layer(2).name, "BODY");
        assert.equal(comp.layer(3).source.mainSource instanceof h.classes.SolidSource, true);
        assert.deepEqual(Array.from(comp.layer(3).source.mainSource.color), [0, 0, 0]);
        assert.equal(comp.layer(3).source.mainSource.width, 1250);
        assert.equal(comp.layer(3).source.mainSource.height, 2160);
        assert.equal(h.pathOf(comp.layer(3).source), "SOLIDS/" + comp.name + " BACKGROUND");
    });

    var readmeHeader = textDocument(readme.layer(1));
    assert.equal(readmeHeader.text, "!_README");
    assert.equal(readmeHeader.font, "Arial-BoldMT");
    assert.equal(readmeHeader.fontSize, 48);
    assert.deepEqual(Array.from(readmeHeader.fillColor), [0, 1, 163 / 255]);
    assert.equal(readmeHeader.applyFill, true);
    assert.equal(readmeHeader.applyStroke, false);
    assertPosition(readme.layer(1), [60, 100]);

    var readmeBody = textDocument(readme.layer(2));
    var readmeText = normalizeLineEndings(readmeBody.text);
    assert.equal(readmeBody.font, "ArialMT");
    assert.equal(readmeBody.fontSize, 24);
    assert.deepEqual(Array.from(readmeBody.fillColor), [1, 1, 1]);
    assertPosition(readme.layer(2), [60, 180]);
    assert.equal(readmeText, readmeText.toUpperCase());
    assert.match(readmeText, /^PROJECT 1234567_PRODUCTNAME_CAMPAIGN_DATE$/m);
    assert.match(readmeText, /^CREATED BY MOTION DESIGNER NAME \/ AGENCY$/m);
    assert.match(readmeText, /^DATE 2026-08-15$/m);
    assert.match(readmeText, /^AE VERSION 25\.4\.1$/m);
    assert.match(readmeText, /^FONTS ALL FONTS PROVIDED IN 02_ASSETS\/FONTS$/m);
    assert.match(readmeText, /OLIVER - TEXT ROLLOUT V1\.0 \(SCRIPTUI PANEL\)/);
    assert.match(readmeText, /SEE !_WORKFLOW_GUIDE COMP FOR NAMING RULES AND FULL INSTRUCTIONS\./);

    var guideHeader = textDocument(workflowGuide.layer(1));
    assert.equal(guideHeader.text, "!_WORKFLOW_GUIDE — HOW TO USE THIS TEMPLATE");
    assert.equal(guideHeader.font, "Arial-BoldMT");
    assert.equal(guideHeader.fontSize, 48);
    assert.deepEqual(Array.from(guideHeader.fillColor), [0, 1, 163 / 255]);
    assertPosition(workflowGuide.layer(1), [60, 100]);

    var guideBody = textDocument(workflowGuide.layer(2));
    var guideText = normalizeLineEndings(guideBody.text);
    assert.equal(guideBody.font, "ArialMT");
    assert.equal(guideBody.fontSize, 15);
    assert.deepEqual(Array.from(guideBody.fillColor), [1, 1, 1]);
    assertPosition(workflowGuide.layer(2), [60, 200]);
    assert.equal(guideText, guideText.toUpperCase());
    assert.match(guideText, /^PROJECT TEMPLATE — REFERENCE V1\.0$/m);
    assert.match(guideText, /ALL TEXT LAYERS ARE IN PRECOMPS INSIDE 01_COMPS\/PRECOMPS\/TEXT\//);
    assert.match(guideText, /METHOD 1 — CSV ROLLOUT PANEL/);
    assert.match(guideText, /METHOD 2 — ESSENTIAL PROPERTIES/);
    assert.match(guideText, /ADDING A NEW TEXT FIELD/);
    assert.match(guideText, /ADDING A NEW LANGUAGE/);
    assert.match(guideText, /NAMING CONVENTION/);
    assert.match(guideText, /VFX_ = EFFECTS\/TRANSITIONS \(LABEL: FUCHSIA\)/);
    assert.match(guideText, /MSK_ = MASKS\/MATTES \(LABEL: BROWN\)/);
    assert.match(guideText, /01_COMPS\/LANGUAGES\/ = MANUAL LANGUAGE VERSIONS/);
    assert.match(guideText, /02_ASSETS\/ = FOOTAGE, IMAGES, AUDIO, FONTS, PACKSHOTS, LOGOS, UNSORTED/);
    assert.match(guideText, /SOLIDS\/ = NATIVE SOLID SOURCES/);
    assert.match(guideText, /DATA\/TRANSLATIONS\.CSV = ON DISK, NEXT TO THE \.AEP/);
    assert.match(guideText, /QUESTIONS: DAVIDLEBRIS@INSIDEIDEAS\.AGENCY/);
    assert.equal(h.findFolderByPath("02_ASSETS/FONTS").label, 15);
});

test("Build and Rebuild reuse documentation comps at root without overwriting edits", function () {
    var h = createHarness({ now: "2026-08-15T12:00:00" });
    var holding = h.addFolder("USER_DOCS");
    var readme = h.addComp("!_README", holding, {
        width: 640,
        height: 480,
        duration: 2,
        frameRate: 24
    });
    var workflowGuide = h.addComp("!_WORKFLOW_GUIDE", holding);
    var readmeLayer = h.addLayer(readme, { name: "Producer notes" });
    var workflowLayer = h.addLayer(workflowGuide, { name: "Custom workflow" });
    var master = h.addComp("Master");
    h.selectOnly([master]);

    h.click("Build Structure");

    var firstCount = h.project.numItems;
    var masterFolder = h.findFolderByPath("01_COMPS/MASTER");
    assert.equal(h.pathOf(readme), "!_README");
    assert.equal(h.pathOf(workflowGuide), "!_WORKFLOW_GUIDE");
    assert.equal(readme.width, 640);
    assert.equal(readme.height, 480);
    assert.deepEqual(readme._layers, [readmeLayer]);
    assert.deepEqual(workflowGuide._layers, [workflowLayer]);

    h.chooseDialog("Rebuild Structure");
    h.click("Build Structure");

    assert.equal(h.project.numItems, firstCount);
    assert.deepEqual(h.findByName("!_README"), [readme]);
    assert.deepEqual(h.findByName("!_WORKFLOW_GUIDE"), [workflowGuide]);
    assert.equal(h.findFolderByPath("01_COMPS/MASTER"), masterFolder);
    assert.deepEqual(readme._layers, [readmeLayer]);
    assert.deepEqual(workflowGuide._layers, [workflowLayer]);
    assert.equal(h.pathOf(readme), "!_README");
    assert.equal(h.pathOf(workflowGuide), "!_WORKFLOW_GUIDE");
});

test("Build, Rebuild, and Clean Up Root apply only workflow and recursive MASTER labels", function () {
    var h = createHarness();
    var firstMaster = h.addComp("First Master");
    h.selectOnly([firstMaster]);
    h.click("Build Structure");

    var masterFolder = h.findFolderByPath("01_COMPS/MASTER");
    var nestedFolder = h.addFolder("DELIVERABLES", masterFolder);
    var nestedMaster = h.addComp("Nested Master", nestedFolder);
    var deepFolder = h.addFolder("DEEP", nestedFolder);
    var deepMaster = h.addComp("Deep Master", deepFolder);
    var unrelatedFolder = h.addFolder("REFERENCE", h.findFolderByPath("02_ASSETS/IMAGES"));
    var unrelatedComp = h.addComp("Reference Comp", unrelatedFolder);
    var masterLayer = h.addLayer(firstMaster, { name: "txt_Title" });

    WORKFLOW_FOLDER_PATHS.forEach(function (folderPath) {
        h.findFolderByPath(folderPath).label = 2;
    });
    firstMaster.label = 3;
    nestedMaster.label = 4;
    deepMaster.label = 5;
    nestedFolder.label = 6;
    unrelatedFolder.label = 7;
    unrelatedComp.label = 8;
    masterLayer.label = 9;

    h.click("Clean Up Root");

    assertWorkflowFolderLabels(h);
    assert.equal(firstMaster.label, 1);
    assert.equal(nestedMaster.label, 1);
    assert.equal(deepMaster.label, 1);
    assert.equal(nestedFolder.label, 6, "non-workflow folders below MASTER retain their labels");
    assert.equal(unrelatedFolder.label, 7);
    assert.equal(unrelatedComp.label, 8, "comps outside MASTER are not recoloured");
    assert.equal(masterLayer.label, 9, "Project-item labels do not change current-comp layer labels");

    var nextMaster = h.addComp("Next Master");
    h.selectOnly([nextMaster]);
    nestedMaster.label = 4;
    deepMaster.label = 5;
    h.chooseDialog("Rebuild Structure");
    h.click("Build Structure");

    assertWorkflowFolderLabels(h);
    assert.equal(nextMaster.label, 1);
    assert.equal(nestedMaster.label, 1);
    assert.equal(deepMaster.label, 1);
    assert.equal(unrelatedComp.label, 8);
    assert.equal(masterLayer.label, 9);
    assert.deepEqual(processableRootItems(h), []);
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
    assert.equal(group.label, 0, "non-workflow group folders are not recoloured");
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
    assert.equal(h.pathOf(genericLayers), "02_ASSETS/UNSORTED/Layers");
    assert.equal(h.pathOf(genericChild), "02_ASSETS/UNSORTED/Layers/Generic Layer Comp");
    assert.equal(h.pathOf(unrelatedLayers), "02_ASSETS/UNSORTED/Other Layers");
    assert.equal(h.pathOf(unrelatedChild), "02_ASSETS/UNSORTED/Other Layers/other.png");
    assert.equal(h.pathOf(missingCompanion), "02_ASSETS/LOGOS/logo_Solo.AI");
    assert.deepEqual(processableRootItems(h), []);

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

test("Clean Up Root sorts only loose root items and is safe to rerun", function () {
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

    h.click("Clean Up Root");

    assert.equal(h.pathOf(looseText), "01_COMPS/PRECOMPS/TEXT/TXT_Later");
    assert.equal(h.pathOf(looseGuide), "03_GUIDES/Client Safe Zone");
    assert.equal(h.pathOf(looseVideo), "02_ASSETS/FOOTAGE/new.MOV");
    assert.equal(h.pathOf(looseImage), "02_ASSETS/LOGOS/logo_New.AI");
    assert.equal(h.pathOf(looseUnknown), "02_ASSETS/UNSORTED/new.dat");
    assert.equal(h.pathOf(looseFolder), "02_ASSETS/UNSORTED/IMPORT_BATCH");
    assert.equal(h.pathOf(nestedComp), "02_ASSETS/UNSORTED/IMPORT_BATCH/txt_Nested");
    assert.equal(h.pathOf(nestedAsset), "02_ASSETS/UNSORTED/IMPORT_BATCH/nested.wav");
    assert.equal(looseFolder.label, 0, "a loose user folder is not treated as a workflow folder");
    assert.equal(h.pathOf(organizedComp), "01_COMPS/MASTER/txt_Organized");
    assert.equal(h.pathOf(organizedAsset), "02_ASSETS/IMAGES/organized.mov");
    assert.equal(organizedComp.label, 1, "every comp below MASTER is Red");
    assert.equal(organizedAsset.label, 4, "organized asset labels are untouched");
    assert.equal(h.pathOf(readme), "!_README");
    assert.equal(h.pathOf(workflowGuide), "!_WORKFLOW_GUIDE");
    assert.deepEqual(h.project.selection, [looseText, looseFolder]);
    assertWorkflowFolderLabels(h);
    assert.deepEqual(processableRootItems(h), []);

    var pathsAfterFirstRun = h.project._items.map(h.pathOf).sort();
    h.click("Clean Up Root");

    assert.deepEqual(h.project._items.map(h.pathOf).sort(), pathsAfterFirstRun);
    assert.deepEqual(h.project.selection, [looseText, looseFolder]);
    assert.deepEqual(h.undoEvents.slice(-4), [
        { type: "begin", name: "Clean Up Root" },
        { type: "end" },
        { type: "begin", name: "Clean Up Root" },
        { type: "end" }
    ]);
});

test("Clean Up Root preserves imported groups without crossing organization boundaries", function () {
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

    h.click("Clean Up Root");

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
    assert.deepEqual(processableRootItems(h), []);

    var firstRunPaths = h.project._items.map(h.pathOf).sort();
    h.click("Clean Up Root");

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
    assert.deepEqual(processableRootItems(h), []);
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
    assert.deepEqual(processableRootItems(h), []);
    assert.deepEqual(h.project.selection, [nextMaster, selectedGroup]);
    assert.deepEqual(h.undoEvents.slice(-2), [
        { type: "begin", name: "Build Structure" },
        { type: "end" }
    ]);
});

test("Clean Up Root requires an existing complete structure", function () {
    var h = createHarness();
    var loose = h.addFootage("clip.mov");

    h.click("Clean Up Root");

    assert.equal(h.pathOf(loose), "clip.mov");
    assert.deepEqual(h.alerts, ["No GuideKeeper structure detected. Build Structure first."]);
    assert.deepEqual(h.undoEvents, []);
});

test("Colour Code Current Comp applies case-insensitive prefix precedence and type fallbacks", function () {
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

    h.click("Colour Code Current Comp");

    cases.forEach(function (entry) {
        assert.equal(entry.layer.label, entry.expected, entry.name);
    });
    assert.deepEqual(h.undoEvents, [
        { type: "begin", name: "Colour Code Current Comp" },
        { type: "end" }
    ]);
});

test("invalid selections alert without opening an undo group", function () {
    var h = createHarness();
    var footage = h.addFootage("clip.mov");
    h.selectOnly([footage]);

    h.click("Build Structure");
    h.click("Reduce Project");
    h.click("Colour Code Current Comp");

    assert.deepEqual(h.alerts, [
        "Please choose the main composition or a folder of compositions",
        "Select only compositions or folders containing compositions before using Reduce Project.",
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

    await t.test("documentation comp initialization", function () {
        var h = createHarness({ now: "2026-08-15T12:00:00" });
        var comp = h.addComp("Master");
        h.selectOnly([comp]);
        h.project.failAddText = true;

        h.click("Build Structure");

        assert.match(
            h.alerts[0],
            /^Error: Error: Could not create documentation comp '!_README': Error: Cannot add text layer$/
        );
        assert.deepEqual(h.findByName("!_README"), []);
        assert.deepEqual(h.findByName("!_README BACKGROUND"), []);
        assert.deepEqual(h.findByName("!_WORKFLOW_GUIDE"), []);
        assert.deepEqual(h.undoEvents, [
            { type: "begin", name: "Build Structure" },
            { type: "end" }
        ]);

        h.project.failAddText = false;
        h.chooseDialog("Rebuild Structure");
        h.click("Build Structure");

        assert.equal(h.findByName("!_README").length, 1);
        assert.equal(h.findByName("!_WORKFLOW_GUIDE").length, 1);
        assert.deepEqual(h.undoEvents.slice(-2), [
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

        h.click("Clean Up Root");

        assert.match(h.alerts[0], /^Error: Error: Cannot move late.mov$/);
        assert.deepEqual(h.undoEvents.slice(-2), [
            { type: "begin", name: "Clean Up Root" },
            { type: "end" }
        ]);
    });

    await t.test("Colour Code Current Comp", function () {
        var h = createHarness();
        var comp = h.addComp("Active");
        var layer = h.addLayer(comp, { name: "txt_Title" });
        layer.failLabel = true;
        h.project.activeItem = comp;

        h.click("Colour Code Current Comp");

        assert.match(h.alerts[0], /^Error: Error: Cannot label layer txt_Title$/);
        assert.deepEqual(h.undoEvents, [
            { type: "begin", name: "Colour Code Current Comp" },
            { type: "end" }
        ]);
    });

});

test("Reduce Project recursively discovers every comp below a valid MASTER folder", function () {
    var h = createHarness();
    var master = h.addComp("Main Delivery");
    h.selectOnly([master]);
    h.click("Build Structure");
    var masterFolder = h.findFolderByPath("01_COMPS/MASTER");
    var group = h.addFolder("Campaign", masterFolder);
    var nested = h.addFolder("Social", group);
    var groupComp = h.addComp("Campaign Master", group);
    var nestedComp = h.addComp("Social Master", nested);
    var unrelated = h.addComp("Unrelated");
    h.selectOnly([unrelated]);
    h.commandIds["Reduce Project"] = 42;
    h.chooseConfirmation(true);

    h.click("Reduce Project");

    assert.equal(h.confirmations.length, 1);
    assert.match(h.confirmations[0], /3 compositions:/);
    assert.match(h.confirmations[0], /- Main Delivery/);
    assert.match(h.confirmations[0], /- Campaign Master/);
    assert.match(h.confirmations[0], /- Social Master/);
    assert.match(h.confirmations[0], /01_COMPS\/MASTER/);
    assert.deepEqual(h.commandLookups, ["Reduce Project"]);
    assert.deepEqual(h.executedCommands, [42]);
    assert.deepEqual(h.executedSelections[0].map(function (item) {
        return item.name;
    }), [
        "Main Delivery",
        "Campaign Master",
        "Social Master"
    ]);
    assert.deepEqual(h.project.selection, [master, groupComp, nestedComp]);
    assert.deepEqual(h.undoEvents.slice(-2), [
        { type: "begin", name: "Build Structure" },
        { type: "end" }
    ], "the native Reduce Project command is not wrapped in a custom undo group");
});

test("Reduce Project cancel preserves selection and invokes nothing", function () {
    var h = createHarness();
    var master = h.addComp("Master");
    h.selectOnly([master]);
    h.click("Build Structure");
    var unrelated = h.addComp("Unrelated");
    h.selectOnly([unrelated]);

    h.click("Reduce Project");

    assert.equal(h.confirmations.length, 1);
    assert.deepEqual(h.project.selection, [unrelated]);
    assert.deepEqual(h.commandLookups, []);
    assert.deepEqual(h.executedCommands, []);
});

test("Reduce Project warns when a valid structure has no MASTER comps", function () {
    var h = createHarness();
    var formerMaster = h.addComp("Former Master");
    h.selectOnly([formerMaster]);
    h.click("Build Structure");
    formerMaster.parentFolder = h.project.rootFolder;
    h.selectOnly([formerMaster]);

    h.click("Reduce Project");

    assert.deepEqual(h.alerts, [
        "GuideKeeper structure detected, but no compositions were found in 01_COMPS/MASTER. Add at least one MASTER composition before using Reduce Project."
    ]);
    assert.deepEqual(h.project.selection, [formerMaster]);
    assert.deepEqual(h.confirmations, []);
    assert.deepEqual(h.commandLookups, []);
});

test("Reduce Project resolves nested manual folders and deduplicates comps", function () {
    var h = createHarness();
    var group = h.addFolder("Deliverables");
    var nested = h.addFolder("Nested", group);
    var directComp = h.addComp("Direct", group);
    var nestedComp = h.addComp("Nested Master", nested);
    h.selectOnly([group, nestedComp]);
    h.commandIds["Reduce Project"] = 42;
    h.chooseConfirmation(true);

    h.click("Reduce Project");

    assert.match(h.confirmations[0], /the selected compositions/);
    assert.match(h.confirmations[0], /2 compositions:/);
    assert.deepEqual(h.project.selection, [directComp, nestedComp]);
    assert.deepEqual(h.executedSelections[0], [directComp, nestedComp]);
    assert.deepEqual(h.executedCommands, [42]);
    assert.deepEqual(h.undoEvents, []);
});

test("Reduce Project confirmation summarizes large comp sets readably", function () {
    var h = createHarness();
    var group = h.addFolder("Many Masters");
    for (var i = 1; i <= 9; i++) {
        h.addComp("Master " + i, group);
    }
    h.selectOnly([group]);

    h.click("Reduce Project");

    assert.match(h.confirmations[0], /9 compositions:/);
    assert.match(h.confirmations[0], /- Master 1/);
    assert.match(h.confirmations[0], /- Master 8/);
    assert.match(h.confirmations[0], /- \.\.\.and 1 more/);
    assert.doesNotMatch(h.confirmations[0], /- Master 9/);
    assert.deepEqual(h.project.selection, [group]);
});

test("Reduce Project rejects empty and invalid manual selections", async function (t) {
    await t.test("empty selection", function () {
        var h = createHarness();

        h.click("Reduce Project");

        assert.deepEqual(h.alerts, [
            "Select one or more compositions, or folders containing compositions, before using Reduce Project."
        ]);
        assert.deepEqual(h.confirmations, []);
    });

    await t.test("non-comp item", function () {
        var h = createHarness();
        var footage = h.addFootage("clip.mov");
        h.selectOnly([footage]);

        h.click("Reduce Project");

        assert.deepEqual(h.alerts, [
            "Select only compositions or folders containing compositions before using Reduce Project."
        ]);
        assert.deepEqual(h.confirmations, []);
    });

    await t.test("folder without comps", function () {
        var h = createHarness();
        var folder = h.addFolder("Empty");
        h.addFootage("clip.mov", folder);
        h.selectOnly([folder]);

        h.click("Reduce Project");

        assert.deepEqual(h.alerts, [
            "No compositions were found in the current selection. Select a composition or a folder containing compositions."
        ]);
        assert.deepEqual(h.confirmations, []);
    });
});

test("Reduce Project surfaces native command lookup failures without changing selection", async function (t) {
    await t.test("command unavailable", function () {
        var h = createHarness();
        var folder = h.addFolder("Deliverables");
        h.addComp("Master", folder);
        h.selectOnly([folder]);
        h.chooseConfirmation(true);

        h.click("Reduce Project");

        assert.deepEqual(h.commandLookups, ["Reduce Project"]);
        assert.deepEqual(h.alerts, ["Cannot find 'Reduce Project' command."]);
        assert.deepEqual(h.project.selection, [folder]);
        assert.deepEqual(h.executedCommands, []);
    });

    await t.test("lookup throws", function () {
        var h = createHarness();
        var folder = h.addFolder("Deliverables");
        h.addComp("Master", folder);
        h.selectOnly([folder]);
        h.chooseConfirmation(true);
        h.app.failFindMenuCommand = true;

        h.click("Reduce Project");

        assert.deepEqual(h.alerts, [
            "Error executing 'Reduce Project':\nError: Command lookup failed"
        ]);
        assert.deepEqual(h.project.selection, [folder]);
        assert.deepEqual(h.executedCommands, []);
    });
});

test("Reduce Project applies confirmed comp selection before surfacing execution errors", function () {
    var h = createHarness();
    var folder = h.addFolder("Deliverables");
    var comp = h.addComp("Master", folder);
    h.selectOnly([folder]);
    h.chooseConfirmation(true);
    h.commandIds["Reduce Project"] = 42;
    h.app.failExecuteCommand = true;

    h.click("Reduce Project");

    assert.deepEqual(h.project.selection, [comp]);
    assert.deepEqual(h.alerts, [
        "Error executing 'Reduce Project':\nError: Native command failed"
    ]);
    assert.deepEqual(h.undoEvents, []);
});
