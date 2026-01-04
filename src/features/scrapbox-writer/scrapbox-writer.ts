import { deletePage as deletePageApi, patch } from "@cosense/std/websocket";
import { err, ok, type Result } from "neverthrow";
import { getConfig } from "@/config.ts";

export type WriteError = {
  code: "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "UNKNOWN";
  message: string;
};

function mapPushError(error: unknown): WriteError {
  if (typeof error === "string") {
    if (error.includes("Unauthorized") || error.includes("401")) {
      return { code: "UNAUTHORIZED", message: "Invalid or expired cookie" };
    }
    if (error.includes("NotFoundError") || error.includes("404")) {
      return { code: "NOT_FOUND", message: "Page not found" };
    }
    if (error.includes("DuplicateTitleError")) {
      return { code: "CONFLICT", message: "Page title already exists" };
    }
    return { code: "UNKNOWN", message: error };
  }
  return {
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : "Unknown error",
  };
}

export class ScrapboxWriter {
  private static instance: ScrapboxWriter | null = null;

  private constructor() {}

  static getInstance(): ScrapboxWriter {
    if (!ScrapboxWriter.instance) {
      ScrapboxWriter.instance = new ScrapboxWriter();
    }
    return ScrapboxWriter.instance;
  }

  static resetInstance(): void {
    ScrapboxWriter.instance = null;
  }

  private getProjectAndSid(): { project: string; sid: string } {
    const config = getConfig();
    return {
      project: config.project,
      sid: config.cookie,
    };
  }

  async createPage(
    title: string,
    body: string,
  ): Promise<Result<{ title: string; url: string }, WriteError>> {
    const { project, sid } = this.getProjectAndSid();
    const lines = [title, ...body.split("\n")];

    try {
      const result = await patch(
        project,
        title,
        () => lines.map((text) => ({ text })),
        { sid },
      );

      if (!result.ok) {
        return err(mapPushError(result.err));
      }

      const url = `https://scrapbox.io/${project}/${encodeURIComponent(title)}`;
      return ok({ title, url });
    } catch (error) {
      return err(mapPushError(error));
    }
  }

  async updatePage(
    title: string,
    body: string,
  ): Promise<Result<{ title: string; url: string }, WriteError>> {
    const { project, sid } = this.getProjectAndSid();
    const lines = [title, ...body.split("\n")];

    try {
      const result = await patch(
        project,
        title,
        () => lines.map((text) => ({ text })),
        { sid },
      );

      if (!result.ok) {
        return err(mapPushError(result.err));
      }

      const url = `https://scrapbox.io/${project}/${encodeURIComponent(title)}`;
      return ok({ title, url });
    } catch (error) {
      return err(mapPushError(error));
    }
  }

  /**
   * 指定した行に新しい行を挿入する
   * @param title ページタイトル
   * @param lines 挿入する行（配列）
   * @param position 挿入位置（1-indexed, 省略時は末尾）。タイトル行（0行目）の後が position=1
   */
  async insertLines(
    title: string,
    lines: string[],
    position?: number,
  ): Promise<
    Result<{ title: string; url: string; insertedAt: number }, WriteError>
  > {
    // 空配列の場合は早期リターン
    if (lines.length === 0) {
      return err({
        code: "UNKNOWN",
        message: "Lines array cannot be empty",
      });
    }

    // position の検証（NaN, Infinity, 小数をチェック）
    if (
      position !== undefined &&
      (!Number.isFinite(position) || !Number.isInteger(position))
    ) {
      return err({
        code: "UNKNOWN",
        message: "Position must be a finite integer",
      });
    }

    const { project, sid } = this.getProjectAndSid();

    // 実際の挿入位置を追跡するための変数
    let actualInsertAt = -1;

    try {
      const result = await patch(
        project,
        title,
        (currentLines) => {
          // currentLines[0] はタイトル行
          const insertAt = position ?? currentLines.length;
          // 範囲外の場合は末尾に挿入（最小1、最大は現在の行数）
          actualInsertAt = Math.min(Math.max(1, insertAt), currentLines.length);

          const newLines = [
            ...currentLines.slice(0, actualInsertAt),
            ...lines.map((text) => ({ text })),
            ...currentLines.slice(actualInsertAt),
          ];
          return newLines;
        },
        { sid },
      );

      if (!result.ok) {
        return err(mapPushError(result.err));
      }

      const url = `https://scrapbox.io/${project}/${encodeURIComponent(title)}`;
      return ok({ title, url, insertedAt: actualInsertAt });
    } catch (error) {
      return err(mapPushError(error));
    }
  }

  async deletePage(
    title: string,
  ): Promise<Result<{ title: string }, WriteError>> {
    const { project, sid } = this.getProjectAndSid();

    try {
      const result = await deletePageApi(project, title, { sid });

      if (!result.ok) {
        return err(mapPushError(result.err));
      }

      return ok({ title });
    } catch (error) {
      return err(mapPushError(error));
    }
  }
}
