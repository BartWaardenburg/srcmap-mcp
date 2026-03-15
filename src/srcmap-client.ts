import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { TtlCache } from "./cache.js";

const execFileAsync = promisify(execFile);

export class SrcmapError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "SrcmapError";
  }
}

export interface RetryOptions {
  maxRetries: number;
}

export class SrcmapClient {
  private readonly binary: string;
  private readonly cache: TtlCache;
  private readonly cachingEnabled: boolean;

  constructor(
    binary?: string,
    cacheTtlMs?: number,
  ) {
    this.binary = binary ?? "srcmap";
    const ttl = cacheTtlMs ?? 300_000;
    this.cache = new TtlCache(ttl);
    this.cachingEnabled = ttl > 0;
  }

  private async run(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync(this.binary, args, {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 60_000,
      });
      return stdout;
    } catch (error: unknown) {
      const err = error as { stderr?: string; code?: string; message?: string };
      const stderr = err.stderr ?? "";

      // Try to parse structured JSON error from stderr
      try {
        const parsed = JSON.parse(stderr) as { error: string; code: string };
        throw new SrcmapError(parsed.error, parsed.code);
      } catch (parseError) {
        if (parseError instanceof SrcmapError) throw parseError;
        throw new SrcmapError(
          stderr.replace(/^error:\s*/i, "").trim() || err.message || "srcmap command failed",
          "CLI_ERROR",
        );
      }
    }
  }

  private async runJson<T>(args: string[]): Promise<T> {
    const output = await this.run([...args, "--json"]);
    return JSON.parse(output) as T;
  }

  private async cachedRunJson<T>(cacheKey: string, args: string[]): Promise<T> {
    if (this.cachingEnabled) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== undefined) return cached;
    }

    const result = await this.runJson<T>(args);

    if (this.cachingEnabled) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  async info(file: string): Promise<Record<string, unknown>> {
    return this.cachedRunJson(`info:${file}`, ["info", file]);
  }

  async validate(file: string): Promise<Record<string, unknown>> {
    return this.cachedRunJson(`validate:${file}`, ["validate", file]);
  }

  async lookup(
    file: string,
    line: number,
    column: number,
    context?: number,
  ): Promise<Record<string, unknown>> {
    const args = ["lookup", file, String(line), String(column)];
    if (context !== undefined && context > 0) {
      args.push("--context", String(context));
    }
    return this.runJson(args);
  }

  async resolve(
    file: string,
    source: string,
    line: number,
    column: number,
  ): Promise<Record<string, unknown>> {
    return this.runJson(["resolve", file, "--source", source, String(line), String(column)]);
  }

  async sources(file: string): Promise<Record<string, unknown>> {
    return this.cachedRunJson(`sources:${file}`, ["sources", file]);
  }

  async sourcesExtract(file: string, outputDir: string): Promise<Record<string, unknown>> {
    return this.runJson(["sources", file, "--extract", "-o", outputDir]);
  }

  async fetch(url: string, outputDir: string): Promise<Record<string, unknown>> {
    return this.runJson(["fetch", url, "-o", outputDir]);
  }

  async mappings(
    file: string,
    options?: { source?: string; limit?: number; offset?: number },
  ): Promise<Record<string, unknown>> {
    const args = ["mappings", file];
    if (options?.source) args.push("--source", options.source);
    if (options?.limit !== undefined) args.push("--limit", String(options.limit));
    if (options?.offset !== undefined) args.push("--offset", String(options.offset));
    return this.runJson(args);
  }

  async symbolicate(input: string, maps: string[]): Promise<string> {
    const args = ["symbolicate", input];
    for (const map of maps) {
      args.push("--map", map);
    }
    return this.run([...args, "--json"]);
  }
}
