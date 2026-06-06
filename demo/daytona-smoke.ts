/** @deprecated Use pnpm demo:sandbox-smoke with SANDBOX_PROVIDER=daytona */
process.env.SANDBOX_PROVIDER = process.env.SANDBOX_PROVIDER ?? "daytona";
await import("./sandbox-smoke/index.ts");
