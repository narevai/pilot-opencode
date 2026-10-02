import type { Harness } from "../harness.ts";
import { opencode } from "./opencode.ts";

const HARNESSES: Readonly<Record<string, Harness>> = {
  [opencode.name]: opencode,
};

export function findHarness(name: string): Harness | undefined {
  return HARNESSES[name];
}

export function harnessNames(): string[] {
  return Object.keys(HARNESSES);
}
