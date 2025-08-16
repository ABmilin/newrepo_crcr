import { Calendar } from "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/+esm";
let statusChartInstance;
let urgencyChartInstance;
let calendar;

async function loadDashboard(filters = {}) {
  // クエリパラメータを作成
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`/api/dashboard?${params}`);
  const data = await res.json();

  document.getElementById("totalCount").textContent = data.total;

  // 既存のグラフを破棄
  if (statusChartInstance) statusChartInstance.destroy();
  if (urgencyChartInstance) urgencyChartInstance.destroy();

  // ステータス別
  const ctx1 = document.getElementById("statusChart").getContext("2d");
  statusChartInstance = new Chart(ctx1, {
    type: "doughnut",
    data: {
      labels: ["未対応", "対応中", "完了"],
      datasets: [{
        data: [data.byStatus.new, data.byStatus.in_progress, data.byStatus.resolved],
        backgroundColor: ["#dc3545", "#ffc107", "#28a745"]
      }]
    }
  });

  // 緊急度別
  const ctx2 = document.getElementById("urgencyChart").getContext("2d");
  urgencyChartInstance = new Chart(ctx2, {
    type: "bar",
    data: {
      labels: ["低", "中", "高"],
      datasets: [{
        label: "件数",
        data: [data.byUrgency["低"], data.byUrgency["中"], data.byUrgency["高"]],
        backgroundColor: ["#0d6efd", "#ffc107", "#dc3545"]
      }]
    }
  });
}

// フィルターフォームの送信イベント
document.getElementById("filterForm").addEventListener("submit", async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const filters = Object.fromEntries(formData.entries());

  // ✅ ここを追加：指定日を1つのフィルターとして扱う場合
  if (filters.due_date) {
    filters.due_before = filters.due_date;
    filters.due_after = filters.due_date;
    delete filters.due_date; // ← APIには `due_date` は送らない
  }

  // ボタンのUI変化
  const button = document.querySelector("#filterForm button");
  button.disabled = true;
  button.textContent = "適用中...";
  button.style.background = "#6c757d";

  await loadDashboard(filters); // フィルター付き読み込み

  // 完了表示
  button.textContent = "完了！";
  button.style.background = "#28a745"; // 緑
  setTimeout(() => {
    button.textContent = "適用";
    button.style.background = "";
    button.disabled = false;
  }, 1500);
});

async function populateAssigneeOptions() {
  const res = await fetch("/api/assignees");
  const assignees = await res.json();
  const select = document.getElementById("assigneeFilter");

  // 既存のoptionをクリア（先頭の「全て」は残す）
  select.innerHTML = `<option value="">全て</option>`;

  assignees.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

function renderCalendar(reports) {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  // 🔁 すでにカレンダーがある場合、destroyして再作成
  if (calendar) {
    calendar.destroy();
  }

  const events = reports
    .filter(r => r.due_date)
    .map(r => ({
      id: r.id, // ← 重要: タスクIDを設定
      title: `${r.title}（${r.assignee || "未定"}）`,
      start: r.due_date.split("T")[0],
      allDay: true
    }));

  calendar = new Calendar(calendarEl, {
  initialView: "dayGridMonth",
  locale: "ja",
  height: 500,
  events
});

  calendar.render();
}

async function loadCalendar() {
  const res = await fetch("/api/reports");
  const reports = await res.json();
  renderCalendar(reports);
}

// 初期表示
populateAssigneeOptions().then(() => {
  loadDashboard();
  loadCalendar(); 
});
