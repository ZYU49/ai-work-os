"use client";

import { useEffect, useId, useState } from "react";

type ProjectOption = {
  id: string;
  name: string;
  companyName: string | null;
};

type ProjectsResponse = {
  projects?: ProjectOption[];
  error?: string;
};

type ProjectSelectProps = {
  value: string;
  onChange: (projectId: string) => void;
  label?: string;
};

function optionLabel(project: ProjectOption) {
  return project.companyName
    ? `${project.name} - ${project.companyName}`
    : project.name;
}

export function ProjectSelect({
  value,
  onChange,
  label = "Project",
}: ProjectSelectProps) {
  const selectId = useId();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/projects", { cache: "no-store" });
        const data = (await response.json()) as ProjectsResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load projects.");
        }

        if (isMounted) {
          setProjects(data.projects ?? []);
        }
      } catch {
        if (isMounted) {
          setProjects([]);
          setError(
            "Projects unavailable. Save without a project or try again later.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      !isLoading &&
      value &&
      !projects.some((project) => project.id === value)
    ) {
      onChange("");
    }
  }, [isLoading, onChange, projects, value]);

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-zinc-700"
      >
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading}
        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500"
      >
        {isLoading ? (
          <option value="">Loading projects...</option>
        ) : (
          <option value="">Unassigned</option>
        )}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {optionLabel(project)}
          </option>
        ))}
      </select>
      {error ? (
        <span role="status" aria-live="polite" className="text-xs text-zinc-500">
          {error}
        </span>
      ) : null}
    </div>
  );
}
