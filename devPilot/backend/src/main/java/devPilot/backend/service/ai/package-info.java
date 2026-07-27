/**
 * AI and RAG (Retrieval-Augmented Generation) building blocks.
 *
 * <p>DevPilot chat works in three stages:
 * <ol>
 *   <li><b>Index</b> — repository files are split into chunks and stored as vectors (see indexing package)</li>
 *   <li><b>Retrieve</b> — {@link devPilot.backend.service.ai.CodeContextRetriever} finds chunks similar to the user's question</li>
 *   <li><b>Generate</b> — {@link devPilot.backend.service.ai.ChatStreamHandler} sends those chunks + the question to OpenAI and streams the answer</li>
 * </ol>
 */
package devPilot.backend.service.ai;
