"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ExternalLink,
  Lock,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import { IndexStatusBadge, RepoMeta } from "@/components/dashboard/repo-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { getRepoProgress, useStartIndexing } from "@/hooks/use-repos";
import type { Repository } from "@/lib/api";

export function RepoCard({ repo }: { repo: Repository }) {
  const router = useRouter();
  const indexMutation = useStartIndexing();
  const isIndexing = repo.indexStatus === "INDEXING" || indexMutation.isPending;
  const progress = getRepoProgress(repo);

  function openChat() {
    router.push(`/chat/${repo.id}`);
  }

  function handlePrimary() {
    if (repo.indexStatus === "READY") {
      openChat();
      return;
    }
    indexMutation.mutate(repo.id, {
      onSuccess: () => router.push(`/chat/${repo.id}`),
    });
  }

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base">{repo.fullName}</CardTitle>
            <CardDescription className="line-clamp-2 min-h-10">
              {repo.description || "No description provided."}
            </CardDescription>
          </div>
          <IndexStatusBadge status={repo.indexStatus} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {repo.isPrivate && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Lock className="size-3" />
              Private
            </span>
          )}
          <RepoMeta repo={repo} />
        </div>

        {isIndexing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Indexing files…</span>
              <span>
                {repo.filesProcessed}/{repo.filesTotal || "?"}
              </span>
            </div>
            <Progress value={progress || 8} />
          </div>
        )}

        {repo.indexStatus === "FAILED" && repo.errorMessage && (
          <p className="line-clamp-2 text-xs text-destructive">
            {repo.errorMessage}
          </p>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-2 border-t">
        {repo.htmlUrl ? (
          <Button
            variant="ghost"
            size="sm"
            render={
              <a href={repo.htmlUrl} target="_blank" rel="noreferrer" />
            }
          >
            <ExternalLink data-icon="inline-start" />
            GitHub
          </Button>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          {repo.indexStatus === "READY" && (
            <Button variant="secondary" size="sm" onClick={openChat}>
              <MessageSquare data-icon="inline-start" />
              Open chat
            </Button>
          )}
          <Button size="sm" disabled={isIndexing} onClick={handlePrimary}>
            {isIndexing ? (
              <>
                <Spinner data-icon="inline-start" />
                Indexing
              </>
            ) : repo.indexStatus === "READY" ? (
              <>
                Re-open
                <ArrowRight data-icon="inline-end" />
              </>
            ) : (
              <>
                <Sparkles data-icon="inline-start" />
                {repo.indexStatus === "FAILED" ? "Retry index" : "Index & chat"}
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
