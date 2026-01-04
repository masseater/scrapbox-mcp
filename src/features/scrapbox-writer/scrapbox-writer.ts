import { deletePage as deletePageApi, patch } from "@cosense/std/websocket";
import { err, ok, type Result } from "neverthrow";
import { getConfig } from "@/config.ts";

export type WriteError = {
  code: "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "UNKNOWN";
  message: string;
};

/** 挿入位置が未設定であることを示す定数 */
const POSITION_UNSET = -1;

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
  if (error instanceof Error) {
    return { code: "UNKNOWN", message: error.message };
  }
  if (typeof error === "object" && error !== null) {
    return { code: "UNKNOWN", message: JSON.stringify(error) };
  }
  return { code: "UNKNOWN", message: "Unknown error" };
}

function buildPageUrl(project: string, title: string): string {
  return `https://scrapbox.io/${project}/${encodeURIComponent(title)}`;
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

  private getProjectAndSid(): Result<
    { project: string; sid: string },
    WriteError
  > {
    const configResult = getConfig();
    if (configResult.isErr()) {
      return err({
        code: "UNKNOWN",
        message: configResult.error.message,
      });
    }
    return ok({
      project: configResult.value.project,
      sid: configResult.value.cookie,
    });
  }

  private async patchPage(
    title: string,
    body: string,
  ): Promise<Result<{ title: string; url: string }, WriteError>> {
    const configResult = this.getProjectAndSid();
    if (configResult.isErr()) {
      return err(configResult.error);
    }
    const { project, sid } = configResult.value;
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

      return ok({ title, url: buildPageUrl(project, title) });
    } catch (error) {
      return err(mapPushError(error));
    }
  }

  async createPage(
    title: string,
    body: string,
  ): Promise<Result<{ title: string; url: string }, WriteError>> {
    return this.patchPage(title, body);
  }

  async updatePage(
    title: string,
    body: string,
  ): Promise<Result<{ title: string; url: string }, WriteError>> {
    return this.patchPage(title, body);
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

    const configResult = this.getProjectAndSid();
    if (configResult.isErr()) {
      return err(configResult.error);
    }
    const { project, sid } = configResult.value;

    // 実際の挿入位置を追跡するための変数
    let actualInsertAt = POSITION_UNSET;

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

      return ok({
        title,
        url: buildPageUrl(project, title),
        insertedAt: actualInsertAt,
      });
    } catch (error) {
      return err(mapPushError(error));
    }
  }

  async deletePage(
    title: string,
  ): Promise<Result<{ title: string }, WriteError>> {
    const configResult = this.getProjectAndSid();
    if (configResult.isErr()) {
      return err(configResult.error);
    }
    const { project, sid } = configResult.value;

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
