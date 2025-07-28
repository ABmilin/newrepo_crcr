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
    <strong>要約:</strong>
    <p>${r.summary}</p>
    <small>${new Date(r.created_at).toLocaleString()}</small>
    <div style="margin-top:10px;">
      <button onclick="editReport('${r.id}', '${r.title}', '${r.content}')">編集</button>
      <button onclick="deleteReport('${r.id}')">削除</button>
    </div>
  </article>
`).join("");
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

loadReports();