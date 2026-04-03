"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotebooks = listNotebooks;
exports.createUserNotebook = createUserNotebook;
exports.getNotebookPath = getNotebookPath;
exports.assertWritable = assertWritable;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const storage_1 = require("./storage");
function listNotebooks() {
    const root = (0, storage_1.getPactRoot)();
    return fs.readdirSync(root).filter(name => {
        const fullPath = path.join(root, name);
        return fs.statSync(fullPath).isDirectory();
    });
}
function createUserNotebook() {
    const root = (0, storage_1.getPactRoot)();
    const existing = listNotebooks()
        .filter(n => n.startsWith("notebook-"));
    const nextIndex = existing.length + 1;
    const notebookId = `notebook-${nextIndex}`;
    const notebookPath = path.join(root, notebookId);
    (0, storage_1.ensureDir)(notebookPath);
    return notebookId;
}
function getNotebookPath(notebookId) {
    return path.join((0, storage_1.getPactRoot)(), notebookId);
}
function assertWritable(notebookId) {
    if ((0, storage_1.isSystemNotebook)(notebookId)) {
        throw new Error(`Notebook ${notebookId} is read-only`);
    }
}
