import express from "express";
import { supabase } from "../db/supabaseClient.js";
const router = express.Router();

// コメント一覧取得
router.get("/:reportId", async (req, res) => {
  const { reportId } = req.params;
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: "コメントの取得に失敗しました" });

  // ★ created_at を JST に変換
  const jstData = data.map(c => ({
    ...c,
    created_at_jst: new Date(c.created_at).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  }));

  // ★ JST付きデータを返却
  res.json(jstData);
});

// コメント投稿
router.post("/:reportId", async (req, res) => {
  const { reportId } = req.params;
  const { user_id, content } = req.body;
  if (!user_id) return res.status(400).json({ error: "ユーザーIDが必要です" });
  if (!content) return res.status(400).json({ error: "コメントは必須です" });

  const { data, error } = await supabase
    .from("comments")
    .insert([{ report_id: reportId, user_id, content }])
    .select();

  if (error) return res.status(500).json({ error: "コメントの投稿に失敗しました" });

  // ★ created_at を JST に変換
  const jstData = data.map(c => ({
    ...c,
    created_at_jst: new Date(c.created_at).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  }));

  res.json(jstData[0]); // ★ 変換済みデータを返す
});

export default router;