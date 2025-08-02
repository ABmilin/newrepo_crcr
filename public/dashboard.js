let statusChartInstance;
let urgencyChartInstance;

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
document.getElementById("filterForm").addEventListener("submit", e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const filters = Object.fromEntries(formData.entries());
  loadDashboard(filters); // フィルター付き読み込み
});

// 初期表示
loadDashboard();
