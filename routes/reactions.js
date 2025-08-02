import express from "express";
import { supabase } from "../db/supabaseClient.js";
const router = express.Router();

// スタンプ集計取得（特定の日報）
router.get("/:reportId", async (req, res) => {
  const { reportId } = req.params;
  const { data, error } = await supabase
    .from("reactions")
    .select("type, user_id")
    .eq("report_id", reportId);

  if (error) {
    console.error("Supabase select error:", error);
    return res.status(500).json({ error: "スタンプの取得に失敗しました" });
  }

  // 種類ごとに集計
  const counts = data.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = { count: 0, users: [] };
    acc[r.type].count++;
    acc[r.type].users.push(r.user_id);
    return acc;
  }, {});

  res.json(counts); // { "👍": { count: 2, users: [...] }, "❤️": { count: 1, users: [...] } }
});

// スタンプ追加 or 取り消し（トグル対応）
router.post("/:reportId", async (req, res) => {
  const { reportId } = req.params;
  const { user_id, type } = req.body;
  if (!user_id) return res.status(400).json({ error: "ユーザーIDが必要です" });
  if (!type) return res.status(400).json({ error: "スタンプの種類が必要です" });

  // 既存チェック
  const { data: existing } = await supabase
    .from("reactions")
    .select("*")
    .eq("report_id", reportId)
    .eq("user_id", user_id)
    .eq("type", type);

  if (existing && existing.length > 0) {
    // 取り消し
    await supabase
      .from("reactions")
      .delete()
      .eq("report_id", reportId)
      .eq("user_id", user_id)
      .eq("type", type);
    return res.json({ removed: true });
  }

  // 新規追加
  const { data, error } = await supabase
    .from("reactions")
    .insert([{ report_id: reportId, user_id, type }])
    .select();

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ error: "スタンプの追加に失敗しました" });
  }
  res.json(data[0]);
});

export default router;