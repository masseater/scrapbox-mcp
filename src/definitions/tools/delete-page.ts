import { z } from "zod";
import { defineTool } from "@/definitions/define.ts";
import { ScrapboxWriter } from "@/features/scrapbox-writer/scrapbox-writer.ts";

export const deletePageTool = defineTool({
  name: "delete_page",
  title: "Delete Page",
  description:
    "ページを削除。SCRAPBOX_ENABLE_DELETE=true が必要。この操作は取り消せません。",
  inputSchema: {
    title: z.string().describe("ページタイトル"),
  },
  handler: async ({ title }) => {
    const writer = ScrapboxWriter.getInstance();
    const result = await writer.deletePage(title);

    if (result.isErr()) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: result.error.message }],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Deleted page: ${title}`,
        },
      ],
    };
  },
});
