"use strict";

var fs = require("node:fs");
var path = require("node:path");
var vm = require("node:vm");

function createHarness() {
    var nextId = 1;
    var alerts = [];
    var buttons = {};
    var panelButtonLabels = [];
    var undoEvents = [];
    var commandLookups = [];
    var executedCommands = [];
    var executedSelections = [];
    var commandIds = {};
    var confirmationChoices = [];
    var confirmations = [];
    var dialogChoices = [];
    var dialogs = [];

    function SolidSource() {}

    function ProjectItem(project, name, parentFolder) {
        this.project = project;
        this.name = name;
        this.id = nextId++;
        this._parentFolder = parentFolder || null;
        this._label = 0;
        this.selected = false;
    }

    Object.defineProperty(ProjectItem.prototype, "parentFolder", {
        get: function () {
            return this._parentFolder;
        },
        set: function (folder) {
            if (this.failReparent) throw new Error("Cannot move " + this.name);
            this._parentFolder = folder;
        }
    });

    Object.defineProperty(ProjectItem.prototype, "label", {
        get: function () {
            return this._label;
        },
        set: function (value) {
            if (this.failLabel) throw new Error("Cannot label " + this.name);
            this._label = value;
        }
    });

    ProjectItem.prototype.remove = function () {
        var index = this.project._items.indexOf(this);
        if (index === -1) throw new Error("Item is not in the project");
        if (this.numItems) throw new Error("Folder is not empty");
        this.project._items.splice(index, 1);
    };

    function FolderItem(project, name, parentFolder) {
        ProjectItem.call(this, project, name, parentFolder);
    }
    FolderItem.prototype = Object.create(ProjectItem.prototype);
    FolderItem.prototype.constructor = FolderItem;

    Object.defineProperty(FolderItem.prototype, "numItems", {
        get: function () {
            var folder = this;
            return this.project._items.filter(function (item) {
                return item.parentFolder === folder;
            }).length;
        }
    });

    FolderItem.prototype.item = function (index) {
        var folder = this;
        var children = this.project._items.filter(function (item) {
            return item.parentFolder === folder;
        });
        return children[index - 1] || null;
    };

    function Layer(name, source) {
        this.name = name || "";
        this.source = source || null;
        this._label = 0;
    }

    Object.defineProperty(Layer.prototype, "label", {
        get: function () {
            return this._label;
        },
        set: function (value) {
            if (this.failLabel) throw new Error("Cannot label layer " + this.name);
            this._label = value;
        }
    });

    function LightLayer(name, source) {
        Layer.call(this, name, source);
    }
    LightLayer.prototype = Object.create(Layer.prototype);
    LightLayer.prototype.constructor = LightLayer;

    function CameraLayer(name, source) {
        Layer.call(this, name, source);
    }
    CameraLayer.prototype = Object.create(Layer.prototype);
    CameraLayer.prototype.constructor = CameraLayer;

    function CompItem(project, name, parentFolder, settings) {
        ProjectItem.call(this, project, name, parentFolder);
        settings = settings || {};
        this.width = settings.width || 1920;
        this.height = settings.height || 1080;
        this.duration = settings.duration || 10;
        this.frameRate = settings.frameRate || 25;
        this._layers = [];

        var comp = this;
        this.layers = {
            addText: function (text) {
                var layer = new Layer("Text");
                layer.text = text;
                comp._layers.push(layer);
                return layer;
            }
        };
    }
    CompItem.prototype = Object.create(ProjectItem.prototype);
    CompItem.prototype.constructor = CompItem;

    Object.defineProperty(CompItem.prototype, "numLayers", {
        get: function () {
            return this._layers.length;
        }
    });

    CompItem.prototype.layer = function (index) {
        return this._layers[index - 1] || null;
    };

    function FootageItem(project, name, parentFolder, source) {
        ProjectItem.call(this, project, name, parentFolder);
        this.mainSource = source || {};
    }
    FootageItem.prototype = Object.create(ProjectItem.prototype);
    FootageItem.prototype.constructor = FootageItem;

    function Project() {
        var project = this;
        this._items = [];
        this.autoSelectCreated = false;
        this.activeItem = null;
        this.rootFolder = new FolderItem(this, "Root", null);
        this.items = {
            addFolder: function (name) {
                if (project.failAddFolder) throw new Error("Cannot create folder");
                return project._addFolder(name, project.rootFolder, project.autoSelectCreated);
            },
            addComp: function (name, width, height, pixelAspect, duration, frameRate) {
                if (project.failAddComp) throw new Error("Cannot create comp");
                return project._addComp(name, project.rootFolder, {
                    width: width,
                    height: height,
                    duration: duration,
                    frameRate: frameRate
                }, project.autoSelectCreated);
            }
        };
    }

    Object.defineProperty(Project.prototype, "numItems", {
        get: function () {
            return this._items.length;
        }
    });

    Object.defineProperty(Project.prototype, "selection", {
        get: function () {
            return this._items.filter(function (item) {
                return item.selected;
            });
        }
    });

    Project.prototype.item = function (index) {
        return this._items[index - 1] || null;
    };

    Project.prototype._selectOnly = function (items) {
        this._items.forEach(function (item) {
            item.selected = false;
        });
        items.forEach(function (item) {
            item.selected = true;
        });
    };

    Project.prototype._addFolder = function (name, parentFolder, selectCreated) {
        var folder = new FolderItem(this, name, parentFolder || this.rootFolder);
        this._items.push(folder);
        if (selectCreated) this._selectOnly([folder]);
        return folder;
    };

    Project.prototype._addComp = function (name, parentFolder, settings, selectCreated) {
        var comp = new CompItem(this, name, parentFolder || this.rootFolder, settings);
        this._items.push(comp);
        if (selectCreated) this._selectOnly([comp]);
        return comp;
    };

    Project.prototype._addFootage = function (name, parentFolder, options) {
        options = options || {};
        var source = options.solid
            ? new SolidSource()
            : { file: options.noFile ? null : { name: options.fileName || name } };
        var footage = new FootageItem(this, name, parentFolder || this.rootFolder, source);
        this._items.push(footage);
        return footage;
    };

    Project.prototype._addLayer = function (comp, options) {
        options = options || {};
        var LayerType = options.type === "light"
            ? LightLayer
            : options.type === "camera"
                ? CameraLayer
                : Layer;
        var layer = new LayerType(options.name, options.source);
        comp._layers.push(layer);
        return layer;
    };

    var project = new Project();
    var app = {
        project: project,
        version: "25.0",
        beginUndoGroup: function (name) {
            undoEvents.push({ type: "begin", name: name });
        },
        endUndoGroup: function () {
            undoEvents.push({ type: "end" });
        },
        findMenuCommandId: function (name) {
            if (app.failFindMenuCommand) throw new Error("Command lookup failed");
            commandLookups.push(name);
            return commandIds[name] || 0;
        },
        executeCommand: function (id) {
            if (app.failExecuteCommand) throw new Error("Native command failed");
            executedCommands.push(id);
            executedSelections.push(project.selection.slice());
        }
    };

    function Panel() {}

    function Window(kind, title) {
        this.kind = kind;
        this.title = title;
        this.size = [800, 200];
        this._children = [];
        this._closed = false;
        this.layout = {
            layout: function () {},
            resize: function () {}
        };
    }

    function addControl(owner, kind, label) {
        var control = {
            kind: kind,
            label: label,
            onClick: null,
            size: null,
            _children: []
        };
        control.add = function (childKind, bounds, childLabel) {
            return addControl(control, childKind, childLabel);
        };
        owner._children.push(control);
        if (kind === "button") buttons[label] = control;
        if (kind === "button" && owner.kind === "palette") panelButtonLabels.push(label);
        return control;
    }

    function findControl(owner, kind, label) {
        for (var i = 0; i < owner._children.length; i++) {
            var child = owner._children[i];
            if (child.kind === kind && child.label === label) return child;
            var nested = findControl(child, kind, label);
            if (nested) return nested;
        }
        return null;
    }

    Window.prototype.add = function (kind, bounds, label) {
        return addControl(this, kind, label);
    };
    Window.prototype.center = function () {};
    Window.prototype.close = function () {
        this._closed = true;
    };
    Window.prototype.show = function () {
        if (this.kind !== "dialog") return;
        var choice = dialogChoices.length ? dialogChoices.shift() : "Cancel";
        dialogs.push({
            title: this.title,
            message: this._children[0] ? this._children[0].label : "",
            choice: choice
        });
        var button = findControl(this, "button", choice);
        if (!button || typeof button.onClick !== "function") {
            throw new Error("Dialog button not found: " + choice);
        }
        button.onClick();
    };

    var context = vm.createContext({
        app: app,
        alert: function (message) {
            alerts.push(String(message));
        },
        confirm: function (message) {
            confirmations.push(String(message));
            return confirmationChoices.length ? confirmationChoices.shift() : false;
        },
        Panel: Panel,
        Window: Window,
        CompItem: CompItem,
        FolderItem: FolderItem,
        FootageItem: FootageItem,
        SolidSource: SolidSource,
        LightLayer: LightLayer,
        CameraLayer: CameraLayer
    });

    var scriptPath = path.join(__dirname, "..", "GuideKeeper_AE.jsx");
    var source = fs.readFileSync(scriptPath, "utf8");
    vm.runInContext(source, context, { filename: scriptPath });

    function click(label) {
        if (!buttons[label] || typeof buttons[label].onClick !== "function") {
            throw new Error("Button not found: " + label);
        }
        buttons[label].onClick();
    }

    function pathOf(item) {
        var parts = [item.name];
        var parent = item.parentFolder;
        while (parent && parent !== project.rootFolder) {
            parts.unshift(parent.name);
            parent = parent.parentFolder;
        }
        return parts.join("/");
    }

    function findByName(name) {
        return project._items.filter(function (item) {
            return item.name === name;
        });
    }

    function findFolderByPath(folderPath) {
        var names = folderPath.split("/");
        var parent = project.rootFolder;
        for (var i = 0; i < names.length; i++) {
            var match = project._items.filter(function (item) {
                return item instanceof FolderItem
                    && item.parentFolder === parent
                    && item.name === names[i];
            })[0];
            if (!match) return null;
            parent = match;
        }
        return parent;
    }

    return {
        app: app,
        project: project,
        alerts: alerts,
        panelButtonLabels: panelButtonLabels,
        undoEvents: undoEvents,
        commandLookups: commandLookups,
        executedCommands: executedCommands,
        executedSelections: executedSelections,
        commandIds: commandIds,
        confirmations: confirmations,
        dialogs: dialogs,
        classes: {
            CompItem: CompItem,
            FolderItem: FolderItem,
            FootageItem: FootageItem,
            SolidSource: SolidSource,
            LightLayer: LightLayer,
            CameraLayer: CameraLayer
        },
        addFolder: function (name, parentFolder) {
            return project._addFolder(name, parentFolder || project.rootFolder, false);
        },
        addComp: function (name, parentFolder, settings) {
            return project._addComp(name, parentFolder || project.rootFolder, settings || {}, false);
        },
        addFootage: function (name, parentFolder, options) {
            return project._addFootage(name, parentFolder || project.rootFolder, options || {});
        },
        addLayer: function (comp, options) {
            return project._addLayer(comp, options);
        },
        selectOnly: function (items) {
            project._selectOnly(items);
        },
        chooseDialog: function (label) {
            dialogChoices.push(label);
        },
        chooseConfirmation: function (accepted) {
            confirmationChoices.push(accepted);
        },
        click: click,
        pathOf: pathOf,
        findByName: findByName,
        findFolderByPath: findFolderByPath
    };
}

module.exports = {
    createHarness: createHarness
};
