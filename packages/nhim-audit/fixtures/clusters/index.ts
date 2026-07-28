import type { ClusterSnapshot } from "../../src/types.js";

export const brokenCluster: ClusterSnapshot = {
  clusterName: "kind-blekline-nhim",
  namespaces: ["default", "agent-ns", "blekline"],
  pods: [],
  deployments: [
    {
      namespace: "default",
      name: "langgraph-worker",
      labels: { app: "langgraph-worker", "app.kubernetes.io/component": "agent" },
      annotations: {},
      containers: ["langgraph-worker"],
      envKeys: ["OPENAI_API_KEY", "LANGCHAIN_TRACING_V2"],
      image: "langchain/langgraph-api:latest",
    },
    {
      namespace: "agent-ns",
      name: "crew-runner",
      labels: { app: "crew-runner" },
      annotations: {},
      containers: ["crew-runner"],
      envKeys: ["ANTHROPIC_API_KEY", "MCP_SERVER_URL"],
      image: "crewai/runner:latest",
    },
  ],
  replicaSets: [],
  statefulSets: [],
  networkPolicies: [],
  mutatingWebhooks: [],
  validatingWebhooks: [],
  services: [],
  secrets: [],
  hasGatekeeper: false,
  hasBleklineHelm: false,
};

export const fixedCluster: ClusterSnapshot = {
  clusterName: "kind-blekline-nhim",
  namespaces: ["default", "agent-ns", "blekline"],
  pods: [],
  deployments: [
    {
      namespace: "default",
      name: "langgraph-worker",
      labels: { app: "langgraph-worker", "app.kubernetes.io/component": "agent" },
      annotations: { "blekline.com/inject-sidecar": "enabled" },
      containers: ["langgraph-worker", "blekline-sidecar"],
      envKeys: ["OPENAI_API_KEY", "BLEKLINE_SIDECAR_URL"],
      image: "langchain/langgraph-api:latest",
    },
  ],
  replicaSets: [],
  statefulSets: [],
  networkPolicies: [
    {
      namespace: "default",
      name: "agent-egress-deny",
      podSelector: { app: "langgraph-worker" },
      policyTypes: ["Egress"],
      egressRestricted: true,
      allowsSidecarHop: true,
    },
  ],
  mutatingWebhooks: [
    {
      name: "blekline-admission",
      failurePolicy: "Fail",
      matchesBlekline: true,
    },
  ],
  validatingWebhooks: [],
  services: [
    {
      namespace: "blekline",
      name: "blekline-sidecar",
      type: "ClusterIP",
      ports: [8787],
      selector: { app: "blekline-sidecar" },
    },
  ],
  secrets: [
    { namespace: "default", name: "blekline-sidecar-auth" },
  ],
  hasGatekeeper: true,
  hasBleklineHelm: true,
};

export const emptyCluster: ClusterSnapshot = {
  clusterName: "kind-empty",
  namespaces: ["default", "kube-system"],
  pods: [],
  deployments: [],
  replicaSets: [],
  statefulSets: [],
  networkPolicies: [],
  mutatingWebhooks: [],
  validatingWebhooks: [],
  services: [],
  secrets: [],
  hasGatekeeper: false,
  hasBleklineHelm: false,
};
