import express from "express";
import { supabase } from "../db/supabaseClient.js";
const router = express.Router();

// スタンプ一覧取得（特定の日報）
router.get("/:reportId", async (req, res) => {
  const { reportId } = req.params;
  const { data, error } = await supabase
    .from("reactions")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase select error:", error); // ★追加
    return res.status(500).json({ error: "スタンプの取得に失敗しました" });
  }
  res.json(data);
});

// スタンプ追加
router.post("/:reportId", async (req, res) => {
  const { reportId } = req.params;
  const { user_id, type } = req.body;
  if (!user_id) return res.status(400).json({ error: "ユーザーIDが必要です" });
  if (!type) return res.status(400).json({ error: "スタンプの種類が必要です" });

  const { data, error } = await supabase
    .from("reactions")
    .insert([{ report_id: reportId, user_id, type }])
    .select();

  if (error) {
    console.error("Supabase insert error:", error); // ★追加
    return res.status(500).json({ error: "スタンプの追加に失敗しました" });
  }
  res.json(data[0]);
});

// スタンプ削除（同じユーザーが取り消したい場合）
router.delete("/:reportId", async (req, res) => {
  const { reportId } = req.params;
  const { user_id, type } = req.body;
  if (!user_id || !type) return res.status(400).json({ error: "ユーザーIDとスタンプの種類が必要です" });

  const { error } = await supabase
    .from("reactions")
    .delete()
    .eq("report_id", reportId)
    .eq("user_id", user_id)
    .eq("type", type);

  if (error) {
    console.error("Supabase delete error:", error); // ★追加
    return res.status(500).json({ error: "スタンプの削除に失敗しました" });
  }
  res.json({ message: "スタンプを削除しました" });
});

export default router;