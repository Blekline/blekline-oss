import * as vscode from "vscode";
import { CLIENT_SURFACE, SECRET_WORKSPACE_TOKEN, getApiUrl, getWorkspaceToken } from "./config";

function npxCommand(): string {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function stdioDefinition(env: Record<string, string | number | null>): vscode.McpStdioServerDefinition {
  return new vscode.McpStdioServerDefinition(
    "blekline",
    npxCommand(),
    ["-y", "@blekline/mcp-server"],
    env,
    "0.1.0",
  );
}

/**
 * Contributes `@blekline/mcp-server` over stdio via `npx -y @blekline/mcp-server`.
 * Token is injected in resolve so it is not listed in the unsynced definition.
 */
export function registerMcpContributor(context: vscode.ExtensionContext): vscode.Disposable {
  const didChange = new vscode.EventEmitter<void>();
  context.subscriptions.push(didChange);
  context.subscriptions.push(
    context.secrets.onDidChange((event) => {
      if (event.key === SECRET_WORKSPACE_TOKEN) didChange.fire();
    }),
  );

  const provider: vscode.McpServerDefinitionProvider = {
    onDidChangeMcpServerDefinitions: didChange.event,
    provideMcpServerDefinitions() {
      return [stdioDefinition({})];
    },
    async resolveMcpServerDefinition(server) {
      if (server.label !== "blekline") return server;
      const workspaceToken = await getWorkspaceToken(context.secrets);
      const env: Record<string, string | number | null> = {
        BLEKLINE_API_URL: getApiUrl(),
        BLEKLINE_CLIENT_SURFACE: CLIENT_SURFACE,
      };
      if (workspaceToken) env.BLEKLINE_WORKSPACE_TOKEN = workspaceToken;
      return stdioDefinition(env);
    },
  };

  return vscode.lm.registerMcpServerDefinitionProvider("blekline", provider);
}
