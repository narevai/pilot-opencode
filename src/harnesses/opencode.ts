import type { Harness, Launch, Task } from "../harness.ts";

export const opencode: Harness = {
  name: "opencode",
  launch(task: Task): Launch {
    return {
      command: "opencode",
      args: ["run", "--title", task.title, task.prompt],
    };
  },
};
