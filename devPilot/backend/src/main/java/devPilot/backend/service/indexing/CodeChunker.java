package devPilot.backend.service.indexing;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.ai.document.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CodeChunker {

    private final int chunkSize;
    private final int chunkOverlap;
    private final CodeFileFilter fileFilter;

    public CodeChunker(
            @Value("${app.indexing.chunk-size:800}") int chunkSize,
            @Value("${app.indexing.chunk-overlap:100}") int chunkOverlap,
            CodeFileFilter fileFilter) {
        this.chunkSize = Math.max(200, chunkSize);
        this.chunkOverlap = Math.max(0, Math.min(chunkOverlap, this.chunkSize / 2));
        this.fileFilter = fileFilter;
    }

    public List<Document> chunkFile(String repoId, String filePath, String content) {
        List<Document> documents = new ArrayList<>();
        if (content == null || content.isBlank()) {
            return documents;
        }

        String[] lines = content.split("\n", -1);
        String language = fileFilter.detectLanguage(filePath);
        int chunkIndex = 0;
        int startLine = 1;
        StringBuilder buffer = new StringBuilder();

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            if (buffer.length() + line.length() + 1 > chunkSize && buffer.length() > 0) {
                documents.add(toDocument(repoId, filePath, language, chunkIndex++, startLine, i, buffer.toString()));
                String overlapText = takeOverlap(buffer.toString());
                buffer.setLength(0);
                buffer.append(overlapText);
                if (!overlapText.isEmpty() && !overlapText.endsWith("\n")) {
                    buffer.append('\n');
                }
                startLine = Math.max(1, i + 1 - countLines(overlapText));
            }
            buffer.append(line).append('\n');
        }

        if (buffer.length() > 0) {
            documents.add(toDocument(
                    repoId, filePath, language, chunkIndex, startLine, lines.length, buffer.toString().trim()));
        }
        return documents;
    }

    private Document toDocument(
            String repoId,
            String filePath,
            String language,
            int chunkIndex,
            int startLine,
            int endLine,
            String text) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("repoId", repoId);
        metadata.put("filePath", filePath);
        metadata.put("language", language);
        metadata.put("chunkIndex", chunkIndex);
        metadata.put("startLine", startLine);
        metadata.put("endLine", Math.max(startLine, endLine));

        String prefixed = "// File: " + filePath + " (lines " + startLine + "-" + endLine + ")\n" + text;
        return new Document(prefixed, metadata);
    }

    private String takeOverlap(String text) {
        if (chunkOverlap <= 0 || text.length() <= chunkOverlap) {
            return text;
        }
        return text.substring(text.length() - chunkOverlap);
    }

    private int countLines(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        int count = 1;
        for (int i = 0; i < text.length(); i++) {
            if (text.charAt(i) == '\n') {
                count++;
            }
        }
        return count;
    }
}
