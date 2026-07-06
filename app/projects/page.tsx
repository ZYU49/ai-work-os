import { ProjectList } from "@/components/projects/project-list";

export default function ProjectsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          Projects
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Track customer workspaces by activity, priority, open tasks, and
          follow-ups.
        </p>
      </div>

      <ProjectList />
    </div>
  );
}
