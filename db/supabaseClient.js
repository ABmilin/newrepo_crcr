// public/supabaseClient.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ここにSupabaseのURLとanon keyを直接書きます
export const supabase = createClient(
  "https://xprhkzynrqvamnnwbsrf.supabase.co", // SupabaseプロジェクトのURL
  "sb_publishable_w8e48xYGKd-DN7u-4kuUAQ_BiomqgbY"             // anon public key
);
