import { readFile } from "node:fs/promises";
import { fetchInstagramMetadata } from "../api/_instagram-metadata";

type SpikeTarget = { label: string; url: string };

const parseTargets = (value: string): SpikeTarget[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as Array<string | { label?: string; url?: string }>;
    return parsed.flatMap((entry, index) => {
      if (typeof entry === "string") return [{ label: `target-${index + 1}`, url: entry }];
      return entry.url ? [{ label: entry.label || `target-${index + 1}`, url: entry.url }] : [];
    });
  }

  return trimmed
    .split(/\r?\n/)
    .map((url, index) => ({ label: `target-${index + 1}`, url: url.trim() }))
    .filter(({ url }) => Boolean(url));
};

const getTargets = async (): Promise<SpikeTarget[]> => {
  const commandLineUrls = process.argv.slice(2);
  if (commandLineUrls.length) {
    return commandLineUrls.map((url, index) => ({ label: `target-${index + 1}`, url }));
  }

  if (process.env.INSTAGRAM_SPIKE_URLS_FILE) {
    return parseTargets(await readFile(process.env.INSTAGRAM_SPIKE_URLS_FILE, "utf8"));
  }

  return parseTargets(process.env.INSTAGRAM_SPIKE_URLS ?? "");
};

const getRepeatCount = (): number => {
  const requested = Number.parseInt(process.env.INSTAGRAM_SPIKE_REPEAT ?? "2", 10);
  return Number.isFinite(requested) ? Math.min(5, Math.max(1, requested)) : 2;
};

const suppliedTargets = await getTargets();
const targets = suppliedTargets.slice(0, 20);
if (suppliedTargets.length > targets.length) {
  console.warn(`Only the first ${targets.length} targets will run; bulk crawling is intentionally disabled.`);
}
if (!targets.length) {
  console.error("No URLs supplied. Set INSTAGRAM_SPIKE_URLS, INSTAGRAM_SPIKE_URLS_FILE, or pass URLs as arguments.");
  process.exitCode = 1;
} else {
  const repeatCount = getRepeatCount();
  const rows: Array<Record<string, unknown>> = [];

  for (const target of targets) {
    for (let attempt = 1; attempt <= repeatCount; attempt += 1) {
      const result = await fetchInstagramMetadata(target.url);
      const row = { label: target.label, attempt, ...result };
      rows.push(row);
      console.log(JSON.stringify(row));
    }
  }

  const successfulRows = rows.filter((row) => row.ok === true);
  const responseTimes = rows
    .map((row) => typeof row.responseTimeMs === "number" ? row.responseTimeMs : undefined)
    .filter((value): value is number => value !== undefined);
  const exactSignaturesByLabel = new Map<string, Set<string>>();
  const fieldSignaturesByLabel = new Map<string, Set<string>>();
  for (const row of rows) {
    const label = String(row.label);
    const signature = JSON.stringify({
      ok: row.ok,
      normalizedUrl: row.normalizedUrl,
      type: row.type,
      typeCandidates: row.typeCandidates,
      username: row.username,
      caption: row.caption,
      title: row.title,
      thumbnailUrl: row.thumbnailUrl,
      source: row.source,
      upstreamStatus: row.upstreamStatus,
      reason: row.reason,
    });
    const exactSignatures = exactSignaturesByLabel.get(label) ?? new Set<string>();
    exactSignatures.add(signature);
    exactSignaturesByLabel.set(label, exactSignatures);

    const fieldSignature = JSON.stringify({
      ok: row.ok,
      normalizedUrl: row.normalizedUrl,
      type: row.type,
      typeCandidates: row.typeCandidates,
      username: row.username,
      caption: row.caption,
      title: row.title,
      thumbnailAvailable: Boolean(row.thumbnailUrl),
      source: row.source,
      upstreamStatus: row.upstreamStatus,
      reason: row.reason,
    });
    const fieldSignatures = fieldSignaturesByLabel.get(label) ?? new Set<string>();
    fieldSignatures.add(fieldSignature);
    fieldSignaturesByLabel.set(label, fieldSignatures);
  }

  console.log(JSON.stringify({
    summary: true,
    targetCount: targets.length,
    repeatCount,
    requestCount: rows.length,
    successCount: successfulRows.length,
    averageResponseTimeMs: responseTimes.length
      ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
      : undefined,
    fieldConsistentLabels: [...fieldSignaturesByLabel.entries()]
      .filter(([, signatures]) => signatures.size === 1)
      .map(([label]) => label),
    fieldInconsistentLabels: [...fieldSignaturesByLabel.entries()]
      .filter(([, signatures]) => signatures.size > 1)
      .map(([label]) => label),
    exactConsistentLabels: [...exactSignaturesByLabel.entries()]
      .filter(([, signatures]) => signatures.size === 1)
      .map(([label]) => label),
    exactInconsistentLabels: [...exactSignaturesByLabel.entries()]
      .filter(([, signatures]) => signatures.size > 1)
      .map(([label]) => label),
  }));
}
