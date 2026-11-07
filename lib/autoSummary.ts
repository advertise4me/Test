/**
 * Fixed internal prompt the chat screen sends automatically, as the very
 * first message of a fresh conversation, to produce the opening account
 * summary. Shared between the frontend trigger and the chat system prompt
 * so the two stay in sync - see the "When generating the opening account
 * summary" section in app/api/chat/route.ts.
 */
export const AUTO_SUMMARY_PROMPT = "Give me a quick summary of my account and your top 3 recommendations.";
