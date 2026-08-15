const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class Harness {
    constructor() {
        this.alerts = [];
        this.buttons = [];
        this.windows = [];
        this.undoBegins = [];
        this.undoEnds = 0;
        this.findMenuCalls = [];
        this.menuCommands = {};
        this.executedCommands = [];
        this.executedSelections = [];
        this.failMoveItem = null;
        this.executeError = null;

        const harness = this;

        this.SolidSource = class SolidSource {};

        this.Item = class Item {
            constructor(project, name) {
                this.project = project;
                this.name = name;
                this.label = 0;
                this.selected = false;
                this.removed = false;
                this._parentFolder = null;
            }

            get parentFolder() {
                return this._parentFolder;
            }

            set parentFolder(folder) {
                if (harness.failMoveItem === this) {
                    throw new Error("simulated move failure");
                }
                this._parentFolder = folder;
            }

            remove() {
                this.project.removeItem(this);
            }
        };

        const Item = this.Item;

        this.FolderItem = class FolderItem extends Item {
            constructor(project, name, isRoot) {
                super(project, name);
                this.isRoot = Boolean(isRoot);
            }

            get numItems() {
                return this.project.directChildren(this).length;
            }

            item(index) {
                return this.project.directChildren(this)[index - 1];
            }

            remove() {
                if (this.isRoot) {
                    throw new Error("cannot remove root");
                }
                const children = this.project.directChildren(this).slice();
                for (const child of children) {
                    child.remove();
                }
                super.remove();
            }
        };

        this.BaseLayer = class BaseLayer {
            constructor(name, source) {
                this.name = name;
                this.source = source || null;
                this.label = 0;
            }
        };

        const BaseLayer = this.BaseLayer;

        this.LightLayer = class LightLayer extends BaseLayer {};
        this.CameraLayer = class CameraLayer extends BaseLayer {};

        class LayerCollection {
            constructor(comp) {
                this.comp = comp;
                this.values = [];
            }

            addText(text) {
                const layer = new BaseLayer("Text", null);
                layer.text = text;
                this.values.push(layer);
                return layer;
            }
        }

        this.CompItem = class CompItem extends Item {
            constructor(project, name, width, height, pixelAspect, duration, frameRate) {
                super(project, name);
                this.width = width;
                this.height = height;
                this.pixelAspect = pixelAspect;
                this.duration = duration;
                this.frameRate = frameRate;
                this.layers = new LayerCollection(this);
            }

            get numLayers() {
                return this.layers.values.length;
            }

            layer(index) {
                return this.layers.values[index - 1];
            }
        };

        this.FootageItem = class FootageItem extends Item {
            constructor(project, name, mainSource) {
                super(project, name);
                this.mainSource = mainSource;
            }
        };

        this.project = this.createProject();
        this.app = this.createApp();
        this.createUiClasses();
        this.runScript();
    }

    createProject() {
        const harness = this;
        const project = {
            _items: [],
            activeItem: null,

            get numItems() {
                return this._items.length;
            },

            item(index) {
                return this._items[index - 1];
            },

            directChildren(folder) {
                return this._items.filter((item) => !item.removed && item.parentFolder === folder);
            },

            removeItem(item) {
                item.removed = true;
                const index = this._items.indexOf(item);
                if (index !== -1) {
                    this._items.splice(index, 1);
                }
            },

            get selection() {
                return this._items.filter((item) => item.selected);
            }
        };

        project.rootFolder = new this.FolderItem(project, "Root", true);
        project.items = {
            addFolder(name) {
                const folder = new harness.FolderItem(project, name, false);
                folder._parentFolder = project.rootFolder;
                project._items.push(folder);
                return folder;
            },

            addComp(name, width, height, pixelAspect, duration, frameRate) {
                const comp = new harness.CompItem(
                    project,
                    name,
                    width,
                    height,
                    pixelAspect,
                    duration,
                    frameRate
                );
                comp._parentFolder = project.rootFolder;
                project._items.push(comp);
                return comp;
            }
        };

        return project;
    }

    createApp() {
        const harness = this;

        return {
            project: this.project,
            version: "26.0",

            beginUndoGroup(name) {
                harness.undoBegins.push(name);
            },

            endUndoGroup() {
                harness.undoEnds += 1;
            },

            findMenuCommandId(name) {
                harness.findMenuCalls.push(name);
                return harness.menuCommands[name] || 0;
            },

            executeCommand(id) {
                harness.executedCommands.push(id);
                harness.executedSelections.push(harness.project.selection.slice());
                if (harness.executeError) {
                    throw harness.executeError;
                }
            }
        };
    }

    createUiClasses() {
        const harness = this;

        class Container {
            constructor() {
                this.children = [];
                this.size = { width: 300, height: 300 };
                this.layout = {
                    layoutCalls: 0,
                    resizeCalls: 0,
                    layout() {
                        this.layoutCalls += 1;
                    },
                    resize() {
                        this.resizeCalls += 1;
                    }
                };
            }

            add(type, bounds, text) {
                let control;
                if (type === "group") {
                    control = new Container();
                } else if (type === "button") {
                    control = { type, text, onClick: null };
                    harness.buttons.push(control);
                } else {
                    throw new Error(`Unsupported ScriptUI control: ${type}`);
                }
                this.children.push(control);
                return control;
            }
        }

        this.Panel = class Panel extends Container {};
        this.Window = class Window extends Container {
            constructor(type, title) {
                super();
                this.type = type;
                this.title = title;
                this.centered = false;
                this.shown = false;
                harness.windows.push(this);
            }

            center() {
                this.centered = true;
            }

            show() {
                this.shown = true;
            }
        };
    }

    runScript() {
        const scriptPath = path.join(__dirname, "..", "GuideKeeper_AE.jsx");
        const source = fs.readFileSync(scriptPath, "utf8");
        const sandbox = {
            app: this.app,
            alert: (message) => this.alerts.push(String(message)),
            Panel: this.Panel,
            Window: this.Window,
            CompItem: this.CompItem,
            FolderItem: this.FolderItem,
            FootageItem: this.FootageItem,
            SolidSource: this.SolidSource,
            LightLayer: this.LightLayer,
            CameraLayer: this.CameraLayer,
            Date
        };

        vm.runInNewContext(source, sandbox, { filename: "GuideKeeper_AE.jsx" });
    }

    addFolder(name, parent) {
        const folder = this.project.items.addFolder(name);
        folder.parentFolder = parent || this.project.rootFolder;
        return folder;
    }

    addComp(name, parent, settings) {
        const values = settings || {};
        const comp = this.project.items.addComp(
            name,
            values.width || 1920,
            values.height || 1080,
            values.pixelAspect || 1,
            values.duration || 10,
            values.frameRate || 25
        );
        comp.parentFolder = parent || this.project.rootFolder;
        return comp;
    }

    addFootage(name, fileName, parent, solid) {
        const source = solid ? new this.SolidSource() : { file: fileName ? { name: fileName } : null };
        const footage = new this.FootageItem(this.project, name, source);
        footage._parentFolder = parent || this.project.rootFolder;
        this.project._items.push(footage);
        return footage;
    }

    addLayer(comp, name, options) {
        const values = options || {};
        let layer;
        if (values.type === "light") {
            layer = new this.LightLayer(name, values.source);
        } else if (values.type === "camera") {
            layer = new this.CameraLayer(name, values.source);
        } else {
            layer = new this.BaseLayer(name, values.source);
        }
        comp.layers.values.push(layer);
        return layer;
    }

    select(...items) {
        for (const item of this.project._items) {
            item.selected = false;
        }
        for (const item of items) {
            item.selected = true;
        }
    }

    click(label) {
        const button = this.buttons.find((candidate) => candidate.text === label);
        if (!button) {
            throw new Error(`Button not found: ${label}`);
        }
        button.onClick();
    }

    findFolder(name, parent) {
        return this.project.directChildren(parent || this.project.rootFolder)
            .find((item) => item instanceof this.FolderItem && item.name === name);
    }

    folderPath(...names) {
        let parent = this.project.rootFolder;
        for (const name of names) {
            parent = this.findFolder(name, parent);
            if (!parent) {
                return null;
            }
        }
        return parent;
    }

    itemsNamed(name) {
        return this.project._items.filter((item) => item.name === name);
    }

    rootItems() {
        return this.project.directChildren(this.project.rootFolder);
    }
}

module.exports = { Harness };
