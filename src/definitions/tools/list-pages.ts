import { z } from "zod";
import { defineTool } from "@/definitions/define.ts";
import { ScrapboxClient } from "@/features/scrapbox-client/scrapbox-client.ts";

export const listPagesTool = defineTool({
  name: "list_pages",
  title: "List Pages",
  description:
    "プロジェクト内の全ページ一覧を取得。ソート順やページネーションを指定可能。",
  inputSchema: {
    limit: z
      .number()
      .min(1)
      .max(1000)
      .optional()
      .describe("取得件数（デフォルト: 100、最大: 1000）"),
    skip: z
      .number()
      .min(0)
      .optional()
      .describe("スキップ件数（デフォルト: 0）"),
    sort: z
      .enum(["updated", "created", "accessed", "linked", "views", "title"])
      .optional()
      .describe("ソート順"),
  },
  handler: async ({ limit, skip, sort }) => {
    const client = ScrapboxClient.getInstance();
    const result = await client.listPages({ limit, skip, sort });

    if (result.isErr()) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: result.error.message }],
      };
    }

    const { pages, count } = result.value;
    const output = [
      `Found ${count} pages:`,
      "",
      ...pages.map(
        (page) =>
          `- ${page.title} (updated: ${new Date(page.updated * 1000).toISOString()})`,
      ),
    ].join("\n");

    return {
      content: [{ type: "text" as const, text: output }],
    };
  },
});
