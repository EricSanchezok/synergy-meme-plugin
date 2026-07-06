import { templates } from "../src/data/templates.generated";
import { searchMemeTemplates } from "../src/tools/search";

// ---- Types ----

interface Fixture {
  id: string;
  category?: string;
  query: string;
  lineCount?: number;
  style?: string;
  minLines?: number;
  acceptableTop3?: string[];
  acceptableTop5?: string[];
  acceptEmpty?: boolean;
}

interface Candidate {
  id: string;
  name: string;
  lines: number;
  styles: string[];
  score: number;
  bestFor: string;
  keywords: string[];
  fit: string;
}

interface FixtureResult {
  fixture: Fixture;
  candidates: Candidate[];
  top3Pass: boolean | null;
  top5Pass: boolean | null;
}

// ---- Helpers ----

function pad(value: string, width: number): string {
  return value.length >= width
    ? value
    : value + " ".repeat(width - value.length);
}

function truncate(value: string, width: number): string {
  if (value.length <= width) return value;
  if (width <= 1) return value.slice(0, width);
  return `${value.slice(0, width - 1)}…`;
}

// ---- Main ----

async function runFixture(fixture: Fixture): Promise<FixtureResult> {
  const args: Record<string, unknown> = {};
  if (fixture.query) args.query = fixture.query;
  if (fixture.lineCount) args.lineCount = fixture.lineCount;
  if (fixture.style) args.style = fixture.style;
  if (fixture.minLines) args.minLines = fixture.minLines;
  if (fixture.query === "" || (!fixture.query && !fixture.acceptEmpty))
    args.query = "";

  const limit = 8;
  const result = (await searchMemeTemplates.execute({ ...args, limit }, {
    sessionID: "eval-search",
    messageID: "eval-search",
    agent: "eval-search",
    abort: new AbortController().signal,
  } as any)) as { output: string };

  const parsed = JSON.parse(result.output) as {
    guidance: string;
    candidates: Candidate[];
  };
  const candidates = parsed.candidates.slice(0, limit);

  let top3Pass: boolean | null = null;
  if (fixture.acceptableTop3 && fixture.acceptableTop3.length > 0) {
    const top3Ids = new Set(candidates.slice(0, 3).map((c) => c.id));
    top3Pass = fixture.acceptableTop3.every((id) => top3Ids.has(id));
  }

  let top5Pass: boolean | null = null;
  if (fixture.acceptableTop5 && fixture.acceptableTop5.length > 0) {
    const top5Ids = new Set(candidates.slice(0, 5).map((c) => c.id));
    const matchCount = fixture.acceptableTop5.filter((id) =>
      top5Ids.has(id),
    ).length;
    top5Pass = matchCount >= 3;
  }

  return { fixture, candidates, top3Pass, top5Pass };
}

function printFixtureResult(result: FixtureResult, index: number): void {
  const { fixture, candidates, top3Pass, top5Pass } = result;
  const query =
    fixture.query || (fixture.acceptEmpty ? "(empty)" : fixture.query);

  // Overall status line
  const checks: string[] = [];
  if (top3Pass === true) checks.push("PASS(top3)");
  else if (top3Pass === false) checks.push("FAIL(top3)");
  else checks.push("--(top3)");

  if (top5Pass === true) checks.push("PASS(top5)");
  else if (top5Pass === false) checks.push("FAIL(top5)");
  else checks.push("--(top5)");

  const overallPass =
    (top3Pass === null || top3Pass === true) &&
    (top5Pass === null || top5Pass === true);
  const statusLabel = overallPass ? "PASS" : "FAIL";
  const statusStyle = overallPass ? "PASS" : "\x1b[31mFAIL\x1b[0m";

  console.log(`[${fixture.id}]  ${statusStyle}  ${checks.join("  ")}`);
  console.log(
    `  ${truncate(JSON.stringify(query), 64)}` +
      (fixture.lineCount ? ` (lines:${fixture.lineCount})` : ""),
  );

  // Top 8 results
  if (candidates.length === 0) {
    console.log("  (no candidates)");
    console.log("");
    return;
  }

  const topLine = candidates.slice(0, 3).map((c, i) => {
    const marker = i === 0 ? "\x1b[1m" : "";
    const end = i === 0 ? "\x1b[0m" : "";
    return `${marker}${i + 1}. ${c.id} (${c.score.toFixed(2)})${end}`;
  });
  console.log(`  ${topLine.join("  ")}`);

  if (candidates.length > 3) {
    const restLine = candidates.slice(3).map((c, i) => {
      return `${i + 4}. ${c.id} (${c.score.toFixed(2)})`;
    });
    console.log(`  ${restLine.join("  ")}`);
  }

  // Acceptable sets for context on failure
  if (top3Pass === false && fixture.acceptableTop3) {
    console.log(`  acceptableTop3: ${fixture.acceptableTop3.join(", ")}`);
  }
  if (top5Pass === false && fixture.acceptableTop5) {
    console.log(`  acceptableTop5: ${fixture.acceptableTop5.join(", ")}`);
  }

  console.log("");
}

function printSummary(results: FixtureResult[]): void {
  // Unique templates across all fixture top-8 results
  const allTopIds = results.flatMap((r) => r.candidates.map((c) => c.id));
  const uniqueTopIds = new Set(allTopIds);
  const poolSize = templates.length;
  const coveragePct = ((uniqueTopIds.size / poolSize) * 100).toFixed(1);

  console.log("=== Summary ===");
  console.log(
    `Unique in top-8: ${uniqueTopIds.size} / ${poolSize} (${coveragePct}%)`,
  );

  // Most repeated templates
  const counts = new Map<string, number>();
  for (const id of allTopIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10);

  console.log("Most repeated:");
  for (const [id, count] of sorted) {
    console.log(`  ${id}: ${count}`);
  }

  // Pass/fail tally
  const constraintCount = results.filter(
    (r) => r.top3Pass !== null || r.top5Pass !== null,
  ).length;
  const failed = results.filter(
    (r) => r.top3Pass === false || r.top5Pass === false,
  );
  const passed = constraintCount - failed.length;

  console.log("");
  console.log(
    `${passed}/${constraintCount} constraints passed, ${failed.length} failed`,
  );

  if (failed.length > 0) {
    const labels = failed.map((r) => r.fixture.id).join(", ");
    console.log(`Failed: ${labels}`);
  }
}

// ---- Entry ----

async function main(): Promise<void> {
  const fixturesPath = new URL(
    "../scripts/search-fixtures.json",
    import.meta.url,
  );
  const fixturesFile = Bun.file(fixturesPath);
  if (!(await fixturesFile.exists())) {
    console.error(`Fixtures file not found: ${fixturesPath.pathname}`);
    process.exit(1);
  }
  const fixtures: Fixture[] = await fixturesFile.json();

  console.log(`=== Fixtures: ${fixtures.length} queries ===\n`);

  const results: FixtureResult[] = [];
  for (const fixture of fixtures) {
    const result = await runFixture(fixture);
    results.push(result);
    printFixtureResult(result, results.length);
  }

  printSummary(results);

  const hasFailures = results.some(
    (r) => r.top3Pass === false || r.top5Pass === false,
  );
  process.exit(hasFailures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
