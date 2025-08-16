import express from "express";
import { supabase } from "../db/supabaseClient.js";
const router = express.Router();

// 類似事例取得
router.get("/:reportId", async (req, res) => {
  const { reportId } = req.params;

  // 現在のレポート本文を取得
  const { data: current, error: err1 } = await supabase
    .from("reports")
    .select("content")
    .eq("id", reportId)
    .single();

  if (err1 || !current) return res.status(404).json({ error: "Report not found" });

  // 類似レポート検索
  const { data, error } = await supabase.rpc("search_reports", {
    search_text: current.content,
    current_id: reportId
  });

  if (error) return res.status(500).json({ error: "Search failed" });
  res.json(data);
});

export default router;
