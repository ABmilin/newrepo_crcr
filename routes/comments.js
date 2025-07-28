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

  if (error) return res.status(500).json({ error });
  res.json(data);
});

// コメント投稿
router.post("/:reportId", async (req, res) => {
  const { reportId } = req.params;
  const { user_id, content } = req.body;
  if (!content) return res.status(400).json({ error: "コメントは必須です" });

  const { data, error } = await supabase
    .from("comments")
    .insert([{ report_id: reportId, user_id, content }])
    .select();

  if (error) return res.status(500).json({ error });
  res.json(data[0]);
});

export default router;