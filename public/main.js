document.getElementById("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;
  const user_id = "dummy-user"; // 実運用時はSupabase AuthのユーザーID

  const res = await fetch("/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, title, content })
  });
  if (res.ok) loadReports();
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