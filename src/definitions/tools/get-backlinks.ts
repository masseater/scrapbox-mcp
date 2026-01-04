import { z } from "zod";
import { defineTool } from "@/definitions/define.ts";
import { ScrapboxClient } from "@/features/scrapbox-client/scrapbox-client.ts";

export const getBacklinksTool = defineTool({
  name: "get_backlinks",
  title: "Get Backlinks",
  description: "指定ページへのバックリンク（被リンク）一覧を取得。",
  inputSchema: {
    title: z.string().describe("ページタイトル"),
  },
  handler: async ({ title }) => {
    const client = ScrapboxClient.getInstance();
    const result = await client.getBacklinks(title);

    if (result.isErr()) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: result.error.message }],
      };
    }

    const backlinks = result.value;
    const output =
      backlinks.length > 0
        ? [
            `Backlinks to "${title}":`,
            "",
            ...backlinks.map((link) => `- ${link}`),
          ].join("\n")
        : `No backlinks found for "${title}"`;

    return {
      content: [{ type: "text" as const, text: output }],
    };
  },
});
