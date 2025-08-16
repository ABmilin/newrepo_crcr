import {
  Chart,
  DoughnutController,
  BarController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm";

import { Calendar } from "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/+esm";

let calendar;
let statusChartInstance;
let urgencyChartInstance;

// Chart.jsに必要な部品を登録
Chart.register(
  DoughnutController,
  BarController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

async function loadDashboard(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`/api/dashboard?${params}`);
  const data = await res.json();

  document.getElementById("totalCount").textContent = data.total;

  if (statusChartInstance) statusChartInstance.destroy();
  if (urgencyChartInstance) urgencyChartInstance.destroy();

  // ステータス別グラフ（ドーナツ）
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

  // 緊急度別グラフ（棒）
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

// フィルターフォーム送信イベント
document.getElementById("filterForm").addEventListener("submit", async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const filters = Object.fromEntries(formData.entries());

  if (filters.due_date) {
    filters.due_before = filters.due_date;
    filters.due_after = filters.due_date;
    delete filters.due_date;
  }

  const button = document.querySelector("#filterForm button");
  button.disabled = true;
  button.textContent = "適用中...";
  button.style.background = "#6c757d";

  await loadDashboard(filters);

  button.textContent = "完了！";
  button.style.background = "#28a745";
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

  select.innerHTML = `<option value="">全て</option>`;
  assignees.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

async function loadCalendarEvents() {
  const res = await fetch("/api/reports");
  const reports = await res.json();

  const events = reports
    .filter(r => r.due_date)
    .map(r => ({
      id: r.id,
      title: r.title,
      start: r.due_date,
      color: getStatusColor(r.status),
      extendedProps: {
        urgency: r.summary?.includes("高") ? "高" :
                 r.summary?.includes("中") ? "中" : "低",
        assignee: r.assignee || "未設定",
        status: r.status
      }
    }));

  if (calendar) {
    calendar.removeAllEvents();
    calendar.addEventSource(events);
    return;
  }

  const el = document.getElementById("calendar");
  calendar = new Calendar(el, {
    initialView: "dayGridMonth",
    events,
    height: 600,
    locale: "ja",
    eventClick: function(info) {
      const { title, start, extendedProps } = info.event;
      alert(
        `📌 ${title}\n📅 期限: ${start.toLocaleDateString()}\n🔄 ステータス: ${extendedProps.status}\n🧑 担当: ${extendedProps.assignee}\n⚠️ 緊急度: ${extendedProps.urgency}`
      );
    }
  });
  calendar.render();
}

function getStatusColor(status) {
  switch (status) {
    case "new": return "#dc3545";
    case "in_progress": return "#ffc107";
    case "resolved": return "#28a745";
    default: return "#6c757d";
  }
}

populateAssigneeOptions().then(() => {
  loadDashboard();   // グラフ表示
  loadCalendarEvents(); // カレンダー表示
});