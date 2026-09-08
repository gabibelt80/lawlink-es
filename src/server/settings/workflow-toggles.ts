import { prisma } from "@/lib/prisma";

const TOGGLES_KEY = "workflowToggles";

export interface WorkflowToggles {
  externalContactReview: boolean;
}

export const WORKFLOW_TOGGLE_DEFAULTS: WorkflowToggles = {
  externalContactReview: false
};

export async function getWorkflowToggles(): Promise<WorkflowToggles> {
  const row = await prisma.systemSetting.findUnique({ where: { key: TOGGLES_KEY } });
  const s = (row?.value as Partial<WorkflowToggles> | null) ?? {};
  return {
    externalContactReview:
      s.externalContactReview ?? WORKFLOW_TOGGLE_DEFAULTS.externalContactReview
  };
}

export async function saveWorkflowToggles(next: WorkflowToggles): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: TOGGLES_KEY },
    create: { key: TOGGLES_KEY, value: { ...next } },
    update: { value: { ...next } }
  });
}
