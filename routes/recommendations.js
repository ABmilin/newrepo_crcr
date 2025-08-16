import express from "express";
import { supabase } from "../db/supabaseClient.js";
import fetch from "node-fetch";

const router = express.Router();

// 類似案件取得
router.get("/:reportId", async (req, res) => {
  const { reportId } = req.params;

  // ① 現在の相談取得
  const { data: current, error: err1 } = await supabase
    .from("reports")
    .select("id, title, content")
    .eq("id", reportId)
    .single();

  if (err1 || !current) return res.status(404).json({ error: "Report not found" });

  // ② 過去のレポート取得（自分を除く）
  const { data: pastReports, error: err2 } = await supabase
    .from("reports")
    .select("id, title, content")
    .neq("id", reportId)
    .limit(15); // 件数を増やすことで精度が上がる可能性あり

  if (err2) return res.status(500).json({ error: "Failed to load past reports" });

  // ③ Gemini用プロンプト構築
  const prompt = `
以下は現在の顧客相談と、過去の相談一覧です。
現在の相談に類似している過去の相談を最大3件選び、
次の形式でJSON配列として返してください（理由も含む）:

[
  {
    "id": "レポートID",
    "title": "レポートタイトル",
    "score": 類似度（0〜100）,
    "reason": "似ている理由"
  },
  ...
]

【現在の相談】
タイトル: ${current.title}
本文: ${current.content}

【過去の相談一覧】
${pastReports.map(r => `(${r.id}) ${r.title}：${r.content}`).join("\n")}
`;

  // ④ Gemini API呼び出し
  const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const result = await geminiResponse.json();

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  try {
  const json = JSON.parse(text);

  // ✅ 配列でなければ空配列を返す（.map()を安全に使うため）
  if (!Array.isArray(json)) {
    console.warn("Geminiの応答が配列でない:", json);
    return res.json([]);
  }

  res.json(json);
} catch (err) {
  console.error("JSON parse 失敗:", err);
  res.json([]); // ✅ fallbackでも空配列を返す
}
});

export default router;