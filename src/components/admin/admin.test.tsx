import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { QuotaView } from "@/lib/admin/dashboard";
import type { Capability } from "@/lib/admin/status";
import { toDayUsage, summarize, lastDates } from "@/lib/admin/usage";
import { ActivityCard } from "./ActivityCard";
import { BarChart } from "./BarChart";
import { QuotaCard } from "./QuotaCard";
import { SetupCard } from "./SetupCard";
import { UsageCard } from "./UsageCard";

const cap = (over: Partial<Capability> = {}): Capability => ({ id: "quota", label: "Quota", description: "d", ready: true, missing: [], ...over });
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("BarChart", () => {
  it("scales bars to the largest value and describes itself for screen readers", () => {
    const out = html(<BarChart unit="requests" bars={[{ label: "2026-10-24", value: 50 }, { label: "2026-10-25", value: 100 }]} />);
    expect(out).toContain("height:50%");
    expect(out).toContain("height:100%");
    expect(out).toContain("150 total, peak 100 on 2026-10-25");
    expect(out).toContain("2026-10-24: 50 requests");
  });
  it("does not divide by zero when everything is 0", () => {
    expect(html(<BarChart unit="x" bars={[{ label: "a", value: 0 }]} />)).toContain("height:0%");
  });
});

describe("QuotaCard", () => {
  const days = [
    { date: "2026-10-24", ok: 90, clientError: 5, serverError: 0, total: 95 },
    { date: "2026-10-25", ok: 100, clientError: 0, serverError: 2, total: 102 },
  ];
  it("shows Google's totals, error counts, rate limits and the billing caveat", () => {
    const quota: QuotaView = { state: "ok", projectId: "my-proj", days, limits: [
      { name: "Text Search", unit: "1/min/{project}", limit: 600 },
      { name: "Autocomplete", unit: "1/min/{project}", limit: null },
    ] };
    const out = html(<QuotaCard quota={quota} capability={cap()} />);
    expect(out).toContain("197"); // total requests
    expect(out).toContain("600 1/min/per project");
    expect(out).toContain("Unlimited");
    expect(out).toContain("does not expose your remaining free credit");
    expect(out).toContain("billing/reports?project=my-proj");
  });
  it("explains what to set when unavailable, and shows Google's message on error", () => {
    expect(html(<QuotaCard quota={{ state: "unavailable" }} capability={cap({ ready: false, missing: ["GOOGLE_SERVICE_ACCOUNT_JSON"] })} />)).toContain("GOOGLE_SERVICE_ACCOUNT_JSON");
    const err = html(<QuotaCard quota={{ state: "error", projectId: "p", message: "Permission denied" }} capability={cap()} />);
    expect(err).toContain("Permission denied");
    expect(err).toContain("Monitoring Viewer");
  });
});

describe("UsageCard", () => {
  it("renders totals and the breakdown", () => {
    const dates = lastDates(30, new Date("2026-10-25T00:00:00Z"));
    const usage = summarize(dates.map((d, i) => toDayUsage(d, i === 29 ? { search: 4, details: 2, photo: 1 } : null)));
    const out = html(<UsageCard usage={usage} />);
    expect(out).toContain("Searches");
    expect(out).toContain(">7<"); // today's total, also the 7-day and 30-day totals
  });
  it("tells you Redis is needed when there is no data source", () => {
    expect(html(<UsageCard usage={null} />)).toContain("needs Redis");
  });
});

describe("ActivityCard / SetupCard", () => {
  it("labels failed actions as failures", () => {
    const out = html(<ActivityCard log={[
      { at: "2026-10-25T02:18:00Z", action: "rotate", ok: false, detail: "Locate the current key: nope" },
      { at: "2026-10-25T02:15:00Z", action: "login", ok: true },
    ]} />);
    expect(out).toContain("Key rotation failed");
    expect(out).toContain("Signed in");
    expect(out).toContain("2026-10-25 02:18 UTC");
  });
  it("lists missing env vars for each unready capability", () => {
    const out = html(<SetupCard capabilities={[cap({ id: "rotate", label: "Key rotation", ready: false, missing: ["VERCEL_API_TOKEN"] }), cap({ label: "Quota" })]} />);
    expect(out).toContain("VERCEL_API_TOKEN");
    expect(out.match(/✓/g)).toHaveLength(1);
    expect(out.match(/✗/g)).toHaveLength(1);
  });
});
