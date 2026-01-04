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

  describe("insertLines", () => {
    type LineCallback = (lines: { text: string }[]) => { text: string }[];

    function mockPatchWithCallback(
      callbackRef: { current: LineCallback | null },
      mockLines: { text: string }[] = [{ text: "Title" }, { text: "Content" }],
    ) {
      spyOn(cosenseWebsocket, "patch").mockImplementation(
        async (_project, _title, callback, _options) => {
          callbackRef.current = callback as LineCallback;
          // コールバックを実行して actualInsertAt を更新させる
          (callback as LineCallback)(mockLines);
          return { ok: true, val: { commitId: "xyz789" } } as never;
        },
      );
    }

    function assertCallback(callbackRef: {
      current: LineCallback | null;
    }): LineCallback {
      if (callbackRef.current === null) {
        throw new Error("capturedCallback should not be null");
      }
      return callbackRef.current;
    }

    it("inserts lines at the end when position is not specified", async () => {
      const callbackRef: { current: LineCallback | null } = { current: null };
      const mockLines = [
        { text: "Test Page" },
        { text: "Existing line 1" },
        { text: "Existing line 2" },
      ];
      mockPatchWithCallback(callbackRef, mockLines);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.insertLines("Test Page", [
        "New line 1",
        "New line 2",
      ]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.title).toBe("Test Page");
        // insertedAt は実際の挿入位置（末尾 = currentLines.length = 3）
        expect(result.value.insertedAt).toBe(3);
      }

      // Verify callback logic
      const callback = assertCallback(callbackRef);
      const newLines = callback(mockLines);
      expect(newLines).toEqual([
        { text: "Test Page" },
        { text: "Existing line 1" },
        { text: "Existing line 2" },
        { text: "New line 1" },
        { text: "New line 2" },
      ]);
    });

    it("inserts lines at specified position", async () => {
      const callbackRef: { current: LineCallback | null } = { current: null };
      const mockLines = [
        { text: "Test Page" },
        { text: "Line 1" },
        { text: "Line 2" },
        { text: "Line 3" },
      ];
      mockPatchWithCallback(callbackRef, mockLines);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.insertLines(
        "Test Page",
        ["Inserted line"],
        2,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.insertedAt).toBe(2);
      }

      // Verify callback logic - insert at position 2 (after title and first line)
      const callback = assertCallback(callbackRef);
      const newLines = callback(mockLines);
      expect(newLines).toEqual([
        { text: "Test Page" },
        { text: "Line 1" },
        { text: "Inserted line" },
        { text: "Line 2" },
        { text: "Line 3" },
      ]);
    });

    it("clamps position to valid range (minimum 1)", async () => {
      const callbackRef: { current: LineCallback | null } = { current: null };
      mockPatchWithCallback(callbackRef);

      const writer = ScrapboxWriter.getInstance();
      await writer.insertLines("Test Page", ["New line"], 0); // position 0 should be clamped to 1

      const callback = assertCallback(callbackRef);
      const currentLines = [{ text: "Title" }, { text: "Content" }];
      const newLines = callback(currentLines);
      expect(newLines).toEqual([
        { text: "Title" },
        { text: "New line" },
        { text: "Content" },
      ]);
    });

    it("clamps position to end when exceeds line count", async () => {
      const callbackRef: { current: LineCallback | null } = { current: null };
      mockPatchWithCallback(callbackRef);

      const writer = ScrapboxWriter.getInstance();
      await writer.insertLines("Test Page", ["New line"], 100); // position exceeds line count

      const callback = assertCallback(callbackRef);
      const currentLines = [{ text: "Title" }, { text: "Content" }];
      const newLines = callback(currentLines);
      expect(newLines).toEqual([
        { text: "Title" },
        { text: "Content" },
        { text: "New line" },
      ]);
    });

    it("returns error on empty lines array", async () => {
      const writer = ScrapboxWriter.getInstance();
      const result = await writer.insertLines("Test Page", []);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Lines array cannot be empty");
      }
    });

    it("returns error on NaN position", async () => {
      const writer = ScrapboxWriter.getInstance();
      const result = await writer.insertLines("Test Page", ["Line"], NaN);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Position must be a finite integer");
      }
    });

    it("returns error on Infinity position", async () => {
      const writer = ScrapboxWriter.getInstance();
      const result = await writer.insertLines("Test Page", ["Line"], Infinity);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Position must be a finite integer");
      }
    });

    it("returns error on float position", async () => {
      const writer = ScrapboxWriter.getInstance();
      const result = await writer.insertLines("Test Page", ["Line"], 1.5);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Position must be a finite integer");
      }
    });

    it("returns error on unauthorized", async () => {
      spyOn(cosenseWebsocket, "patch").mockResolvedValue({
        ok: false,
        err: "Unauthorized: 401",
      } as never);

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.insertLines("Test Page", ["Line"]);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("UNAUTHORIZED");
      }
    });

    it("handles thrown errors", async () => {
      spyOn(cosenseWebsocket, "patch").mockRejectedValue(
        new Error("Connection failed"),
      );

      const writer = ScrapboxWriter.getInstance();
      const result = await writer.insertLines("Test Page", ["Line"]);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("UNKNOWN");
        expect(result.error.message).toBe("Connection failed");
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
