import { Redis } from "@upstash/redis";

// Vercel's Upstash integration injects KV_REST_API_*; a manual setup uses UPSTASH_REDIS_REST_*.
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

/** Shared Redis client, or null when Upstash isn't configured (features degrade gracefully). */
export const redis = url && token ? new Redis({ url, token }) : null;
