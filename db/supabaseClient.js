// db/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// 環境変数から読み込む
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
