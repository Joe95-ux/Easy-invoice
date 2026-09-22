export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Avoid failing `next build` when secrets aren't present in the build environment.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertProductionEnv } = await import("@/lib/env");
  assertProductionEnv();
}
