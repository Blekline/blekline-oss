#!/usr/bin/env node
import { BleklineClient } from "../packages/client/dist/index.js";

const token = process.env.BLEKLINE_WORKSPACE_TOKEN;
if (!token) {
  console.error("Set BLEKLINE_WORKSPACE_TOKEN to run demo:sdk");
  process.exit(1);
}

const client = new BleklineClient({
  baseUrl: process.env.BLEKLINE_API_URL,
  workspaceToken: token,
  metadata: { clientSurface: "sdk" },
});

const sample = "Contact john@acme.com with key AKIAIOSFODNN7EXAMPLE";
const masked = await client.mask({ text: sample, platform: "SDK-Demo" });
console.log(JSON.stringify({ entitiesMasked: masked.entitiesMasked, decision: masked.decision }, null, 2));
