export type ExecutionEvent =
  | { type: "cellStarted"; cellId: string; parentId?: string; label?: string }
  | { type: "cellStream"; cellId: string; chunk: string }
  | { type: "cellCompleted"; cellId: string }
  | { type: "cellError"; cellId: string; error: string };

type Listener = (event: ExecutionEvent) => void;

class EventBus {
  private listeners: Listener[] = [];

  emit(event: ExecutionEvent) {
    for (const l of this.listeners) l(event);
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const eventBus = new EventBus();