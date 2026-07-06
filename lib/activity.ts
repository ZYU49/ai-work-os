import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export type ActivityInput = {
  entityType: string;
  entityId: string;
  action: string;
  title: string;
  description?: string;
  projectId?: string;
  metadata?: Prisma.InputJsonObject;
};

type ActivityClient = Pick<
  typeof prisma | Prisma.TransactionClient,
  "activityLog"
> | {
  activityLog: {
    create(args: Prisma.ActivityLogCreateArgs): Promise<unknown>;
  };
};

export async function recordActivity(
  input: ActivityInput,
  client: ActivityClient = prisma,
) {
  const { title, description, metadata, ...activity } = input;

  return client.activityLog.create({
    data: {
      ...activity,
      metadata: {
        ...(metadata ?? {}),
        title,
        ...(description !== undefined ? { description } : {}),
      },
    },
  });
}
