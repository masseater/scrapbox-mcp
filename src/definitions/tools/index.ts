import { isToolEnabled } from "@/config.ts";
import { createPageTool } from "@/definitions/tools/create-page.ts";
import { deletePageTool } from "@/definitions/tools/delete-page.ts";
import { getBacklinksTool } from "@/definitions/tools/get-backlinks.ts";
import { getLinksTool } from "@/definitions/tools/get-links.ts";
import { getPageTool } from "@/definitions/tools/get-page.ts";
import { insertLinesTool } from "@/definitions/tools/insert-lines.ts";
import { listPagesTool } from "@/definitions/tools/list-pages.ts";
import { searchPagesTool } from "@/definitions/tools/search-pages.ts";
import { updatePageTool } from "@/definitions/tools/update-page.ts";

const allTools = [
  listPagesTool,
  getPageTool,
  searchPagesTool,
  getLinksTool,
  getBacklinksTool,
  createPageTool,
  updatePageTool,
  insertLinesTool,
  deletePageTool,
] as const;

export const tools = allTools.filter((tool) => isToolEnabled(tool.name));
