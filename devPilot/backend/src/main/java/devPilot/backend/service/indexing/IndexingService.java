package devPilot.backend.service.indexing;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import devPilot.backend.entity.IndexStatus;
import devPilot.backend.entity.Repository;
import devPilot.backend.entity.User;
import devPilot.backend.exception.BadRequestException;
import devPilot.backend.exception.NotFoundException;
import devPilot.backend.repository.RepositoryRepository;
import devPilot.backend.service.UserService;
import devPilot.backend.service.github.GitHubApiClient;
import devPilot.backend.service.github.GitHubRateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndexingService {

    private final RepositoryRepository repositoryRepository;
    private final UserService userService;
    private final GitHubApiClient gitHubApiClient;
    private final CodeFileFilter fileFilter;
    private final CodeChunker codeChunker;
    private final VectorStore vectorStore;
    private final GitHubRateLimiter rateLimiter;

    @Value("${app.indexing.max-file-bytes:102400}")
    private long maxFileBytes;

    @Transactional
    public Repository startIndexing(UUID repoId, UUID userId) {
        Repository repo = repositoryRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new NotFoundException("Repository not found"));

        if (repo.getIndexStatus() == IndexStatus.INDEXING) {
            throw new BadRequestException("Repository is already being indexed");
        }

        repo.setIndexStatus(IndexStatus.INDEXING);
        repo.setFilesProcessed(0);
        repo.setFilesTotal(0);
        repo.setChunkCount(0);
        repo.setErrorMessage(null);
        repo.setUpdatedAt(Instant.now());
        return repositoryRepository.save(repo);
    }

    @Async("indexingExecutor")
    public void indexAsync(UUID repoId, UUID userId) {
        try {
            doIndex(repoId, userId);
        } catch (Exception ex) {
            log.error("Indexing failed for repo {}", repoId, ex);
            markFailed(repoId, ex.getMessage());
        }
    }

    private void doIndex(UUID repoId, UUID userId) {
        Repository repo = repositoryRepository.findById(repoId)
                .orElseThrow(() -> new NotFoundException("Repository not found"));
        User user = userService.requireById(userId);
        String token = userService.decryptAccessToken(user);

        deleteExistingVectors(repoId.toString());

        Map<String, Object> tree = gitHubApiClient.getRepoTree(
                token, repo.getOwner(), repo.getName(), repo.getDefaultBranch());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> entries = tree != null
                ? (List<Map<String, Object>>) tree.get("tree")
                : List.of();

        List<Map<String, Object>> eligible = new ArrayList<>();
        for (Map<String, Object> entry : entries) {
            if (!"blob".equals(String.valueOf(entry.get("type")))) {
                continue;
            }
            String path = String.valueOf(entry.get("path"));
            long size = entry.get("size") instanceof Number n ? n.longValue() : 0L;
            if (fileFilter.isEligible(path, size, maxFileBytes)) {
                eligible.add(entry);
            }
        }

        updateProgress(repoId, eligible.size(), 0, 0, IndexStatus.INDEXING, null);

        int processed = 0;
        int totalChunks = 0;
        List<Document> batch = new ArrayList<>();

        for (Map<String, Object> entry : eligible) {
            String path = String.valueOf(entry.get("path"));
            try {
                String content = gitHubApiClient.getFileContent(
                        token, repo.getOwner(), repo.getName(), path);
                List<Document> chunks = codeChunker.chunkFile(repoId.toString(), path, content);
                batch.addAll(chunks);
                totalChunks += chunks.size();

                if (batch.size() >= 32) {
                    vectorStore.add(batch);
                    batch.clear();
                }
            } catch (Exception ex) {
                log.warn("Skipping file {} in {}: {}", path, repo.getFullName(), ex.getMessage());
            }

            processed++;
            if (processed % 5 == 0 || processed == eligible.size()) {
                updateProgress(repoId, eligible.size(), processed, totalChunks, IndexStatus.INDEXING, null);
            }

            // Gentle rate limiting for GitHub API
            rateLimiter.pause();
        }

        if (!batch.isEmpty()) {
            vectorStore.add(batch);
        }

        Repository ready = repositoryRepository.findById(repoId).orElseThrow();
        ready.setIndexStatus(IndexStatus.READY);
        ready.setFilesTotal(eligible.size());
        ready.setFilesProcessed(processed);
        ready.setChunkCount(totalChunks);
        ready.setIndexedAt(Instant.now());
        ready.setErrorMessage(null);
        ready.setUpdatedAt(Instant.now());
        repositoryRepository.save(ready);
        log.info("Indexed {} files ({} chunks) for {}", processed, totalChunks, ready.getFullName());
    }

    private void deleteExistingVectors(String repoId) {
        try {
            FilterExpressionBuilder b = new FilterExpressionBuilder();
            vectorStore.delete(b.eq("repoId", repoId).build());
        } catch (Exception ex) {
            log.warn("Could not delete existing vectors for repo {}: {}", repoId, ex.getMessage());
        }
    }

    @Transactional
    protected void updateProgress(
            UUID repoId,
            int total,
            int processed,
            int chunks,
            IndexStatus status,
            String error) {
        repositoryRepository.findById(repoId).ifPresent(repo -> {
            repo.setFilesTotal(total);
            repo.setFilesProcessed(processed);
            repo.setChunkCount(chunks);
            repo.setIndexStatus(status);
            repo.setErrorMessage(error);
            repo.setUpdatedAt(Instant.now());
            repositoryRepository.save(repo);
        });
    }

    @Transactional
    protected void markFailed(UUID repoId, String message) {
        repositoryRepository.findById(repoId).ifPresent(repo -> {
            repo.setIndexStatus(IndexStatus.FAILED);
            repo.setErrorMessage(message != null && message.length() > 2000
                    ? message.substring(0, 2000)
                    : message);
            repo.setUpdatedAt(Instant.now());
            repositoryRepository.save(repo);
        });
    }
}
