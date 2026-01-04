import { err, ok, type Result } from "neverthrow";

type ToolPreset = "minimal" | "readonly" | "full";

export type ScrapboxConfig = {
  project: string;
  cookie: string;
  enabledTools: Set<string>;
  enableDelete: boolean;
};

type ConfigError = {
  code: "MISSING_PROJECT" | "MISSING_COOKIE";
  message: string;
};

const PRESET_TOOLS: Record<ToolPreset, readonly string[]> = {
  minimal: ["list_pages", "get_page"],
  readonly: [
    "list_pages",
    "get_page",
    "search_pages",
    "get_links",
    "get_backlinks",
  ],
  full: [
    "list_pages",
    "get_page",
    "search_pages",
    "get_links",
    "get_backlinks",
    "create_page",
    "update_page",
    "delete_page",
  ],
};

function loadConfig(): Result<ScrapboxConfig, ConfigError> {
  const project = process.env.SCRAPBOX_PROJECT;
  if (!project) {
    return err({
      code: "MISSING_PROJECT",
      message: "SCRAPBOX_PROJECT environment variable is required",
    });
  }

  const cookie = process.env.SCRAPBOX_COOKIE;
  if (!cookie) {
    return err({
      code: "MISSING_COOKIE",
      message: "SCRAPBOX_COOKIE environment variable is required",
    });
  }

  const enableDelete = process.env.SCRAPBOX_ENABLE_DELETE === "true";
  const enabledTools = resolveEnabledTools(enableDelete);

  return ok({
    project,
    cookie,
    enabledTools,
    enableDelete,
  });
}

function resolveEnabledTools(enableDelete: boolean): Set<string> {
  const toolsEnv = process.env.SCRAPBOX_TOOLS;
  if (toolsEnv) {
    const tools = new Set(toolsEnv.split(",").map((t) => t.trim()));
    if (!enableDelete) {
      tools.delete("delete_page");
    }
    return tools;
  }

  const preset = (process.env.SCRAPBOX_PRESET as ToolPreset) || "full";
  const tools = new Set(PRESET_TOOLS[preset] ?? PRESET_TOOLS.full);

  if (!enableDelete) {
    tools.delete("delete_page");
  }

  return tools;
}

let cachedConfig: ScrapboxConfig | null = null;

export function getConfig(): ScrapboxConfig {
  if (!cachedConfig) {
    const result = loadConfig();
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    cachedConfig = result.value;
  }
  return cachedConfig;
}

export function isToolEnabled(toolName: string): boolean {
  return getConfig().enabledTools.has(toolName);
}
