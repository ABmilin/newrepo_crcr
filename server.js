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
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `次の文章を要約し、課題点と次のアクションを箇条書きでまとめてください:\n\n${content}` }] }]
    })
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "要約生成失敗";
}

// 日報投稿API
app.post("/api/report", async (req, res) => {
  const { user_id, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: "タイトルと内容は必須です" });

  const summary = await summarizeReport(content);
  const { data, error } = await supabase
    .from("reports")
    .insert([{ user_id, title, content, summary }])
    .select();
  if (error) return res.status(500).json({ error });
  res.json(data[0]);
});

// 日報一覧取得API
app.get("/api/reports", async (req, res) => {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error });
  res.json(data);
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));