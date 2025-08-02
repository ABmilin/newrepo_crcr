async function loadDashboard() {
  const res = await fetch("/api/dashboard");
  const data = await res.json();

  document.getElementById("totalCount").textContent = data.total;

  // ステータス別
  const ctx1 = document.getElementById("statusChart").getContext("2d");
  new Chart(ctx1, {
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
  new Chart(ctx2, {
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

loadDashboard();
