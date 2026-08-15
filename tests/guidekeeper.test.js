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

test("Build Structure never relocates a selected folder that belongs to its own structure", function () {
    var h = createHarness();
    var comps = h.addFolder("01_COMPS");
    h.selectOnly([comps]);

    h.click("Build Structure");

    assert.equal(h.pathOf(comps), "01_COMPS");
    assert.equal(h.findFolderByPath("01_COMPS/MASTER/01_COMPS"), null);
    assert.deepEqual(h.project.selection, [comps]);
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
