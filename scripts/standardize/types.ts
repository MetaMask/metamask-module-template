export type Repository = {
  directoryPath: string;
  currentBranchName: string;
  defaultBranchName: string;
};

export type Violation = {
  entryPath: string;
  message: string;
};

export type ProjectAnalysis = {
  elapsedTime: number;
  projectName: string;
  violations: Violation[];
};
