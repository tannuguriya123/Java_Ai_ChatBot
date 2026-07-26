"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

import { RepoCard } from "@/components/dashboard/repo-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { useRefreshRepos, useRepos } from "@/hooks/use-repos";
import { FolderGit2 } from "lucide-react";
import type { IndexStatus } from "@/lib/api";

type FilterStatus = "ALL" | IndexStatus;

export function RepoDashboard() {
  const reposQuery = useRepos(true);
  const refresh = useRefreshRepos();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("ALL");
  const [visibility, setVisibility] = useState<"all" | "public" | "private">(
    "all"
  );

  const filtered = useMemo(() => {
    const list = reposQuery.data ?? [];
    const q = search.trim().toLowerCase();

    return list.filter((repo) => {
      if (status !== "ALL" && repo.indexStatus !== status) return false;
      if (visibility === "private" && !repo.isPrivate) return false;
      if (visibility === "public" && repo.isPrivate) return false;
      if (!q) return true;
      return (
        repo.fullName.toLowerCase().includes(q) ||
        (repo.description ?? "").toLowerCase().includes(q) ||
        (repo.language ?? "").toLowerCase().includes(q)
      );
    });
  }, [reposQuery.data, search, status, visibility]);

  const readyCount =
    reposQuery.data?.filter((r) => r.indexStatus === "READY").length ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Repositories
          </h2>
          <p className="text-sm text-muted-foreground">
            {reposQuery.data
              ? `${reposQuery.data.length} connected · ${readyCount} ready to chat`
              : "Load your GitHub repositories and index one to start chatting."}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, language…"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending || reposQuery.isFetching}
          >
            <RefreshCw
              data-icon="inline-start"
              className={
                refresh.isPending || reposQuery.isFetching
                  ? "animate-spin"
                  : undefined
              }
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          value={[visibility]}
          onValueChange={(value) => {
            const next = value[0] as typeof visibility | undefined;
            if (next) setVisibility(next);
          }}
          variant="outline"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="public">Public</ToggleGroupItem>
          <ToggleGroupItem value="private">Private</ToggleGroupItem>
        </ToggleGroup>

        <Select
          value={status}
          onValueChange={(value) => {
            if (value) setStatus(value as FilterStatus);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="READY">Ready</SelectItem>
            <SelectItem value="INDEXING">Indexing</SelectItem>
            <SelectItem value="PENDING">Not indexed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reposQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      )}

      {reposQuery.isError && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderGit2 />
            </EmptyMedia>
            <EmptyTitle>Couldn’t load repositories</EmptyTitle>
            <EmptyDescription>
              {(reposQuery.error as Error).message}
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => void reposQuery.refetch()}>Try again</Button>
        </Empty>
      )}

      {reposQuery.isSuccess && filtered.length === 0 && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderGit2 />
            </EmptyMedia>
            <EmptyTitle>No repositories match</EmptyTitle>
            <EmptyDescription>
              Try clearing filters or refreshing your GitHub repo list.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {reposQuery.isSuccess && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}
