import { NoteType, Prisma } from "@prisma/client";
import { z } from "zod";
import { recordActivity } from "../lib/activity";
import { prisma } from "../lib/db";

const noteTypeValues = Object.values(NoteType) as [NoteType, ...NoteType[]];

export const noteTypeSchema = z.enum(noteTypeValues);

export const noteFiltersSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  type: noteTypeSchema.optional(),
  query: z.string().trim().min(1).optional(),
});

export const createNoteSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  authorId: z.string().trim().min(1).optional(),
  type: noteTypeSchema.default(NoteType.note),
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Content is required"),
});

export const updateNoteSchema = createNoteSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one field is required",
);

export type NoteFilters = z.infer<typeof noteFiltersSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

const noteListInclude = {
  project: true,
} satisfies Prisma.NoteInclude;

export type NoteListItem = Prisma.NoteGetPayload<{
  include: typeof noteListInclude;
}>;

type NoteReadClient = {
  note: {
    findMany(args: Prisma.NoteFindManyArgs): Promise<NoteListItem[]>;
  };
};

type NoteTransactionClient = {
  note: {
    create(args: Prisma.NoteCreateArgs): Promise<NoteListItem>;
    update(args: Prisma.NoteUpdateArgs): Promise<NoteListItem>;
  };
  activityLog: {
    create(args: Prisma.ActivityLogCreateArgs): Promise<unknown>;
  };
};

type NoteWriteClient = {
  $transaction<T>(callback: (tx: NoteTransactionClient) => Promise<T>): Promise<T>;
};

function buildNoteWhere(filters: NoteFilters): Prisma.NoteWhereInput {
  const and: Prisma.NoteWhereInput[] = [];

  if (filters.projectId) {
    and.push({ projectId: filters.projectId });
  }

  if (filters.type) {
    and.push({ type: filters.type });
  }

  if (filters.query) {
    and.push({
      OR: [
        { title: { contains: filters.query, mode: "insensitive" } },
        { content: { contains: filters.query, mode: "insensitive" } },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

function noteCreateData(input: CreateNoteInput): Prisma.NoteCreateInput {
  return {
    type: input.type,
    title: input.title,
    content: input.content,
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    ...(input.authorId !== undefined ? { authorId: input.authorId } : {}),
  };
}

function noteUpdateData(input: UpdateNoteInput): Prisma.NoteUpdateInput {
  return {
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    ...(input.authorId !== undefined ? { authorId: input.authorId } : {}),
  };
}

export async function listNotes(
  filters: NoteFilters = {},
  client: NoteReadClient = prisma as unknown as NoteReadClient,
) {
  const parsedFilters = noteFiltersSchema.parse(filters);

  return client.note.findMany({
    take: 100,
    where: buildNoteWhere(parsedFilters),
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: noteListInclude,
  });
}

export async function createNote(
  input: CreateNoteInput,
  client: NoteWriteClient = prisma as unknown as NoteWriteClient,
) {
  const parsedInput = createNoteSchema.parse(input);

  return client.$transaction(async (tx) => {
    const note = await tx.note.create({
      data: noteCreateData(parsedInput),
      include: noteListInclude,
    });

    await recordActivity(
      {
        projectId: note.projectId ?? undefined,
        action: "note.created",
        entityType: "Note",
        entityId: note.id,
        title: "Note created",
        description: note.title ?? note.content.slice(0, 120),
        metadata: {
          type: note.type,
          title: note.title ?? null,
        },
      },
      tx,
    );

    return note;
  });
}

export async function updateNote(
  id: string,
  input: UpdateNoteInput,
  client: NoteWriteClient = prisma as unknown as NoteWriteClient,
) {
  const parsedInput = updateNoteSchema.parse(input);

  return client.$transaction(async (tx) => {
    const note = await tx.note.update({
      where: { id },
      data: noteUpdateData(parsedInput),
      include: noteListInclude,
    });

    await recordActivity(
      {
        projectId: note.projectId ?? undefined,
        action: "note.updated",
        entityType: "Note",
        entityId: note.id,
        title: "Note updated",
        description: note.title ?? note.content.slice(0, 120),
        metadata: {
          changedFields: Object.keys(parsedInput),
          type: note.type,
        },
      },
      tx,
    );

    return note;
  });
}
