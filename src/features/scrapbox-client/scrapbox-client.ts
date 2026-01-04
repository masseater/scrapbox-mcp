import {
  getPage as cosenseGetPage,
  listPages as cosenseListPages,
  searchForPages,
} from "@cosense/std/rest";
import type {
  PageList,
  PageWithInfoboxDefinition,
  PageWithoutInfoboxDefinition,
  SearchResult,
} from "@cosense/types/rest";

type PageData = PageWithInfoboxDefinition | PageWithoutInfoboxDefinition;

import { err, ok, type Result } from "neverthrow";
import { getConfig } from "@/config.ts";

export type ScrapboxError = {
  code: "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "RATE_LIMITED" | "UNKNOWN";
  message: string;
};

export type SortOrder =
  | "updated"
  | "created"
  | "accessed"
  | "linked"
  | "views"
  | "title";

function mapCosenseError(error: {
  name: string;
  message?: string;
}): ScrapboxError {
  switch (error.name) {
    case "NotFoundError":
      return {
        code: "NOT_FOUND",
        message: error.message ?? "Page or project not found",
      };
    case "NotLoggedInError":
      return {
        code: "UNAUTHORIZED",
        message: error.message ?? "Not logged in",
      };
    case "NotMemberError":
      return {
        code: "FORBIDDEN",
        message: error.message ?? "Not a member of this project",
      };
    default:
      return { code: "UNKNOWN", message: error.message ?? error.name };
  }
}

export class ScrapboxClient {
  private static instance: ScrapboxClient | null = null;

  private constructor() {}

  static getInstance(): ScrapboxClient {
    if (!ScrapboxClient.instance) {
      ScrapboxClient.instance = new ScrapboxClient();
    }
    return ScrapboxClient.instance;
  }

  static resetInstance(): void {
    ScrapboxClient.instance = null;
  }

  private getOptions() {
    const config = getConfig();
    return {
      sid: config.cookie,
    };
  }

  async listPages(options: {
    limit?: number;
    skip?: number;
    sort?: SortOrder;
  }): Promise<Result<PageList, ScrapboxError>> {
    const config = getConfig();
    const result = await cosenseListPages(config.project, {
      ...this.getOptions(),
      limit: options.limit,
      skip: options.skip,
      sort: options.sort,
    });

    if (!result.ok) {
      return err(mapCosenseError(result.err));
    }

    return ok(result.val);
  }

  async getPage(title: string): Promise<Result<PageData, ScrapboxError>> {
    const config = getConfig();
    const result = await cosenseGetPage(
      config.project,
      title,
      this.getOptions(),
    );

    if (!result.ok) {
      return err(mapCosenseError(result.err));
    }

    return ok(result.val);
  }

  async searchPages(
    query: string,
  ): Promise<Result<SearchResult, ScrapboxError>> {
    const config = getConfig();
    const result = await searchForPages(
      query,
      config.project,
      this.getOptions(),
    );

    if (!result.ok) {
      return err(mapCosenseError(result.err));
    }

    return ok(result.val);
  }

  async getLinks(title: string): Promise<Result<string[], ScrapboxError>> {
    const result = await this.getPage(title);
    return result.map((page) => page.links);
  }

  async getBacklinks(title: string): Promise<Result<string[], ScrapboxError>> {
    const result = await this.getPage(title);
    return result.map((page) =>
      page.relatedPages.links1hop.map((related) => related.title),
    );
  }
}
