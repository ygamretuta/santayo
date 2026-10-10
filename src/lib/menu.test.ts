import { describe, expect, it } from "vitest";
import { extractLinks, isLoginPage, isSafePublicUrl, pickMenuLink } from "./menu";

const base = "https://example-resto.com/";

describe("isSafePublicUrl", () => {
  it("allows normal public sites", () => {
    expect(isSafePublicUrl("https://norisake.com/")).toBe(true);
    expect(isSafePublicUrl("http://example.com/menu.pdf")).toBe(true);
  });
  it("blocks internal / non-http targets", () => {
    for (const u of [
      "http://localhost/", "http://127.0.0.1/", "http://10.0.0.5/", "http://[::1]/",
      "http://169.254.169.254/latest/meta-data", "http://intranet/", "http://printer.local/",
      "https://example.com:8080/", "ftp://example.com/", "https://user:pw@example.com/", "file:///etc/passwd",
    ]) expect(isSafePublicUrl(u), u).toBe(false);
  });
});

describe("pickMenuLink", () => {
  it("finds a link labelled Menu and resolves relative URLs", () => {
    const html = `<nav><a href="/about">About</a><a class="x" href="/our-menu/">Menu</a></nav>`;
    expect(pickMenuLink(html, base)).toBe("https://example-resto.com/our-menu/");
  });
  it("prefers a menu PDF and decodes entities", () => {
    const html = `<a href="/menu">Our food</a><a href="/files/menu.pdf?a=1&amp;b=2">Download menu</a>`;
    expect(pickMenuLink(html, base)).toBe("https://example-resto.com/files/menu.pdf?a=1&b=2");
  });
  it("matches a /menu path even when the label is something else", () => {
    expect(pickMenuLink(`<a href="/menu"><span>Our Food</span></a>`, base)).toBe("https://example-resto.com/menu");
  });
  it("ignores hamburger toggles, anchors, mailto and long sentences", () => {
    const html = `
      <a href="#" class="menu-toggle">Menu</a>
      <a href="javascript:void(0)">Menu</a>
      <a href="mailto:hi@x.com">menu questions</a>
      <a href="/blog/1">Read about how we designed our new seasonal menu for the winter</a>`;
    expect(pickMenuLink(html, base)).toBeNull();
  });
  it("returns null when there is nothing menu-like or the target is unsafe", () => {
    expect(pickMenuLink(`<a href="/contact">Contact</a>`, base)).toBeNull();
    expect(pickMenuLink(`<a href="http://127.0.0.1/menu">Menu</a>`, base)).toBeNull();
  });
});

describe("extractLinks", () => {
  it("strips nested tags from link text", () => {
    expect(extractLinks(`<a href='/m'><b>View</b>  <i>Menu</i></a>`, base)).toEqual([
      { href: "https://example-resto.com/m", text: "View Menu" },
    ]);
  });
});

describe("isLoginPage", () => {
  it("flags sign-in redirects but not real menu pages", () => {
    expect(isLoginPage("https://accounts.google.com/v3/signin/identifier?continue=x")).toBe(true);
    expect(isLoginPage("https://example.com/login")).toBe(true);
    expect(isLoginPage("https://blakes.ph/menu/")).toBe(false);
    expect(isLoginPage("https://example.com/menus/signature-dishes")).toBe(false);
  });
});
