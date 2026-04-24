export type CorePrompt = {
  id: string;
  title: string;
  text: string;
};

export const corePrompts: CorePrompt[] = [
   {
    id: "00",
    title: "Getting Started",
    text: `Introduce PACT — a new kind of AI interface that treats interaction with language models as structured notebook execution rather than conversation. Explain why this matters and what it enables that a standard chat interface cannot.`,
  },{
    id: "01",
    title: "What am I looking at?",
    text: `I have PACT open inside VSCode. I can see a panel with a text input and a Run button. 
What is this environment, and how is it fundamentally different from a browser chat interface like ChatGPT or Claude?`,
  },
  {
    id: "02",
    title: "What just happened?",
    text: `I typed a prompt into PACT and pressed Run. A labeled box appeared below containing your response. 
What happened between me pressing Run and the response appearing? Walk me through the execution pipeline.`,
  },
  {
    id: "03",
    title: "Why a cell, not a bubble?",
    text: `In a normal chat interface, my message and your response appear as a flowing conversation. 
In PACT, my prompt disappears from the input and your response appears in a discrete labeled cell. 
What is the significance of that difference?`,
  },
  {
    id: "04",
    title: "What does Retry actually mean?",
    text: `I pressed the Retry button on a completed cell. A new cell appeared with a similar but 
different response. In a chat interface there is no equivalent to this. What does Retry reveal 
about the nature of LLM responses, and why does PACT treat it as a first-class operation?`,
  },
  {
    id: "05",
    title: "What is the cell hierarchy for?",
    text: `PACT displays cells in a hierarchy — some cells are indented under others. 
What does that parent-child relationship represent, and what reasoning capability does it enable 
that a flat chat transcript cannot?`,
  },
  {
    id: "06",
    title: "What is a PACT cell as a data structure?",
    text: `Set aside the visual representation for a moment. If a PACT cell is a data structure 
rather than a chat message, what fields does it contain? What makes it an immutable artifact 
rather than an editable message?`,
  },
  {
    id: "07",
    title: "What is the notebook?",
    text: `PACT is described as a computational notebook for reasoning. A Jupyter notebook contains 
cells that execute code and produce outputs. What is the equivalent in PACT — what executes, 
what is the output, and what makes the result reproducible?`,
  },
  {
    id: "08",
    title: "What should never reach the LLM?",
    text: `I want to tell PACT something that is not a question or a reasoning prompt — for example, 
that I am signing off for the day, or that the last response got garbled and I need it repeated. 
Why should these messages never be sent to the LLM as prompts, and what should handle them instead?`,
  },
  {
    id: "09",
    title: "What is a PACT signal?",
    text: `PACT introduces the concept of a signal — a typed control message that the host intercepts 
before the LLM is invoked. Give me three concrete examples of signals that would be useful in a 
session where a developer is using PACT to write code, and explain what the host does with each one.`,
  },
  {
    id: "10",
    title: "How does PACT compare two models?",
    text: `I submit the same prompt and PACT runs it against GPT and Claude simultaneously, displaying 
both responses as sibling cells. What does that comparison reveal that alternating between two 
browser tabs cannot? What would a diff overlay over those two cells show me?`,
  },
  {
    id: "11",
    title: "What would PACT remember that chat forgets?",
    text: `After a long session developing a VSCode extension, I close PACT and return the next morning. 
What has a browser chat interface lost that PACT has retained? Be specific about what is stored, 
where, and in what form.`,
  },
  {
    id: "12",
    title: "What is a prompt library?",
    text: `PACT maintains a library of prompts separate from the conversation history. What is the 
difference between a prompt in the library and a message in a chat history? Why does that 
difference matter for structured reasoning workflows?`,
  },
  {
    id: "13",
    title: "How does PACT apply to a domain?",
    text: `Imagine a medical professional using PACT to investigate interactions between a patient's 
medications. Walk me through one complete PACT session in that domain — what prompts are submitted, 
what signals are used, what artifacts are produced, and what the notebook looks like at the end.`,
  },
  {
    id: "14",
    title: "Why is this not an agentic system?",
    text: `PACT gives the LLM no ability to take actions, browse the web, run code, or call tools 
autonomously. Every execution is initiated by the human. Why is that constraint a feature rather 
than a limitation, and what class of problems is PACT specifically designed to address?`,
  },
  {
    id: "15",
    title: "What does PACT become?",
    text: `PACT is currently being developed using itself — a developer and an LLM collaborating 
inside the notebook to build the notebook. What does that bootstrapping process demonstrate about 
PACT's long-term role, and what would it mean for a reasoning laboratory to become the standard 
environment for structured human-AI collaboration?`,
  },
];