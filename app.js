// Load sales and inventory data safely
let sales;
try {
  sales = JSON.parse(localStorage.getItem("sales") || "[]");
  if (!Array.isArray(sales)) sales = [];
} catch { sales = []; }

let inventory;
try {
  inventory = JSON.parse(localStorage.getItem("inventory") || "{}");
  if (typeof inventory !== "object" || inventory === null) inventory = {};
} catch { inventory = {}; }

// Helpers
function formatTime(dateStr){ return new Date(dateStr).toLocaleString(); }
function saveData(){
  localStorage.setItem("sales", JSON.stringify(sales));
  localStorage.setItem("inventory", JSON.stringify(inventory));
}

// Update datalist for autocomplete from inventory keys (fallback to sales if empty)
function updateItemList(){
  const itemList = document.getElementById("itemList");
  if(!itemList) return;
  let items = Object.keys(inventory);
  if (items.length === 0) {
    items = [...new Set(sales.map(s => s.item))];
  }
  itemList.innerHTML = items.map(i => `<option value="${i}">`).join("");
}

// Add Sale
function addSale(item, qty, sell, cost, left){
  const numQty = Number(qty), numSell = Number(sell), numCost = Number(cost), numLeft = Number(left);
  if(!item || [numQty,numSell,numCost,numLeft].some(v => Number.isNaN(v))) {
    alert("Invalid input");
    return;
  }

  // Log sale
  const record = { item, qty:numQty, sell:numSell, cost:numCost, left:numLeft, time:new Date() };
  sales.push(record);

  // Update inventory record (latest truth)
  const key = item.trim();
  if(!inventory[key]){
    inventory[key] = { stock:numLeft, cost:numCost, sell:numSell, status:"normal" };
  } else {
    inventory[key].stock = numLeft;
    inventory[key].cost  = numCost;
    inventory[key].sell  = numSell;
  }

  // Recalculate status tiers from totals
  recalcItemStatus();

  // Persist
  saveData();
  updateItemList();
}

// Recalculate item statuses (Best/Good/Normal)
function recalcItemStatus(){
  const totals = {};
  for (const s of sales) {
    const k = s.item.trim();
    totals[k] = (totals[k] || 0) + Number(s.qty || 0);
  }
  const sorted = Object.entries(totals).sort((a,b)=>b[1]-a[1]);

  // Assign tiers
  const bestSet = new Set(sorted.slice(0,3).map(([k])=>k));
  const goodSet = new Set(sorted.slice(3,6).map(([k])=>k));

  for (const k of Object.keys(inventory)) {
    if (bestSet.has(k)) inventory[k].status = "best";
    else if (goodSet.has(k)) inventory[k].status = "good";
    else inventory[k].status = "normal";
  }
}

// Render Dashboard (analytics only)
function renderDashboard(){
  const revenue = sales.reduce((t,s)=>t + Number(s.qty)*Number(s.sell), 0);
  const profit  = sales.reduce((t,s)=>t + (Number(s.sell)-Number(s.cost))*Number(s.qty), 0);

  const timeMap = {};
  for (const s of sales) {
    const h = new Date(s.time).getHours();
    timeMap[h] = (timeMap[h] || 0) + 1;
  }
  const bestTimeEntry = Object.entries(timeMap).sort((a,b)=>b[1]-a[1])[0];

  const dash = document.getElementById("dashboard");
  if (!dash) return;
  dash.innerHTML = `
    <div class="summary-card">Revenue: ${revenue.toFixed(2)}</div>
    <div class="summary-card">Profit: ${profit.toFixed(2)}</div>
    <div class="summary-card">Best Time: ${bestTimeEntry ? bestTimeEntry[0] + ":00" : "-"}</div>
  `;
}

// Render Inventory (with status badges)
function renderInventory(){
  const inv = document.getElementById("inventory");
  if (!inv) return;

  const keys = Object.keys(inventory);
  if (keys.length === 0) {
    inv.innerHTML = `<div class="summary-card">No inventory data yet.</div>`;
    return;
  }

  let html = "";
  for (const [item, data] of Object.entries(inventory)) {
    const badge = data.status==="best" ? "⚡ Best"
                : data.status==="good" ? "👍 Good"
                : "Normal";
    const low = Number(data.stock) < 20;
    const row = `<div class="${low ? "alert" : "summary-card"}">
      ${item}: ${data.stock} left | Cost: ${data.cost} | Sell: ${data.sell} | Status: ${badge}
    </div>`;
    html += row;
  }
  inv.innerHTML = html;
}

// Render Sales
function renderSales(){
  const tbody = document.querySelector("#salesTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  for (const s of sales) {
    tbody.innerHTML += `
      <tr>
        <td>${s.item}</td>
        <td>${s.qty}</td>
        <td>${s.sell}</td>
        <td>${s.cost}</td>
        <td>${s.left}</td>
        <td>${formatTime(s.time)}</td>
      </tr>
    `;
  }
}

// Reset all data
function resetData(){
  if(!confirm("Clear all data?")) return;
  sales = [];
  inventory = {};
  saveData();
  updateItemList();
  if(document.getElementById("dashboard")) renderDashboard();
  if(document.getElementById("inventory")) renderInventory();
  if(document.querySelector("#salesTable tbody")) renderSales();
}
