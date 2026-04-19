"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
class EventBus {
    constructor() {
        this.listeners = [];
    }
    emit(event) {
        for (const l of this.listeners)
            l(event);
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
}
exports.eventBus = new EventBus();
