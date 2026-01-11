const API = "http://localhost:5000/api/reconciliation";
const socket = io("http://localhost:5000");

let volumeChart, statusChart;

// ELEMENTS
const errorBanner = document.getElementById("errorBanner");
const tbody = document.getElementById("transactionsBody");
const lastUpdate = document.getElementById("lastUpdate");

// KPIs
const kpiTotal = document.getElementById("kpiTotal");
const kpiMatched = document.getElementById("kpiMatched");
const kpiPending = document.getElementById("kpiPending");
const kpiMismatch = document.getElementById("kpiMismatch");

const kpiMatchedPct = document.getElementById("kpiMatchedPct");
const kpiPendingPct = document.getElementById("kpiPendingPct");
const kpiMismatchPct = document.getElementById("kpiMismatchPct");

// HELPERS
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error");
  return res.json();
}

// DASHBOARD UPDATE
async function updateDashboard() {
  try {
    const scenario =
      document.getElementById("scenarioFilter").value;

    const txUrl = scenario
      ? `${API}/transactions?scenario=${scenario}`
      : `${API}/transactions`;

    const [summary, txns, volume] = await Promise.all([
    getJSON(`${API}/summary`),
    getJSON(txUrl),
    fetchVolume()
    ]);

    errorBanner.classList.add("hidden");

    kpiTotal.textContent = summary.total;
    kpiMatched.textContent = summary.matched;
    kpiPending.textContent = summary.pending;
    kpiMismatch.textContent = summary.mismatch;

    kpiMatchedPct.textContent =
      summary.total ? ((summary.matched / summary.total) * 100).toFixed(1) + "%" : "0%";
    kpiPendingPct.textContent =
      summary.total ? ((summary.pending / summary.total) * 100).toFixed(1) + "%" : "0%";
    kpiMismatchPct.textContent =
      summary.total ? ((summary.mismatch / summary.total) * 100).toFixed(1) + "%" : "0%";

    renderTable(txns);
    updateCharts(summary);
    updateVolumeChart(volume);

    lastUpdate.textContent = new Date().toLocaleTimeString();

  } catch (err) {
    errorBanner.classList.remove("hidden");
  }
}

// TABLE
function renderTable(txns) {
  if (!txns.length) {
    tbody.innerHTML =
      `<tr><td colspan="6" class="loading">No transactions</td></tr>`;
    return;
  }

  tbody.innerHTML = txns.map(t => `
    <tr>
      <td><strong>${t.transactionId}</strong></td>
      <td>₹${t.amount}</td>
      <td class="status-${t.result}">${t.result}</td>
      <td>${t.scenario}</td>
      <td>${new Date(t.timestamp).toLocaleString()}</td>
      <td>
        <button onclick="viewTxn('${t.transactionId}')">View</button>
      </td>
    </tr>
  `).join("");
}

async function fetchVolume() {
  return getJSON(`${API}/volume`);
}
// MODAL
async function viewTxn(id) {
  const d = await getJSON(`${API}/transaction/${id}`);

  document.getElementById("detailId").textContent = d.transactionId;
  document.getElementById("detailAmount").textContent = d.amount;
  document.getElementById("detailResult").textContent = d.result;
  document.getElementById("detailResult").className =
    `badge status-${d.result}`;

  document.getElementById("detailReason").textContent =
    d.mismatch_reason
      ? `Root Cause: ${d.mismatch_reason}`
      : "";

  const body = document.getElementById("detailSources");

  body.innerHTML = ["merchant", "gateway", "bank"]
    .map(src => {
      const s = d[src];
      if (!s) return "";

      const isMismatch =
        s.amount !== d.amount || s.status === "FAILED";

      return `
        <tr class="${isMismatch ? "highlight-mismatch" : ""}">
          <td>${src.toUpperCase()}</td>
          <td>₹${s.amount}</td>
          <td>${s.status}</td>
        </tr>
      `;
    })
    .join("");

  document.getElementById("detailModal").style.display = "block";
}

function closeModal() {
  document.getElementById("detailModal").style.display = "none";
}

// CHARTS
function initCharts() {
  volumeChart = new Chart(
    document.getElementById("volumeChart"),
    {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: "Transactions",
          data: [],
          fill: true,
          tension: 0.4
        }]
      }
    }
  );

  statusChart = new Chart(
    document.getElementById("statusChart"),
    {
      type: "doughnut",
      data: {
        labels: ["Matched", "Pending", "Mismatch"],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"]
        }]
      }
    }
  );
}

function updateCharts(summary) {
  statusChart.data.datasets[0].data = [
    summary.matched,
    summary.pending,
    summary.mismatch
  ];
  statusChart.update();
}

function updateVolumeChart(volumeData) {
  volumeChart.data.labels = volumeData.map(v => v.time);
  volumeChart.data.datasets[0].data = volumeData.map(v => v.count);
  volumeChart.update();
}

// LIVE UPDATES
socket.on("reconciliation_update", updateDashboard);

// FILTER
document
  .getElementById("scenarioFilter")
  .addEventListener("change", updateDashboard);

// INIT
initCharts();
updateDashboard();
setInterval(updateDashboard, 5000);
