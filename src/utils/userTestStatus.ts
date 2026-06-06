export type NormalizedUserTestStatus =
  | "not_attempted"
  | "initialized"
  | "in_progress"
  | "submitted"
  | "in_gradding"
  | "graded"
  | "failed"
  | "unknown";

export const normalizeUserTestStatus = (raw: unknown): NormalizedUserTestStatus => {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ");

  if (!s) return "unknown";
  if (s === "not attempted" || s === "not_attempted") return "not_attempted";
  if (s === "initialized") return "initialized";
  if (s === "in progress" || s === "in_progress") return "in_progress";
  if (s === "submitted") return "submitted";
  if (s === "in gradding" || s === "in grading" || s === "grading" || s === "in_gradding")
    return "in_gradding";
  if (s === "graded" || s === "gradded") return "graded";
  if (s === "failed") return "failed";
  return "unknown";
};

export const deriveUserTestState = (t: {
  status?: unknown;
  attempted?: boolean;
  user_test_mapping_id?: string | null;
}): NormalizedUserTestStatus => {
  const normalized = normalizeUserTestStatus(t.status);
  if (normalized !== "unknown") return normalized;

  const started = Boolean(t.attempted) || Boolean(t.user_test_mapping_id);
  if (!started) return "not_attempted";
  return "initialized";
};
