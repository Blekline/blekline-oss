# Blekline examples

SPDX-License-Identifier: Apache-2.0

Runnable samples for the **execution platform client** (policy, act runs, ingress). **Cells execute on [app.blekline.com](https://app.blekline.com)**, not in this folder.

Third-party names (Mistral, Fireworks, LangChain, etc.) are **integration targets only**. Blekline is not affiliated with those vendors.

## Platform path (all examples)

1. [Sign up](https://app.blekline.com/auth/signup) and create an API key ([API keys](https://app.blekline.com/docs/api-keys)).
2. [Publish runtime policy](https://app.blekline.com/docs/runtime-policy).
3. Run a **cells** example or wire **ingress** / MCP for your IDE.

## Categories

| Category | Path | Description |
| -------- | ---- | ----------- |
| Cells | [cells/](cells/) | `createCellRun` and REST variants |
| Ingress | [ingress/](ingress/) | MCP proxy, local SDK mask/enforce |
| Model providers | [model-providers/](model-providers/) | Governed prompts before BYOK upstream (Mistral, Fireworks) |
| Frameworks | [frameworks/](frameworks/) | LangChain, Vercel AI SDK patterns |
| Agents | [agents/](agents/) | Coding agents and SWE (MCP pack index) |
| CI | [ci/](ci/) | Cluster posture gate |

## Quick commands

```bash
npx -y @blekline/init
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_WORKFLOW_ID="wf_..."
node examples/cells/first-act-run/index.mjs
```

Moved from `examples/first-act-run/` → `examples/cells/first-act-run/` (one release: old path README redirects).