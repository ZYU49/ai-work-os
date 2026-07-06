import Link from "next/link";
import { ProjectTabs } from "@/components/projects/project-tabs";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <Link
          href="/projects"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-950"
        >
          Back to projects
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-zinc-950">
          Project Workspace
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Review the linked contacts, emails, files, tasks, notes, follow-ups,
          and summary for this project.
        </p>
      </div>

      <ProjectTabs projectId={id} />
    </div>
  );
}
