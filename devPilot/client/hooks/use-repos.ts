"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type Repository } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/components/ui/toast";

export function useRepos(refresh = true) {
  return useQuery({
    queryKey: queryKeys.repos.list(refresh),
    queryFn: () => api.listRepos(refresh),
    staleTime: 30_000,
  });
}

export function useRepository(repoId: string) {
  return useQuery({
    queryKey: queryKeys.repos.detail(repoId),
    queryFn: () => api.getRepo(repoId),
    enabled: Boolean(repoId),
    refetchInterval: (query) =>
      query.state.data?.indexStatus === "INDEXING" ? 2000 : false,
  });
}

export function useIndexStatus(repoId: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.repos.status(repoId),
    queryFn: () => api.indexStatus(repoId),
    enabled: Boolean(repoId) && enabled,
    refetchInterval: (query) =>
      query.state.data?.indexStatus === "INDEXING" ? 1500 : false,
  });
}

export function useStartIndexing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoId: string) => api.startIndex(repoId),
    onSuccess: (repo) => {
      queryClient.setQueryData(queryKeys.repos.detail(repo.id), repo);
      void queryClient.invalidateQueries({ queryKey: queryKeys.repos.all });
      toast.add({
        title: "Indexing started",
        description: `Indexing ${repo.fullName}…`,
        type: "loading",
      });
    },
    onError: (error: Error) => {
      toast.add({
        title: "Could not start indexing",
        description: error.message,
        type: "error",
      });
    },
  });
}

export function useRefreshRepos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.listRepos(true),
    onSuccess: (repos) => {
      queryClient.setQueryData(queryKeys.repos.list(true), repos);
      toast.add({
        title: "Repositories refreshed",
        description: `${repos.length} repositories loaded`,
        type: "success",
      });
    },
    onError: (error: Error) => {
      toast.add({
        title: "Refresh failed",
        description: error.message,
        type: "error",
      });
    },
  });
}

export function getRepoProgress(repo: Pick<
  Repository,
  "filesProcessed" | "filesTotal"
>) {
  if (!repo.filesTotal) return 0;
  return Math.min(100, Math.round((repo.filesProcessed / repo.filesTotal) * 100));
}
