import { describe, expect, it } from "vitest";
import {
  htmlPreviewDocument,
  htmlPreviewSandbox,
} from "../src/artifacts/artifact-html.js";

const base = '<base target="_blank">';

describe("htmlPreviewDocument", () => {
  it("puts the base tag inside head so the page keeps standards mode", () => {
    expect(
      htmlPreviewDocument(
        '<!DOCTYPE html><html><head lang="en"><title>x</title></head></html>',
      ),
    ).toBe(
      `<!DOCTYPE html><html><head lang="en">${base}<title>x</title></head></html>`,
    );
  });

  it("goes after a doctype when there is no head", () => {
    expect(htmlPreviewDocument("  <!doctype html><p>Hi</p>")).toBe(
      `  <!doctype html>${base}<p>Hi</p>`,
    );
  });

  it("prefixes plain fragments and handles missing content", () => {
    expect(htmlPreviewDocument("<p>Hi</p>")).toBe(`${base}<p>Hi</p>`);
    expect(htmlPreviewDocument()).toBe(base);
  });

  it("doesn't mistake <header> for <head>", () => {
    expect(htmlPreviewDocument("<header>Top</header>")).toBe(
      `${base}<header>Top</header>`,
    );
  });
});

describe("htmlPreviewSandbox", () => {
  it("lets links open but keeps scripts off unless allowed, never same-origin", () => {
    expect(htmlPreviewSandbox()).toBe(
      "allow-popups allow-popups-to-escape-sandbox",
    );
    expect(htmlPreviewSandbox(true)).toBe(
      "allow-scripts allow-popups allow-popups-to-escape-sandbox",
    );
    expect(htmlPreviewSandbox(true)).not.toContain("allow-same-origin");
  });
});
