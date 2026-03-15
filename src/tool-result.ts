import { SrcmapError } from "./srcmap-client.js";

export const toTextResult = (
  text: string,
  structuredContent?: Record<string, unknown>,
) => ({
  content: [{ type: "text" as const, text }],
  ...(structuredContent ? { structuredContent } : {}),
});

const getRecoverySuggestion = (code: string, message: string): string | null => {
  if (code === "FETCH_ERROR") {
    if (message.includes("HTTP 404")) {
      return "URL not found. Verify the bundle URL is correct and publicly accessible.";
    }
    if (message.includes("HTTP 403") || message.includes("HTTP 401")) {
      return "Access denied. The URL may require authentication or be behind a CDN restriction.";
    }
    return "Network error. Verify the URL is correct and the server is reachable.";
  }

  if (code === "NOT_FOUND") {
    return "No mapping found at this position. Try nearby positions or verify line/column are 0-based.";
  }

  if (code === "PARSE_ERROR") {
    return "Invalid source map. Verify the file is a valid source map (JSON with version, mappings, sources fields).";
  }

  if (code === "IO_ERROR") {
    return "File not found or not readable. Check the file path.";
  }

  if (code === "PATH_TRAVERSAL") {
    return "Source name contains path traversal. The source map may be malformed.";
  }

  return null;
};

export const toErrorResult = (error: unknown) => {
  if (error instanceof SrcmapError) {
    const suggestion = getRecoverySuggestion(error.code, error.message);

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `srcmap error: ${error.message}`,
            `Code: ${error.code}`,
            suggestion ? `\nRecovery: ${suggestion}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: error instanceof Error ? error.message : String(error),
      },
    ],
    isError: true,
  };
};
