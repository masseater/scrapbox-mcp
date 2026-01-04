import { z } from "zod";
import { defineTool } from "@/definitions/define.ts";
import { ScrapboxClient } from "@/features/scrapbox-client/scrapbox-client.ts";

export const getLinksTool = defineTool({
  name: "get_links",
  title: "Get Links",
  description: "指定ページからのリンク先一覧を取得。",
  inputSchema: {
    title: z.string().describe("ページタイトル"),
  },
  handler: async ({ title }) => {
    const client = ScrapboxClient.getInstance();
    const result = await client.getLinks(title);

    if (result.isErr()) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: result.error.message }],
      };
    }

    const links = result.value;
    const output =
      links.length > 0
        ? [
            `Links from "${title}":`,
            "",
            ...links.map((link) => `- ${link}`),
          ].join("\n")
        : `No links found in "${title}"`;

    return {
      content: [{ type: "text" as const, text: output }],
    };
  },
});
