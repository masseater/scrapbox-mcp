import { z } from "zod";
import { defineTool } from "@/definitions/define.ts";
import { ScrapboxClient } from "@/features/scrapbox-client/scrapbox-client.ts";

export const getPageTool = defineTool({
  name: "get_page",
  title: "Get Page",
  description:
    "指定ページの内容を取得。Scrapbox記法のまま返却し、リンク先一覧とバックリンク情報も含む。",
  inputSchema: {
    title: z.string().describe("ページタイトル"),
  },
  handler: async ({ title }) => {
    const client = ScrapboxClient.getInstance();
    const result = await client.getPage(title);

    if (result.isErr()) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: result.error.message }],
      };
    }

    const page = result.value;
    const content = page.lines.map((line) => line.text).join("\n");
    const output = [
      `# ${page.title}`,
      "",
      content,
      "",
      `---`,
      `Created: ${new Date(page.created * 1000).toISOString()}`,
      `Updated: ${new Date(page.updated * 1000).toISOString()}`,
      `Links: ${page.links.join(", ") || "(none)"}`,
      `Backlinks: ${page.relatedPages.links1hop.map((p) => p.title).join(", ") || "(none)"}`,
    ].join("\n");

    return {
      content: [{ type: "text" as const, text: output }],
    };
  },
});
