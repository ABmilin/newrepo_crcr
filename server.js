import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Geminiで要約生成
async function summarizeReport(content) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `次の文章を要約:\n\n${content}` }] }]
      })
    }
  );
  const data = await res.json();
  console.log("Gemini API response full:", data); // ★ 全部ログ出力
  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "要約生成失敗";
}

// 日報投稿API
app.post("/api/report", async (req, res) => {
  console.log("POST /api/report called:", req.body); // ★ ここを追加（リクエスト内容ログ）
  const { user_id, title, content } = req.body;
  if (!title || !content) {
    console.error("Validation error: title or content missing"); // ★ 追加
    return res.status(400).json({ error: "タイトルと内容は必須です" });
  }

  try {
    const summary = await summarizeReport(content);
    const { data, error } = await supabase
      .from("reports")
      .insert([{ title, content, summary }])
      .select();
    if (error) {
      console.error("Supabase insert error:", error); // ★ 追加
      return res.status(500).json({ error });
    }
    res.json(data[0]);
  } catch (err) {
    console.error("Gemini or server error:", err); // ★ 追加
    res.status(500).json({ error: "Internal server error" });
  }
});

// 日報一覧取得API
app.get("/api/reports", async (req, res) => {
  console.log("GET /api/reports called"); // ★ 追加
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Supabase select error:", error); // ★ 追加
    return res.status(500).json({ error });
  }
  res.json(data);
});

// ★ ポートの修正
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));