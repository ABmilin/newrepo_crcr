// サマリー文字列を分解して問い合わせ内容・緊急度・対応方針に分ける
function parseSummary(summary) {
  const lines = summary.split("\n").map(l => l.trim()).filter(l => l);

  const inquiryLine = lines.find(l => l.includes("問い合わせ内容")) || "";
  const urgencyLine = lines.find(l => l.includes("緊急度")) || "";
  const actions = lines.filter(l => l.startsWith("*"));

  // 緊急度クラス
  let urgencyClass = "urgency-low";
  if (urgencyLine.includes("高")) urgencyClass = "urgency-high";
  else if (urgencyLine.includes("中")) urgencyClass = "urgency-medium";

  return {
    inquiry: inquiryLine.replace(/^.*?:\s*/, ""),
    urgency: urgencyLine.replace(/^.*?:\s*/, ""),
    urgencyClass,
    actions: actions.map(a => a.replace(/^\*|\d\.|・/g,"").trim())
  };
}


document.getElementById("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const button = document.querySelector("#reportForm button");
  button.disabled = true;
  button.textContent = "送信中...";

  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;
  const user_id = "dummy-user"; // 実運用時はSupabase AuthのユーザーID

  try {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, title, content })
    });

    if (res.ok) {
      button.textContent = "送信完了！";
      setTimeout(() => {
        button.textContent = "送信";
        button.disabled = false;
      }, 1500);
      document.getElementById("reportForm").reset();
      loadReports();
    } else {
      throw new Error("送信エラー");
    }
  } catch (error) {
    button.textContent = "エラー発生";
    setTimeout(() => {
      button.textContent = "送信";
      button.disabled = false;
    }, 2000);
  }
});

async function loadReports() {
  const res = await fetch("/api/reports");
  const reports = await res.json();
  const container = document.getElementById("reports");

  container.innerHTML = reports.map(r => `
    <article>
      <h3>${r.title}</h3>
      <p>${r.content}</p>

      <strong>問い合わせ内容:</strong>
      <p>${parseSummary(r.summary).inquiry}</p>

      <strong>緊急度:</strong>
      <p class="${parseSummary(r.summary).urgencyClass}">${parseSummary(r.summary).urgency}</p>

      <strong>対応方針:</strong>
      <ul>
        ${parseSummary(r.summary).actions.map(a => `<li>${a}</li>`).join("")}
      </ul>

      <small>${new Date(r.created_at).toLocaleString()}</small>

      <!-- コメント一覧 -->
      <div id="comments-${r.id}" class="comments-section"></div>
      
      <div style="margin-top:10px;">
        <button onclick="editReport('${r.id}', '${r.title}', '${r.content}')">編集</button>
        <button onclick="deleteReport('${r.id}')">削除</button>
        <button onclick="openCommentModal('${r.id}')">コメント追加</button>
        <button onclick="addReaction('${r.id}', '👍')">👍</button>
        <button onclick="addReaction('${r.id}', '❤️')">❤️</button>
      </div>

      <div id="reactions-${r.id}" class="reactions-section"></div>
    </article>
  `).join("");

  // 各レポートのコメント＆リアクションを同時にロード
  for (const r of reports) {
    loadComments(r.id);
    loadReactions(r.id);
  }
}

// モーダル開閉用
let currentReportId = null;

function openCommentModal(reportId) {
  currentReportId = reportId;
  document.getElementById("commentModal").style.display = "block";
}

document.getElementById("closeModalBtn").addEventListener("click", () => {
  document.getElementById("commentModal").style.display = "none";
});

// コメント送信
document.getElementById("submitCommentBtn").addEventListener("click", async () => {
  const content = document.getElementById("commentContent").value;
  if (!content) return alert("コメントを入力してください");
  await fetch(`/api/comments/${currentReportId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: "dummy-user", content })
  });
  document.getElementById("commentContent").value = "";
  document.getElementById("commentModal").style.display = "none";
  loadComments(currentReportId);
});

// コメント読み込み
async function loadComments(reportId) {
  const res = await fetch(`/api/comments/${reportId}`);
  const comments = await res.json();
  const container = document.getElementById(`comments-${reportId}`);
  if (!comments || comments.length === 0) {
    container.innerHTML = "<p style='color:#777;'>コメントはまだありません</p>";
    return;
  }
  container.innerHTML = `
    <div class="comments-list">
      ${comments.map(c => `
        <div class="comment">
          <small>${c.content} - ${new Date(c.created_at).toLocaleString()}</small>
        </div>
      `).join("")}
    </div>
  `;
}

// 編集処理
async function editReport(id, title, content) {
  const newTitle = prompt("新しいタイトルを入力:", title);
  const newContent = prompt("新しい内容を入力:", content);
  if (newTitle && newContent) {
    await fetch(`/api/report/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, content: newContent })
    });
    loadReports();
  }
}

// 削除処理
async function deleteReport(id) {
  if (confirm("本当に削除しますか？")) {
    await fetch(`/api/report/${id}`, { method: "DELETE" });
    loadReports();
  }
}

// スタンプ追加（トグル対応）
async function addReaction(reportId, type) {
  await fetch(`/api/reactions/${reportId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: "dummy-user", type })
  });
  loadReactions(reportId); // 更新
}

// スタンプ数読み込み
async function loadReactions(reportId) {
  const res = await fetch(`/api/reactions/${reportId}`);
  const reactions = await res.json();  // { "👍": { count: 2, users: ["dummy-user"] }, ... }

  const container = document.getElementById(`reactions-${reportId}`);
  container.innerHTML = Object.entries(reactions).map(([type, info]) => `
    <button onclick="addReaction('${reportId}', '${type}')">
      ${type} ${info.count}
    </button>
  `).join("");
}

loadReports();