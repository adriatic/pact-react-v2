// Copyright © 2026 Pact Research LLC. All rights reserved.\n// pactresearch.net
export type Run = {
  id: string;
  version: number;
  response: string;
  model: string;
  timestamp: number;
};

export type Prompt = {
  id: string;
  title: string;
  draft: string;
  runs: Run[];
};

export type ViewMode = "normal" | "raw";