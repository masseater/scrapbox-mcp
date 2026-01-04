import { z } from "zod";
import { defineTool } from "@/definitions/define.ts";
import { ScrapboxWriter } from "@/features/scrapbox-writer/scrapbox-writer.ts";

export const insertLinesTool = defineTool({
  name: "insert_lines",
  title: "Insert Lines",
  description:
    "指定ページの指定行に新しい行を挿入。行番号を省略すると末尾に追記。WebSocket API経由で即時更新。",
  inputSchema: {
    title: z.string().min(1).describe("ページタイトル"),
    lines: z
      .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
      .describe("挿入する行（文字列または文字列配列）"),
    position: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("挿入位置（1-indexed、タイトル行の次が1）。省略時は末尾に追記"),
  },
  handler: async ({ title, lines, position }) => {
    const writer = ScrapboxWriter.getInstance();

    // 文字列の場合は配列に変換、改行を含む場合は分割
    const linesArray =
      typeof lines === "string"
        ? lines.split("\n")
        : lines.flatMap((l) => l.split("\n"));

    const result = await writer.insertLines(title, linesArray, position);

    if (result.isErr()) {
      return {
        isError: true,
        content: [{ type: "text", text: result.error.message }],
      };
    }

    const { url, insertedAt } = result.value;

    return {
      content: [
        {
          type: "text",
          text: `Inserted ${linesArray.length} line(s) at line ${insertedAt}\nPage: ${title}\nURL: ${url}`,
        },
      ],
    };
  },
});
