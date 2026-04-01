import MenuBar from "../components/MenuBar";
import PromptList from "../components/PromptList";
import PromptEditor from "../components/PromptEditor";
import ExecutionHistory from "../components/ExecutionHistory";

import { useNotebook } from "../state/useNotebook";

export default function App() {
  const {
    prompts,
    currentPrompt,
    currentId,

    isEditing,
    viewMode,

    selectedRuns,

    createPrompt,
    selectPrompt,
    updateDraft,
    enableEdit,
    cancelEdit,
    runPrompt,

    toggleRunSelection,
    setViewMode,
  } = useNotebook();

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      <MenuBar
        onNew={createPrompt}
        onEdit={enableEdit}
        onCancelEdit={cancelEdit}
        onRun={runPrompt}
        onCompare={() => {}}
        canCompare={selectedRuns.length === 2}
        viewMode={viewMode}
        onSetView={setViewMode}
        isEditing={isEditing}
      />

      <div className="flex flex-1 overflow-hidden">
        <PromptList
          prompts={prompts}
          currentId={currentId}
          onSelect={selectPrompt}
        />

        <div className="flex-1 p-4 overflow-auto">
          <PromptEditor
            prompt={currentPrompt}
            isEditing={isEditing}
            onChange={updateDraft}
          />

          {currentPrompt.runs.length > 0 && (
            <ExecutionHistory
              runs={currentPrompt.runs}
              selected={selectedRuns}
              onToggle={toggleRunSelection}
            />
          )}
        </div>
      </div>
    </div>
  );
}