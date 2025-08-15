import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import commentsRouter from "./routes/comments.js";
import reactionsRouter from "./routes/reactions.js";
import recommendationsRouter from "./routes/recommendations.js";


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/api/comments", commentsRouter);
app.use("/api/reactions", reactionsRouter);
app.use("/api/recommendations", recommendationsRouter);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Geminiで要約生成
async function summarizeReport(content) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, // ★ URLとモデル名を修正
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [ // ★ promptではなくcontents形式
          {
            parts: [
              {
                text: `次のお客様からの問い合わせを要約し、以下を出力してください：
                1. 問い合わせ内容の要約
                2. 緊急度（低・中・高のいずれか）
                3. 推奨される対応方針（箇条書きで3つ以内）
                \n\n${content}`
              }
            ]
          }
        ]
      })
    }
  );
  const data = await res.json();
  console.log("Gemini API response full:", data);
  if (data.error) throw new Error(`Gemini API error: ${data.error.message}`);
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
  console.log("GET /api/reports called"); 
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  console.log("Reports data:", data);
  if (error) {
    console.error("Supabase select error:", error);
    return res.status(500).json({ error });
  }

  // ★ created_at を JST に変換
  const jstData = data.map(r => ({
    ...r,
    created_at_jst: new Date(r.created_at).toLocaleString("ja-JP", {
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



// 日報編集API（PUT）
app.put("/api/report/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const { data, error } = await supabase
    .from("reports")
    .update({ title, content })
    .eq("id", id)
    .select();
  if (error) {
    console.error("Supabase update error:", error);
    return res.status(500).json({ error });
  }
  res.json(data[0]);
});

// 日報削除API（DELETE）
app.delete("/api/report/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Supabase delete error:", error);
    return res.status(500).json({ error });
  }
  res.json({ message: "削除しました" });
});

// ステータス更新API
app.put("/api/report/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { data, error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", id)
    .select();
  if (error) {
    console.error("Supabase update status error:", error);
    return res.status(500).json({ error });
  }
  res.json(data[0]);
});

// 担当者更新API
app.put("/api/report/:id/assignee", async (req, res) => {
  const { id } = req.params;
  const { assignee } = req.body;
  const { data, error } = await supabase
    .from("reports")
    .update({ assignee })
    .eq("id", id)
    .select();
  if (error) {
    console.error("Supabase update assignee error:", error);
    return res.status(500).json({ error });
  }
  res.json(data[0]);
});

// 期限更新API
app.put("/api/report/:id/due_date", async (req, res) => {
  const { id } = req.params;
  const { due_date } = req.body;
  const { data, error } = await supabase
    .from("reports")
    .update({ due_date })
    .eq("id", id)
    .select();
  if (error) {
    console.error("Supabase update due_date error:", error);
    return res.status(500).json({ error });
  }
  res.json(data[0]);
});

// ダッシュボード用データ（フィルター対応）
app.get("/api/dashboard", async (req, res) => {
  const { status, urgency, period, assignee, due_before, due_after } = req.query;

  let query = supabase.from("reports").select("status, summary, created_at, title, assignee, due_date");

  if (status) query = query.eq("status", status);
  if (urgency) query = query.ilike("summary", `%${urgency}%`);
  if (assignee) query = query.ilike("assignee", `%${assignee}%`);

  if (due_before) query = query.lte("due_date", due_before);
  if (due_after) query = query.gte("due_date", due_after);

  if (period) {
    const now = new Date();
    let fromDate;
    if (period === "week") fromDate = new Date(now.setDate(now.getDate() - 7));
    if (period === "month") fromDate = new Date(now.setMonth(now.getMonth() - 1));
    if (fromDate) query = query.gte("created_at", fromDate.toISOString());
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error });

  // 集計
  const total = data.length;
  const byStatus = { new: 0, in_progress: 0, resolved: 0 };
  const byUrgency = { 低: 0, 中: 0, 高: 0 };

  data.forEach(r => {
    if (byStatus[r.status] !== undefined) byStatus[r.status]++;
    if (r.summary.includes("高")) byUrgency["高"]++;
    else if (r.summary.includes("中")) byUrgency["中"]++;
    else byUrgency["低"]++;
  });

  res.json({ total, byStatus, byUrgency });
});

// コメント削除API
app.delete("/api/comments/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Supabase delete comment error:", error);
    return res.status(500).json({ error: "コメント削除に失敗しました" });
  }
  res.json({ message: "コメントを削除しました" });
});



// ★ ポートの修正
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));