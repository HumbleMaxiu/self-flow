import type { Prisma } from "./platform/db";

export namespace SelfFlow {
  export namespace Runs {
    export type Trigger = "manual" | "cron" | "api";

    export type CreateInput = {
      workflowId: string;
      trigger: Trigger;
      input: Record<string, unknown>;
    };

    export type Row = {
      id: string;
      workflow_id: string;
      trigger: string;
      status: string;
      input: unknown;
      created_at: Date;
      started_at: Date | null;
      finished_at: Date | null;
      error: unknown | null;
    };

    export type StepRow = {
      id: string;
      run_id: string;
      name: string;
      status: string;
      started_at: Date | null;
      finished_at: Date | null;
      error: unknown | null;
    };

    export type ArtifactRow = {
      id: string;
      run_id: string;
      step_id: string | null;
      kind: string;
      payload: unknown;
      created_at: Date;
    };

    export type GetResult = {
      run: Row;
      steps: StepRow[];
      artifacts: ArtifactRow[];
    };

    export type ListRow = Omit<Row, "input" | "error">;

    export type InputJson = Prisma.InputJsonValue;
  }
}
