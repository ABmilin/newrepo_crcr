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
  const assignee = document.getElementById("assignee").value;
  const due_date = document.getElementById("due_date").value;
  const user_id = "dummy-user"; // 実運用時はSupabase AuthのユーザーID

  try {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, title, content, assignee, due_date })
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

      <strong>ステータス:</strong>
      <select onchange="updateStatus('${r.id}', this.value)">
        <option value="new" ${r.status === "new" ? "selected" : ""}>未対応</option>
        <option value="in_progress" ${r.status === "in_progress" ? "selected" : ""}>対応中</option>
        <option value="resolved" ${r.status === "resolved" ? "selected" : ""}>完了</option>
      </select>

      <strong>担当者:</strong>
      <input type="text" value="${r.assignee || ""}" onchange="updateAssignee('${r.id}', this.value)" placeholder="担当者名を入力">

      <strong>期限:</strong>
      <input type="date" value="${r.due_date ? r.due_date.split('T')[0] : ""}" onchange="updateDueDate('${r.id}', this.value)}">

      <div id="comments-${r.id}" class="comments-section"></div>
      
      <div class="button-group">
        <button class="edit-btn" onclick="editReport('${r.id}', '${r.title}', '${r.content}')">編集</button>
        <button class="delete-btn" onclick="deleteReport('${r.id}')">削除</button>
        <button class="comment-btn" onclick="openCommentModal('${r.id}')">コメント</button>
        <button onclick="addReaction('${r.id}', '👍')">👍</button>
        <button onclick="addReaction('${r.id}', '❤️')">❤️</button>
      </div>

      <div id="reactions-${r.id}" class="reactions-section"></div>

      <!-- ★ここを追加：類似案件の表示枠 -->
      <div id="recommendations-${r.id}" class="recommendations-section"></div>
    </article>
  `).join("");

// 各レポートごとにコメント・リアクション・レコメンド読み込み
for (const r of reports) {
  loadComments(r.id);
  loadReactions(r.id);
  loadRecommendations(r.id); // ★新しい関数を呼ぶ
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
// コメント読み込み部分も同様に修正
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
          <!-- ここも修正 -->
          <small>${c.content}${c.created_at_jst ? " - " + c.created_at_jst : ""}</small>
          <button onclick="deleteComment('${c.id}', '${reportId}')">削除</button>
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


// ステータス更新
async function updateStatus(id, status) {
  await fetch(`/api/report/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
}

// 担当者更新
async function updateAssignee(id, assignee) {
  await fetch(`/api/report/${id}/assignee`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignee })
  });
}

// 期限更新
async function updateDueDate(id, due_date) {
  await fetch(`/api/report/${id}/due_date`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ due_date })
  });
}

async function deleteComment(commentId, reportId) {
  if (!confirm("本当にこのコメントを削除しますか？")) return;
  await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
  loadComments(reportId); // 削除後に再読み込み
}

// ★類似案件の読み込み
async function loadRecommendations(reportId) {
  const res = await fetch(`/api/recommendations/${reportId}`);
  const recommendations = await res.json();
  const container = document.getElementById(`recommendations-${reportId}`);
  if (!recommendations || recommendations.length === 0) {
    container.innerHTML = "<p style='color:#777;'>類似案件はありません</p>";
    return;
  }
  container.innerHTML = `
    <div class="recommendations-list">
      <strong>過去の類似案件:</strong>
      <ul>
        ${recommendations.map(r => `<li><a href="#">${r.title}</a></li>`).join("")}
      </ul>
    </div>
  `;
}

loadReports();