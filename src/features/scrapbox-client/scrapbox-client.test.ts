import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as cosenseRest from "@cosense/std/rest";
import { ScrapboxClient } from "./scrapbox-client.ts";

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  ScrapboxClient.resetInstance();
  process.env = {
    ...originalEnv,
    SCRAPBOX_PROJECT: "test-project",
    SCRAPBOX_COOKIE: "connect.sid=test-cookie",
  };
});

describe("ScrapboxClient", () => {
  describe("getInstance", () => {
    it("returns the same instance on multiple calls", () => {
      const instance1 = ScrapboxClient.getInstance();
      const instance2 = ScrapboxClient.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("returns a new instance after resetInstance", () => {
      const instance1 = ScrapboxClient.getInstance();
      ScrapboxClient.resetInstance();
      const instance2 = ScrapboxClient.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("listPages", () => {
    it("returns page list on success", async () => {
      const mockPageList = {
        projectName: "test-project",
        skip: 0,
        limit: 10,
        count: 2,
        pages: [
          {
            id: "1",
            title: "Page 1",
            pin: 0,
            views: 10,
            linked: 5,
            updated: 1234567890,
            accessed: 1234567890,
            lines: ["Page 1"],
            created: 1234567890,
          },
          {
            id: "2",
            title: "Page 2",
            pin: 0,
            views: 20,
            linked: 3,
            updated: 1234567891,
            accessed: 1234567891,
            lines: ["Page 2"],
            created: 1234567891,
          },
        ],
      };

      spyOn(cosenseRest, "listPages").mockResolvedValue({
        ok: true,
        val: mockPageList,
      } as never);

      const client = ScrapboxClient.getInstance();
      const result = await client.listPages({ limit: 10 });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pages).toHaveLength(2);
        expect(result.value.pages[0]?.title).toBe("Page 1");
      }
    });

    it("returns error on not found", async () => {
      spyOn(cosenseRest, "listPages").mockResolvedValue({
        ok: false,
        err: { name: "NotFoundError", message: "Project not found" },
      } as never);

      const client = ScrapboxClient.getInstance();
      const result = await client.listPages({});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("returns error on unauthorized", async () => {
      spyOn(cosenseRest, "listPages").mockResolvedValue({
        ok: false,
        err: { name: "NotLoggedInError", message: "Not logged in" },
      } as never);

      const client = ScrapboxClient.getInstance();
      const result = await client.listPages({});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("getPage", () => {
    it("returns page data on success", async () => {
      const mockPage = {
        id: "page-id",
        title: "Test Page",
        lines: [{ id: "l1", text: "Test Page" }],
        links: ["Link1", "Link2"],
        relatedPages: {
          links1hop: [{ id: "r1", title: "Related1" }],
          links2hop: [],
        },
      };

      spyOn(cosenseRest, "getPage").mockResolvedValue({
        ok: true,
        val: mockPage,
      } as never);

      const client = ScrapboxClient.getInstance();
      const result = await client.getPage("Test Page");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.title).toBe("Test Page");
        expect(result.value.links).toEqual(["Link1", "Link2"]);
      }
    });

    it("returns error when page not found", async () => {
      spyOn(cosenseRest, "getPage").mockResolvedValue({
        ok: false,
        err: { name: "NotFoundError", message: "Page not found" },
      } as never);

      const client = ScrapboxClient.getInstance();
      const result = await client.getPage("Nonexistent");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("searchPages", () => {
    it("returns search results on success", async () => {
      const mockSearchResult = {
        projectName: "test-project",
        searchQuery: "test query",
        limit: 10,
        count: 1,
        pages: [{ id: "1", title: "Result Page", words: ["test"] }],
      };

      spyOn(cosenseRest, "searchForPages").mockResolvedValue({
        ok: true,
        val: mockSearchResult,
      } as never);

      const client = ScrapboxClient.getInstance();
      const result = await client.searchPages("test query");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pages).toHaveLength(1);
        expect(result.value.pages[0]?.title).toBe("Result Page");
      }
    });
  });

  describe("getLinks", () => {
    it("returns links from page", async () => {
      const mockPage = {
        id: "page-id",
        title: "Test Page",
        lines: [],
        links: ["Link1", "Link2", "Link3"],
        relatedPages: { links1hop: [], links2hop: [] },
      };

      spyOn(cosenseRest, "getPage").mockResolvedValue({
        ok: true,
        val: mockPage,
      } as never);

      const client = ScrapboxClient.getInstance();
      const result = await client.getLinks("Test Page");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(["Link1", "Link2", "Link3"]);
      }
    });
  });

  describe("getBacklinks", () => {
    it("returns backlinks from page", async () => {
      const mockPage = {
        id: "page-id",
        title: "Test Page",
        lines: [],
        links: [],
        relatedPages: {
          links1hop: [
            { id: "r1", title: "Backlink1" },
            { id: "r2", title: "Backlink2" },
          ],
          links2hop: [],
        },
      };

      spyOn(cosenseRest, "getPage").mockResolvedValue({
        ok: true,
        val: mockPage,
      } as never);

      const client = ScrapboxClient.getInstance();
      const result = await client.getBacklinks("Test Page");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(["Backlink1", "Backlink2"]);
      }
    });

    it("returns error when page not found", async () => {
      spyOn(cosenseRest, "getPage").mockResolvedValue({
        ok: false,
        err: { name: "NotFoundError" },
      } as never);

      const client = ScrapboxClient.getInstance();
      const result = await client.getBacklinks("Nonexistent");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("error mapping", () => {
    it("maps NotMemberError to FORBIDDEN", async () => {
      spyOn(cosenseRest, "listPages").mockResolvedValue({
        ok: false,
        err: { name: "NotMemberError", message: "Not a member" },
      } as never);

      const client = ScrapboxClient.getInstance();
      const result = await client.listPages({});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    });

    it("maps unknown errors to UNKNOWN", async () => {
      spyOn(cosenseRest, "listPages").mockResolvedValue({
        ok: false,
        err: { name: "SomeUnknownError" },
      } as never);

      const client = ScrapboxClient.getInstance();
      const result = await client.listPages({});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("UNKNOWN");
      }
    });
  });
});
