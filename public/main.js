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
    </article>
  `).join("");
}

loadReports();