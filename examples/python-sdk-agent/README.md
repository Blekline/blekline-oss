# Python SDK agent example

## Setup

From repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r examples/python-sdk-agent/requirements.txt
```

Or editable install only:

```bash
pip install -e packages/client-python
```

## Run

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_API_URL="https://app.blekline.com"
python examples/python-sdk-agent/main.py
```

## Tests (no live API)

```bash
pip install -e "packages/client-python[dev]"
pytest packages/client-python/tests -q
```
