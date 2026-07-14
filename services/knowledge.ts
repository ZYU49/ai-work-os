import { KnowledgeCategory, Prisma } from "@prisma/client";
import { z } from "zod";
import { recordActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";

const knowledgeCategoryValues = Object.values(KnowledgeCategory) as [
  KnowledgeCategory,
  ...KnowledgeCategory[],
];

export const knowledgeCategorySchema = z.enum(knowledgeCategoryValues);

export const knowledgeFiltersSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  category: knowledgeCategorySchema.optional(),
  tag: z.string().trim().min(1).optional(),
  query: z.string().trim().min(1).optional(),
});

export const createKnowledgePageSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1, "Title is required"),
  category: knowledgeCategorySchema.default(KnowledgeCategory.general),
  content: z.string().trim().min(1, "Content is required"),
  summary: z.string().trim().min(1).optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export const updateKnowledgePageSchema = createKnowledgePageSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one field is required",
);

export type KnowledgeFilters = z.infer<typeof knowledgeFiltersSchema>;
export type CreateKnowledgePageInput = z.infer<typeof createKnowledgePageSchema>;
export type UpdateKnowledgePageInput = z.infer<typeof updateKnowledgePageSchema>;

const knowledgePageInclude = {
  project: true,
} satisfies Prisma.KnowledgePageInclude;

export type KnowledgePageListItem = Prisma.KnowledgePageGetPayload<{
  include: typeof knowledgePageInclude;
}>;

type KnowledgeReadClient = {
  knowledgePage: {
    findMany(args: Prisma.KnowledgePageFindManyArgs): Promise<KnowledgePageListItem[]>;
  };
};

type KnowledgeTransactionClient = {
  knowledgePage: {
    create(args: Prisma.KnowledgePageCreateArgs): Promise<KnowledgePageListItem>;
    update(args: Prisma.KnowledgePageUpdateArgs): Promise<KnowledgePageListItem>;
  };
  activityLog: {
    create(args: Prisma.ActivityLogCreateArgs): Promise<unknown>;
  };
};

type KnowledgeWriteClient = {
  $transaction<T>(
    callback: (tx: KnowledgeTransactionClient) => Promise<T>,
  ): Promise<T>;
};

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function buildKnowledgeWhere(
  filters: KnowledgeFilters,
): Prisma.KnowledgePageWhereInput {
  const and: Prisma.KnowledgePageWhereInput[] = [];

  if (filters.projectId) {
    and.push({ projectId: filters.projectId });
  }

  if (filters.category) {
    and.push({ category: filters.category });
  }

  if (filters.tag) {
    and.push({ tags: { has: filters.tag } });
  }

  if (filters.query) {
    and.push({
      OR: [
        { title: { contains: filters.query, mode: "insensitive" } },
        { content: { contains: filters.query, mode: "insensitive" } },
        { summary: { contains: filters.query, mode: "insensitive" } },
        { tags: { has: filters.query } },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

function knowledgeCreateData(
  input: CreateKnowledgePageInput,
): Prisma.KnowledgePageCreateInput {
  return {
    title: input.title,
    category: input.category,
    content: input.content,
    tags: normalizeTags(input.tags),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
  };
}

function knowledgeUpdateData(
  input: UpdateKnowledgePageInput,
): Prisma.KnowledgePageUpdateInput {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.tags !== undefined ? { tags: normalizeTags(input.tags) } : {}),
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
  };
}

export async function listKnowledgePages(
  filters: KnowledgeFilters = {},
  client: KnowledgeReadClient = prisma as unknown as KnowledgeReadClient,
) {
  const parsedFilters = knowledgeFiltersSchema.parse(filters);

  return client.knowledgePage.findMany({
    take: 100,
    where: buildKnowledgeWhere(parsedFilters),
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: knowledgePageInclude,
  });
}

export async function createKnowledgePage(
  input: CreateKnowledgePageInput,
  client: KnowledgeWriteClient = prisma as unknown as KnowledgeWriteClient,
) {
  const parsedInput = createKnowledgePageSchema.parse(input);

  return client.$transaction(async (tx) => {
    const page = await tx.knowledgePage.create({
      data: knowledgeCreateData(parsedInput),
      include: knowledgePageInclude,
    });

    await recordActivity(
      {
        projectId: page.projectId ?? undefined,
        action: "knowledge.created",
        entityType: "KnowledgePage",
        entityId: page.id,
        title: "Knowledge page created",
        description: page.title,
        metadata: {
          category: page.category,
          tags: page.tags,
        },
      },
      tx,
    );

    return page;
  });
}

export async function updateKnowledgePage(
  id: string,
  input: UpdateKnowledgePageInput,
  client: KnowledgeWriteClient = prisma as unknown as KnowledgeWriteClient,
) {
  const parsedInput = updateKnowledgePageSchema.parse(input);

  return client.$transaction(async (tx) => {
    const page = await tx.knowledgePage.update({
      where: { id },
      data: knowledgeUpdateData(parsedInput),
      include: knowledgePageInclude,
    });

    await recordActivity(
      {
        projectId: page.projectId ?? undefined,
        action: "knowledge.updated",
        entityType: "KnowledgePage",
        entityId: page.id,
        title: "Knowledge page updated",
        description: page.title,
        metadata: {
          changedFields: Object.keys(parsedInput),
          category: page.category,
          tags: page.tags,
        },
      },
      tx,
    );

    return page;
  });
}
