"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { ProjectOverview } from "@/components/projects/project-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/tabs";

type ProjectDetail = {
  id: string;
  name: string;
  companyName: string | null;
  description: string | null;
  status: string;
  priority: string;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    role: string | null;
  }>;
  emails: Array<{
    id: string;
    from: string;
    to: string[];
    subject: string;
    status: string;
    sentAt: string;
  }>;
  files: Array<{
    id: string;
    filename: string;
    url: string;
    category: string;
    summary: string | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
  }>;
  notes: Array<{
    id: string;
    title: string | null;
    content: string;
    type: string;
    updatedAt: string;
  }>;
  followUps: Array<{
    id: string;
    title: string;
    notes: string | null;
    status: string;
    priority: string;
    dueDate: string | null;
  }>;
};

type ProjectResponse = {
  project?: ProjectDetail;
  error?: string;
};

type ProjectTabsProps = {
  projectId: string;
};

const tabs = [
  "Overview",
  "Contacts",
  "Emails",
  "Files",
  "Tasks",
  "Notes",
  "Follow Up",
  "AI Summary",
] as const;

type TabName = (typeof tabs)[number];

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function SimpleList<T>({
  empty,
  items,
  renderItem,
}: {
  empty: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={empty}
        description="Related records will appear here as the workspace fills in."
        className="min-h-48"
      />
    );
  }

  return (
    <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
      {items.map(renderItem)}
    </div>
  );
}

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<TabName>("Overview");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}`, {
      cache: "no-store",
    });
    const data = (await response.json()) as ProjectResponse;

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load project.");
    }

    return data.project ?? null;
  }, [projectId]);

  async function loadProject() {
    setIsLoading(true);
    setError(null);

    try {
      setProject(await fetchProject());
    } catch (loadError) {
      setProject(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load project.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialProject() {
      try {
        const initialProject = await fetchProject();

        if (isMounted) {
          setProject(initialProject);
        }
      } catch (loadError) {
        if (isMounted) {
          setProject(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load project.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialProject();

    return () => {
      isMounted = false;
    };
  }, [fetchProject]);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex h-52 items-center justify-center gap-2 text-sm text-zinc-500">
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
            Loading project
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !project) {
    return (
      <EmptyState
        title="Project is unavailable"
        description={error ?? "The requested project could not be loaded."}
        icon={<AlertCircle className="size-6" aria-hidden="true" />}
        action={{ label: "Retry", onClick: loadProject }}
      />
    );
  }

  return (
    <Tabs>
      <div className="overflow-x-auto pb-1">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab}
              active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsPanel active={activeTab === "Overview"}>
        <ProjectOverview project={project} />
      </TabsPanel>

      <TabsPanel active={activeTab === "Contacts"}>
        <SimpleList
          empty="No contacts linked"
          items={project.contacts}
          renderItem={(contact) => (
            <div key={contact.id} className="px-4 py-3">
              <p className="font-medium text-zinc-950">{contact.name}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {[contact.role, contact.company, contact.email, contact.phone]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>
          )}
        />
      </TabsPanel>

      <TabsPanel active={activeTab === "Emails"}>
        <SimpleList
          empty="No emails linked"
          items={project.emails}
          renderItem={(email) => (
            <div key={email.id} className="px-4 py-3">
              <p className="font-medium text-zinc-950">{email.subject}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {email.from} · {label(email.status)} · {formatDate(email.sentAt)}
              </p>
            </div>
          )}
        />
      </TabsPanel>

      <TabsPanel active={activeTab === "Files"}>
        <SimpleList
          empty="No files linked"
          items={project.files}
          renderItem={(file) => (
            <div key={file.id} className="px-4 py-3">
              <a
                href={`/api/files/${file.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-zinc-950 hover:underline"
              >
                {file.filename}
              </a>
              <p className="mt-1 text-sm text-zinc-500">
                {label(file.category)}
                {file.summary ? ` · ${file.summary}` : ""}
              </p>
            </div>
          )}
        />
      </TabsPanel>

      <TabsPanel active={activeTab === "Tasks"}>
        <SimpleList
          empty="No tasks linked"
          items={project.tasks}
          renderItem={(task) => (
            <div key={task.id} className="px-4 py-3">
              <p className="font-medium text-zinc-950">{task.title}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {label(task.status)} · {label(task.priority)} · Due{" "}
                {formatDate(task.dueDate)}
              </p>
            </div>
          )}
        />
      </TabsPanel>

      <TabsPanel active={activeTab === "Notes"}>
        <SimpleList
          empty="No notes linked"
          items={project.notes}
          renderItem={(note) => (
            <div key={note.id} className="px-4 py-3">
              <p className="font-medium text-zinc-950">
                {note.title ?? label(note.type)}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                {note.content}
              </p>
            </div>
          )}
        />
      </TabsPanel>

      <TabsPanel active={activeTab === "Follow Up"}>
        <SimpleList
          empty="No follow-ups linked"
          items={project.followUps}
          renderItem={(followUp) => (
            <div key={followUp.id} className="px-4 py-3">
              <p className="font-medium text-zinc-950">{followUp.title}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {label(followUp.status)} · {label(followUp.priority)} · Due{" "}
                {formatDate(followUp.dueDate)}
              </p>
              {followUp.notes ? (
                <p className="mt-2 text-sm text-zinc-600">{followUp.notes}</p>
              ) : null}
            </div>
          )}
        />
      </TabsPanel>

      <TabsPanel active={activeTab === "AI Summary"}>
        <Card>
          <CardHeader>
            <CardTitle>AI Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-zinc-600">
              AI-generated project summaries will appear here when the agent
              workflow is connected.
            </p>
          </CardContent>
        </Card>
      </TabsPanel>
    </Tabs>
  );
}
