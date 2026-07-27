package devPilot.backend.service.ai;

import java.util.List;

import devPilot.backend.dto.CitationDto;

/**
 * Result of the retrieval step in RAG: relevant code snippets plus source citations.
 */
public record RetrievedContext(
        List<CitationDto> citations,
        String contextText) {
}
