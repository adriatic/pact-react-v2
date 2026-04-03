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
exports.getPactRoot = getPactRoot;
exports.ensureDir = ensureDir;
exports.getNotebookRoot = getNotebookRoot;
exports.getNotebookFolder = getNotebookFolder;
exports.isSystemNotebook = isSystemNotebook;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// 🔥 Root storage folder (NO workspace dependency)
function getPactRoot() {
    const homeDir = os.homedir();
    const pactRoot = path.join(homeDir, "pact-data");
    ensureDir(pactRoot);
    return pactRoot;
}
// 🔥 Ensure directory exists
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
// 🔥 Notebook root folder
function getNotebookRoot() {
    const root = path.join(getPactRoot(), "notebooks");
    ensureDir(root);
    return root;
}
// 🔥 Specific notebook folder
function getNotebookFolder(notebookId) {
    const folder = path.join(getNotebookRoot(), notebookId);
    ensureDir(folder);
    return folder;
}
// 🔥 Identify system notebooks (read-only later)
function isSystemNotebook(notebookId) {
    return notebookId.startsWith("core-") || notebookId.startsWith("system-");
}
