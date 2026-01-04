import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as cosenseWebsocket from "@cosense/std/websocket";
import { ScrapboxWriter } from "./scrapbox-writer.ts";

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  ScrapboxWriter.resetInstance();
  process.env = {
    ...originalEnv,
    SCRAPBOX_PROJECT: "test-project",
    SCRAPBOX_COOKIE: "connect.sid=test-cookie",
  };
});

describe("ScrapboxWriter", () => {
  describe("getInstance", () => {
    it("returns the same instance on multiple calls", () => {
      const instance1 = ScrapboxWriter.getInstance();
      const instance2 = ScrapboxWriter.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("returns a new instance after resetInstance", () => {
      const instance1 = ScrapboxWriter.getInstance();
      ScrapboxWriter.resetInstance();
      const instance2 = ScrapboxWriter.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("createPage", () => {
    it("creates a page successfully", async () => {
      spyOn(cosenseWebsocket, "patch").mockResolvedValue({
        ok: true,
        val: { commitId: "abc123" },
      } as never);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.createPage("New Page", "Line 1\nLine 2");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.title).toBe("New Page");
        expect(result.value.url).toBe(
          "https://scrapbox.io/test-project/New%20Page",
        );
      }
    });

    it("returns error on unauthorized", async () => {
      spyOn(cosenseWebsocket, "patch").mockResolvedValue({
        ok: false,
        err: "Unauthorized: 401",
      } as never);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.createPage("New Page", "Content");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("UNAUTHORIZED");
      }
    });

    it("returns error on duplicate title", async () => {
      spyOn(cosenseWebsocket, "patch").mockResolvedValue({
        ok: false,
        err: "DuplicateTitleError: Page already exists",
      } as never);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.createPage("Existing Page", "Content");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("CONFLICT");
      }
    });

    it("handles thrown errors", async () => {
      spyOn(cosenseWebsocket, "patch").mockRejectedValue(
        new Error("Network error"),
      );

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.createPage("New Page", "Content");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("UNKNOWN");
        expect(result.error.message).toBe("Network error");
      }
    });
  });

  describe("updatePage", () => {
    it("updates a page successfully", async () => {
      spyOn(cosenseWebsocket, "patch").mockResolvedValue({
        ok: true,
        val: { commitId: "def456" },
      } as never);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.updatePage(
        "Existing Page",
        "Updated content",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.title).toBe("Existing Page");
        expect(result.value.url).toBe(
          "https://scrapbox.io/test-project/Existing%20Page",
        );
      }
    });

    it("returns error when page not found", async () => {
      spyOn(cosenseWebsocket, "patch").mockResolvedValue({
        ok: false,
        err: "NotFoundError: 404",
      } as never);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.updatePage("Nonexistent", "Content");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("deletePage", () => {
    it("deletes a page successfully", async () => {
      spyOn(cosenseWebsocket, "deletePage").mockResolvedValue({
        ok: true,
        val: undefined,
      } as never);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.deletePage("Page to Delete");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.title).toBe("Page to Delete");
      }
    });

    it("returns error when page not found", async () => {
      spyOn(cosenseWebsocket, "deletePage").mockResolvedValue({
        ok: false,
        err: "NotFoundError: Page not found",
      } as never);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.deletePage("Nonexistent");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("handles thrown errors", async () => {
      spyOn(cosenseWebsocket, "deletePage").mockRejectedValue(
        new Error("Connection failed"),
      );

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.deletePage("Some Page");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("UNKNOWN");
        expect(result.error.message).toBe("Connection failed");
      }
    });
  });

  describe("error mapping", () => {
    it("maps string errors containing Unauthorized to UNAUTHORIZED", async () => {
      spyOn(cosenseWebsocket, "patch").mockResolvedValue({
        ok: false,
        err: "Unauthorized access",
      } as never);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.createPage("Test", "Content");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("UNAUTHORIZED");
      }
    });

    it("maps unknown string errors to UNKNOWN", async () => {
      spyOn(cosenseWebsocket, "patch").mockResolvedValue({
        ok: false,
        err: "Some random error",
      } as never);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.createPage("Test", "Content");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("UNKNOWN");
        expect(result.error.message).toBe("Some random error");
      }
    });

    it("maps non-string, non-Error objects to UNKNOWN", async () => {
      spyOn(cosenseWebsocket, "patch").mockRejectedValue({ weird: "object" });

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.createPage("Test", "Content");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("UNKNOWN");
        expect(result.error.message).toBe("Unknown error");
      }
    });
  });
});
