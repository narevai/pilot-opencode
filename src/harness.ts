export type Task = {
  readonly prompt: string;
  readonly title: string;
};

export type Launch = {
  readonly command: string;
  readonly args: readonly string[];
};

export type Harness = {
  readonly name: string;
  launch(task: Task): Launch;
};
