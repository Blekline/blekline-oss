# Example template

Copy this folder when adding a new integration example.

Required:

- `README.md` with **Platform path** (signup, policy, workflows-and-runs).
- `env.sample` (or document env vars in README) with `blw_...` placeholders only.
- One entry script (`index.mjs` or `main.py`).
- Fail-closed if token or prerequisites missing.

Optional: `verify.sh` for static CI smoke.

Use `@blekline/client` or `blekline_client` for API calls. Do not embed cell runtime or duplicate policy schemas.