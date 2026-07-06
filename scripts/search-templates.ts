import { templates } from "../src/data/templates.generated";
import {
  isRandomMemeRequest,
  searchMemeTemplates,
  type MemeTemplateSearchInput,
} from "../src/tools/search";

interface CliOptions extends MemeTemplateSearchInput {
  json?: boolean;
  help?: boolean;
}

function usage() {
  return `Search bundled meme templates.

Usage:
  bun run search:templates -- "程序员 debug 半天发现少了分号" [options]
  bun run scripts/search-templates.ts "old way vs new way" --lines 2 --limit 12

Options:
  --limit, -n <number>       Maximum candidates to print (default: 12)
  --lines, -l <number>       Prefer templates with this caption line count
  --min-lines <number>       Only include templates supporting at least this many lines
  --style <style>            Filter by native style, or use unknown styles as search text
  --json                     Print machine-readable JSON
  --help, -h                 Show this help
`;
}

function readNumber(flag: string, value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} expects a positive integer`);
  }
  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const queryParts: string[] = [];
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--limit" || arg === "-n") {
      options.limit = readNumber(arg, argv[++index]);
      continue;
    }
    if (arg.startsWith("--limit=")) {
      options.limit = readNumber("--limit", arg.slice("--limit=".length));
      continue;
    }
    if (arg === "--lines" || arg === "--line-count" || arg === "-l") {
      options.lineCount = readNumber(arg, argv[++index]);
      continue;
    }
    if (arg.startsWith("--lines=")) {
      options.lineCount = readNumber("--lines", arg.slice("--lines=".length));
      continue;
    }
    if (arg.startsWith("--line-count=")) {
      options.lineCount = readNumber(
        "--line-count",
        arg.slice("--line-count=".length),
      );
      continue;
    }
    if (arg === "--min-lines") {
      options.minLines = readNumber(arg, argv[++index]);
      continue;
    }
    if (arg.startsWith("--min-lines=")) {
      options.minLines = readNumber(
        "--min-lines",
        arg.slice("--min-lines=".length),
      );
      continue;
    }
    if (arg === "--style") {
      options.style = argv[++index];
      continue;
    }
    if (arg.startsWith("--style=")) {
      options.style = arg.slice("--style=".length);
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    queryParts.push(arg);
  }

  options.query = queryParts.join(" ").trim();
  return options;
}

function pad(value: string, width: number) {
  return value.length >= width
    ? value
    : value + " ".repeat(width - value.length);
}

function truncate(value: string, width: number) {
  if (value.length <= width) return value;
  if (width <= 1) return value.slice(0, width);
  return `${value.slice(0, width - 1)}…`;
}

async function searchCandidates(options: CliOptions) {
  const result = (await searchMemeTemplates.execute(options, {
    sessionID: "search-templates-cli",
    messageID: "search-templates-cli",
    agent: "search-templates-cli",
    abort: new AbortController().signal,
  } as any)) as { output: string };
  return JSON.parse(result.output) as {
    guidance: string;
    candidates: Array<any>;
  };
}

async function printText(options: CliOptions) {
  const result = await searchCandidates(options);
  const candidates = result.candidates;
  const query = options.query || "(empty query)";

  console.log(`Query: ${query}`);
  console.log(`Templates: ${candidates.length}/${templates.length}`);
  if (options.lineCount) console.log(`Preferred lines: ${options.lineCount}`);
  if (options.minLines) console.log(`Minimum lines: ${options.minLines}`);
  if (options.style) console.log(`Style: ${options.style}`);
  if (isRandomMemeRequest(options.query)) {
    console.log(
      "Guidance: open-ended/random request — inspect several recognizable candidates instead of always using #1.",
    );
  }
  console.log("");

  if (candidates.length === 0) {
    console.log("No matching templates.");
    return;
  }

  const rows = candidates.map((candidate, index) => ({
    rank: `${index + 1}.`,
    id: candidate.id,
    score: candidate.score.toFixed(2),
    lines: String(candidate.lines),
    fit: candidate.fit,
    name: candidate.name,
    bestFor: candidate.bestFor,
  }));

  const widths = {
    rank: Math.max(2, ...rows.map((row) => row.rank.length)),
    id: Math.max(2, ...rows.map((row) => row.id.length)),
    score: Math.max(5, ...rows.map((row) => row.score.length)),
    lines: Math.max(5, ...rows.map((row) => row.lines.length)),
    fit: Math.max(3, ...rows.map((row) => row.fit.length)),
  };

  console.log(
    [
      pad("#", widths.rank),
      pad("id", widths.id),
      pad("score", widths.score),
      pad("lines", widths.lines),
      pad("fit", widths.fit),
      "name / best for",
    ].join("  "),
  );
  console.log("-".repeat(120));

  for (const row of rows) {
    console.log(
      [
        pad(row.rank, widths.rank),
        pad(row.id, widths.id),
        pad(row.score, widths.score),
        pad(row.lines, widths.lines),
        pad(row.fit, widths.fit),
        `${row.name} — ${truncate(row.bestFor, 72)}`,
      ].join("  "),
    );
  }
}

async function printJson(options: CliOptions) {
  const result = await searchCandidates(options);
  const candidates = result.candidates;
  console.log(
    JSON.stringify(
      {
        query: options.query ?? "",
        limit: options.limit ?? 12,
        lineCount: options.lineCount,
        minLines: options.minLines,
        style: options.style,
        totalTemplates: templates.length,
        count: candidates.length,
        candidates,
      },
      null,
      2,
    ),
  );
}

try {
  const options = parseArgs(Bun.argv.slice(2));
  if (options.help) {
    console.log(usage());
    process.exit(0);
  }
  if (options.json) await printJson(options);
  else await printText(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(usage());
  process.exit(1);
}
