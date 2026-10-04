const STORAGE_KEY = "sizan-pharmacy-v1";
const ADMIN_PIN = "1234";
const STAFF_PIN = "0000";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const money = (amount) => `BDT ${Number(amount || 0).toFixed(2)}`;
const number = (value) => Number(value || 0);
const byName = (a, b) => a.name.localeCompare(b.name);

let db = loadData();
let currentUser = null;
let editing = {
  medicine: null,
  category: null,
  company: null,
  supplier: null,
  customer: null,
};

function seedData() {
  const categories = [
    { id: "cat-tablet", name: "Tablet" },
    { id: "cat-syrup", name: "Syrup" },
    { id: "cat-injection", name: "Injection" },
  ];
  const companies = [
    { id: "com-square", name: "Square Pharmaceuticals" },
    { id: "com-beximco", name: "Beximco Pharma" },
    { id: "com-incepta", name: "Incepta" },
  ];
  const suppliers = [
    { id: "sup-1", name: "Metro Medical Supply", phone: "01710000001", due: 2500, address: "Dhaka" },
    { id: "sup-2", name: "Central Pharma Depot", phone: "01710000002", due: 0, address: "Chattogram" },
  ];
  const customers = [
    { id: "cus-1", name: "Walk-in Customer", phone: "", due: 0, address: "" },
    { id: "cus-2", name: "Rahim Ahmed", phone: "01810000003", due: 420, address: "Mirpur" },
  ];
  const medicines = [
    {
      id: "med-napa",
      name: "Napa 500",
      generic: "Paracetamol",
      categoryId: "cat-tablet",
      companyId: "com-beximco",
      barcode: "8941100010010",
      lowStock: 60,
      salePrice: 1.8,
    },
    {
      id: "med-seclo",
      name: "Seclo 20",
      generic: "Omeprazole",
      categoryId: "cat-tablet",
      companyId: "com-square",
      barcode: "8941100010027",
      lowStock: 40,
      salePrice: 6,
    },
    {
      id: "med-napa-syrup",
      name: "Napa Syrup",
      generic: "Paracetamol",
      categoryId: "cat-syrup",
      companyId: "com-beximco",
      barcode: "8941100010034",
      lowStock: 20,
      salePrice: 35,
    },
  ];
  const batches = [
    {
      id: "bat-1",
      medicineId: "med-napa",
      batchNo: "NP2401",
      expiryDate: addDays(75),
      quantity: 180,
      purchasePrice: 1.12,
      salePrice: 1.8,
      supplierId: "sup-1",
      purchaseId: "pur-1",
    },
    {
      id: "bat-2",
      medicineId: "med-seclo",
      batchNo: "SC2309",
      expiryDate: addDays(25),
      quantity: 35,
      purchasePrice: 3.7,
      salePrice: 6,
      supplierId: "sup-2",
      purchaseId: "pur-2",
    },
    {
      id: "bat-3",
      medicineId: "med-napa-syrup",
      batchNo: "NS2306",
      expiryDate: addDays(12),
      quantity: 18,
      purchasePrice: 23,
      salePrice: 35,
      supplierId: "sup-1",
      purchaseId: "pur-3",
    },
  ];
  const purchases = [
    {
      id: "pur-1",
      date: addDays(-12),
      supplierId: "sup-1",
      medicineId: "med-napa",
      batchNo: "NP2401",
      expiryDate: addDays(75),
      quantity: 200,
      purchasePrice: 1.12,
      salePrice: 1.8,
      paid: 224,
      total: 224,
      due: 0,
    },
    {
      id: "pur-2",
      date: addDays(-8),
      supplierId: "sup-2",
      medicineId: "med-seclo",
      batchNo: "SC2309",
      expiryDate: addDays(25),
      quantity: 50,
      purchasePrice: 3.7,
      salePrice: 6,
      paid: 185,
      total: 185,
      due: 0,
    },
    {
      id: "pur-3",
      date: addDays(-3),
      supplierId: "sup-1",
      medicineId: "med-napa-syrup",
      batchNo: "NS2306",
      expiryDate: addDays(12),
      quantity: 24,
      purchasePrice: 23,
      salePrice: 35,
      paid: 300,
      total: 552,
      due: 252,
    },
  ];
  const sales = [
    {
      id: "sal-1",
      invoiceNo: "INV-1001",
      date: addDays(-2),
      customerId: "cus-1",
      medicineId: "med-napa",
      batchNo: "NP2401",
      quantity: 20,
      salePrice: 1.8,
      total: 36,
      paid: 36,
      due: 0,
      costTotal: 22.4,
    },
    {
      id: "sal-2",
      invoiceNo: "INV-1002",
      date: addDays(-1),
      customerId: "cus-2",
      medicineId: "med-seclo",
      batchNo: "SC2309",
      quantity: 15,
      salePrice: 6,
      total: 90,
      paid: 50,
      due: 40,
      costTotal: 55.5,
    },
  ];
  return { categories, companies, suppliers, customers, medicines, batches, purchases, sales };
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return seedData();
  try {
    return JSON.parse(saved);
  } catch {
    return seedData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function requireAdmin() {
  if (currentUser !== "admin") {
    alert("Admin role is required for this action.");
    return false;
  }
  return true;
}

function getCategory(id) {
  return db.categories.find((item) => item.id === id)?.name || "Uncategorized";
}

function getCompany(id) {
  return db.companies.find((item) => item.id === id)?.name || "Unknown company";
}

function getSupplier(id) {
  return db.suppliers.find((item) => item.id === id)?.name || "Unknown supplier";
}

function getCustomer(id) {
  return db.customers.find((item) => item.id === id)?.name || "Walk-in Customer";
}

function getMedicine(id) {
  return db.medicines.find((item) => item.id === id);
}

function stockFor(medicineId) {
  return db.batches
    .filter((batch) => batch.medicineId === medicineId)
    .reduce((sum, batch) => sum + number(batch.quantity), 0);
}

function expiryStatus(expiryDate) {
  const days = Math.ceil((new Date(expiryDate) - new Date(todayISO())) / 86400000);
  if (days < 0) return { label: "Expired", className: "bad", days };
  if (days <= 30) return { label: `${days} days`, className: "bad", days };
  if (days <= 90) return { label: `${days} days`, className: "warn", days };
  return { label: `${days} days`, className: "good", days };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function options(items, selected, placeholder = "Select") {
  return `<option value="">${placeholder}</option>${items
    .slice()
    .sort(byName)
    .map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${escapeHtml(item.name)}</option>`)
    .join("")}`;
}

function emptyState() {
  return $("#empty-state-template").innerHTML;
}

function renderTable(target, columns, rows) {
  if (!rows.length) {
    $(target).innerHTML = emptyState();
    return;
  }
  const head = columns.map((column) => `<th>${column.label}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${column.render(row)}</td>`).join("")}</tr>`)
    .join("");
  $(target).innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function currentSearch() {
  return $("#global-search").value.trim().toLowerCase();
}

function medicineMatches(medicine, term = currentSearch()) {
  if (!term) return true;
  return [medicine.name, medicine.generic, medicine.barcode, getCompany(medicine.companyId), getCategory(medicine.categoryId)]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

function thisMonth() {
  return todayISO().slice(0, 7);
}

function monthOf(date) {
  return date.slice(0, 7);
}

function showView(viewName) {
  $$(".view").forEach((view) => view.classList.remove("active-view"));
  $(`#${viewName}-view`).classList.add("active-view");
  $$("#main-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  $("#view-title").textContent = $(`#main-nav button[data-view="${viewName}"]`).textContent;
  renderAll();
}

function renderMetrics() {
  const totalSales = db.sales.reduce((sum, sale) => sum + number(sale.total), 0);
  const totalDue = db.sales.reduce((sum, sale) => sum + number(sale.due), 0) + db.purchases.reduce((sum, purchase) => sum + number(purchase.due), 0);
  const stockValue = db.batches.reduce((sum, batch) => sum + number(batch.quantity) * number(batch.purchasePrice), 0);
  const expiring = db.batches.filter((batch) => expiryStatus(batch.expiryDate).days <= 30).length;
  const metrics = [
    { label: "Total sales", value: money(totalSales), note: `${db.sales.length} invoices` },
    { label: "Current stock value", value: money(stockValue), note: `${db.batches.length} active batches` },
    { label: "Expiry alerts", value: expiring, note: "Within 30 days or expired" },
    { label: "Total due", value: money(totalDue), note: "Sales + purchase due" },
  ];
  $("#metric-grid").innerHTML = metrics
    .map((metric) => `<article class="metric-card"><span>${metric.label}</span><strong>${metric.value}</strong><small>${metric.note}</small></article>`)
    .join("");
}

function getAlerts() {
  const alerts = [];
  db.medicines.forEach((medicine) => {
    const stock = stockFor(medicine.id);
    if (stock <= number(medicine.lowStock)) {
      alerts.push({
        type: "warn",
        title: `${medicine.name} is low stock`,
        detail: `${stock} left, reorder level ${medicine.lowStock}`,
      });
    }
  });
  db.batches.forEach((batch) => {
    const medicine = getMedicine(batch.medicineId);
    const status = expiryStatus(batch.expiryDate);
    if (status.days <= 30) {
      alerts.push({
        type: status.days < 0 ? "danger" : "warn",
        title: `${medicine?.name || "Medicine"} batch ${batch.batchNo}`,
        detail: status.days < 0 ? `Expired on ${formatDate(batch.expiryDate)}` : `Expires in ${status.days} days`,
      });
    }
  });
  db.sales.filter((sale) => sale.due > 0).forEach((sale) => {
    alerts.push({
      type: "info",
      title: `${sale.invoiceNo} has customer due`,
      detail: `${getCustomer(sale.customerId)} owes ${money(sale.due)}`,
    });
  });
  return alerts;
}

function renderAlerts() {
  const alerts = getAlerts();
  $("#alert-count").textContent = alerts.length;
  if (!alerts.length) {
    $("#alert-list").innerHTML = emptyState();
    return;
  }
  $("#alert-list").innerHTML = alerts
    .map(
      (alert) => `
        <div class="alert-item ${alert.type}">
          <div><strong>${escapeHtml(alert.title)}</strong><br><span class="muted">${escapeHtml(alert.detail)}</span></div>
        </div>
      `
    )
    .join("");
}

function renderSalesChart() {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
  const values = days.map((day) => db.sales.filter((sale) => sale.date === day).reduce((sum, sale) => sum + number(sale.total), 0));
  const max = Math.max(...values, 1);
  $("#sales-chart").innerHTML = days
    .map((day, index) => {
      const height = Math.max(6, Math.round((values[index] / max) * 170));
      return `
        <div class="bar">
          <div class="bar-fill" title="${money(values[index])}" style="height:${height}px"></div>
          <small>${new Date(day).toLocaleDateString("en-GB", { weekday: "short" })}<br>${money(values[index])}</small>
        </div>
      `;
    })
    .join("");
}

function renderQuickResults() {
  const term = currentSearch();
  const rows = db.medicines.filter((medicine) => medicineMatches(medicine, term)).slice(0, 8);
  renderTable("#quick-results", medicineColumns(false), rows);
}

function medicineColumns(withActions = true) {
  const columns = [
    { label: "Medicine", render: (m) => `<strong>${escapeHtml(m.name)}</strong><br><span class="muted">${escapeHtml(m.generic || "")}</span>` },
    { label: "Category", render: (m) => escapeHtml(getCategory(m.categoryId)) },
    { label: "Company", render: (m) => escapeHtml(getCompany(m.companyId)) },
    { label: "Barcode", render: (m) => escapeHtml(m.barcode || "-") },
    { label: "Stock", render: (m) => stockFor(m.id) },
    { label: "Sale price", render: (m) => money(m.salePrice) },
    { label: "Low alert", render: (m) => m.lowStock },
  ];
  if (withActions) {
    columns.push({
      label: "Actions",
      render: (m) => `
        <div class="action-row">
          <button class="table-action" data-edit-medicine="${m.id}">Edit</button>
          <button class="table-action danger-action" data-delete-medicine="${m.id}">Delete</button>
        </div>
      `,
    });
  }
  return columns;
}

function renderMedicineForm() {
  const medicine = editing.medicine ? getMedicine(editing.medicine) : {};
  $("#medicine-form").innerHTML = `
    <label>Name<input name="name" required value="${escapeHtml(medicine.name || "")}"></label>
    <label>Generic<input name="generic" value="${escapeHtml(medicine.generic || "")}"></label>
    <label>Category<select name="categoryId" required>${options(db.categories, medicine.categoryId, "Select category")}</select></label>
    <label>Company<select name="companyId" required>${options(db.companies, medicine.companyId, "Select company")}</select></label>
    <label>Barcode<input name="barcode" id="medicine-barcode" value="${escapeHtml(medicine.barcode || "")}"></label>
    <label>Sale price<input name="salePrice" type="number" min="0" step="0.01" required value="${medicine.salePrice || ""}"></label>
    <label>Low-stock alert<input name="lowStock" type="number" min="0" required value="${medicine.lowStock || 10}"></label>
    <div class="action-row full">
      <button class="primary-button" type="submit">${editing.medicine ? "Update medicine" : "Add medicine"}</button>
      <button class="secondary-button" type="button" id="scan-medicine-barcode">Scan barcode</button>
      ${editing.medicine ? '<button class="ghost-button" type="button" id="cancel-medicine-edit">Cancel</button>' : ""}
    </div>
  `;
}

function renderMedicines() {
  renderMedicineForm();
  const rows = db.medicines.filter((medicine) => medicineMatches(medicine));
  $("#medicine-count").textContent = rows.length;
  renderTable("#medicine-table", medicineColumns(true), rows);
}

function renderMasterForms() {
  const category = db.categories.find((item) => item.id === editing.category) || {};
  const company = db.companies.find((item) => item.id === editing.company) || {};
  $("#category-form").innerHTML = `
    <input name="name" placeholder="Category name" required value="${escapeHtml(category.name || "")}">
    <button class="primary-button" type="submit">${editing.category ? "Update" : "Add"}</button>
  `;
  $("#company-form").innerHTML = `
    <input name="name" placeholder="Company name" required value="${escapeHtml(company.name || "")}">
    <button class="primary-button" type="submit">${editing.company ? "Update" : "Add"}</button>
  `;
}

function renderMasters() {
  renderMasterForms();
  renderTable(
    "#category-table",
    [
      { label: "Category", render: (item) => escapeHtml(item.name) },
      {
        label: "Actions",
        render: (item) => `
          <div class="action-row">
            <button class="table-action" data-edit-category="${item.id}">Edit</button>
            <button class="table-action danger-action" data-delete-category="${item.id}">Delete</button>
          </div>
        `,
      },
    ],
    db.categories.slice().sort(byName)
  );
  renderTable(
    "#company-table",
    [
      { label: "Company", render: (item) => escapeHtml(item.name) },
      {
        label: "Actions",
        render: (item) => `
          <div class="action-row">
            <button class="table-action" data-edit-company="${item.id}">Edit</button>
            <button class="table-action danger-action" data-delete-company="${item.id}">Delete</button>
          </div>
        `,
      },
    ],
    db.companies.slice().sort(byName)
  );
}

function renderPurchaseForm() {
  $("#purchase-form").innerHTML = `
    <label>Date<input name="date" type="date" required value="${todayISO()}"></label>
    <label>Supplier<select name="supplierId" required>${options(db.suppliers, "", "Select supplier")}</select></label>
    <label>Medicine<select name="medicineId" required>${options(db.medicines, "", "Select medicine")}</select></label>
    <label>Batch number<input name="batchNo" required placeholder="Batch no"></label>
    <label>Expiry date<input name="expiryDate" type="date" required value="${addDays(365)}"></label>
    <label>Quantity<input name="quantity" type="number" min="1" required></label>
    <label>Purchase price<input name="purchasePrice" type="number" min="0" step="0.01" required></label>
    <label>Sale price<input name="salePrice" type="number" min="0" step="0.01" required></label>
    <label>Paid amount<input name="paid" type="number" min="0" step="0.01" value="0"></label>
    <div class="action-row full">
      <button class="primary-button" type="submit">Save purchase</button>
    </div>
  `;
}

function renderPurchases() {
  renderPurchaseForm();
  const rows = db.purchases.slice().sort((a, b) => b.date.localeCompare(a.date));
  $("#purchase-total").textContent = money(rows.reduce((sum, purchase) => sum + number(purchase.total), 0));
  renderTable(
    "#purchase-table",
    [
      { label: "Date", render: (p) => formatDate(p.date) },
      { label: "Supplier", render: (p) => escapeHtml(getSupplier(p.supplierId)) },
      { label: "Medicine", render: (p) => escapeHtml(getMedicine(p.medicineId)?.name || "-") },
      { label: "Batch", render: (p) => escapeHtml(p.batchNo) },
      { label: "Qty", render: (p) => p.quantity },
      { label: "Total", render: (p) => money(p.total) },
      { label: "Due", render: (p) => money(p.due) },
    ],
    rows
  );
}

function renderSaleForm() {
  $("#sale-form").innerHTML = `
    <label>Date<input name="date" type="date" required value="${todayISO()}"></label>
    <label>Customer<select name="customerId" required>${options(db.customers, "cus-1", "Select customer")}</select></label>
    <label class="full">Barcode search<input id="sale-barcode" placeholder="Scan or type barcode, then press Lookup"></label>
    <label>Medicine<select name="medicineId" required>${options(db.medicines, "", "Select medicine")}</select></label>
    <label>Quantity<input name="quantity" type="number" min="1" required></label>
    <label>Sale price<input name="salePrice" type="number" min="0" step="0.01" required></label>
    <label>Paid amount<input name="paid" type="number" min="0" step="0.01" value="0"></label>
    <div class="action-row full">
      <button class="primary-button" type="submit">Create sale</button>
      <button class="secondary-button" type="button" id="lookup-barcode">Lookup barcode</button>
      <button class="secondary-button" type="button" id="scan-sale-barcode">Scan barcode</button>
    </div>
  `;
}

function renderSales() {
  renderSaleForm();
  const rows = db.sales.slice().sort((a, b) => b.date.localeCompare(a.date));
  $("#sales-total").textContent = money(rows.reduce((sum, sale) => sum + number(sale.total), 0));
  renderTable(
    "#sales-table",
    [
      { label: "Invoice", render: (s) => escapeHtml(s.invoiceNo) },
      { label: "Date", render: (s) => formatDate(s.date) },
      { label: "Customer", render: (s) => escapeHtml(getCustomer(s.customerId)) },
      { label: "Medicine", render: (s) => escapeHtml(getMedicine(s.medicineId)?.name || "-") },
      { label: "Batch", render: (s) => escapeHtml(s.batchNo) },
      { label: "Qty", render: (s) => s.quantity },
      { label: "Total", render: (s) => money(s.total) },
      { label: "Due", render: (s) => money(s.due) },
      { label: "Invoice", render: (s) => `<button class="table-action" data-invoice="${s.id}">View</button>` },
    ],
    rows
  );
}

function renderStock() {
  const rows = db.batches
    .filter((batch) => batch.quantity > 0)
    .map((batch) => ({ ...batch, medicine: getMedicine(batch.medicineId) }))
    .filter((batch) => !currentSearch() || medicineMatches(batch.medicine))
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  renderTable(
    "#stock-table",
    [
      { label: "Medicine", render: (b) => `<strong>${escapeHtml(b.medicine?.name || "-")}</strong><br><span class="muted">${escapeHtml(getCompany(b.medicine?.companyId))}</span>` },
      { label: "Batch", render: (b) => escapeHtml(b.batchNo) },
      { label: "Qty", render: (b) => b.quantity },
      { label: "Expiry", render: (b) => formatDate(b.expiryDate) },
      { label: "Status", render: (b) => `<span class="status ${expiryStatus(b.expiryDate).className}">${expiryStatus(b.expiryDate).label}</span>` },
      { label: "Cost", render: (b) => money(b.purchasePrice) },
      { label: "Sale", render: (b) => money(b.salePrice) },
      { label: "Supplier", render: (b) => escapeHtml(getSupplier(b.supplierId)) },
    ],
    rows
  );
}

function renderPeopleForms() {
  const supplier = db.suppliers.find((item) => item.id === editing.supplier) || {};
  const customer = db.customers.find((item) => item.id === editing.customer) || {};
  $("#supplier-form").innerHTML = personFields(supplier, editing.supplier ? "Update supplier" : "Add supplier");
  $("#customer-form").innerHTML = personFields(customer, editing.customer ? "Update customer" : "Add customer");
}

function personFields(person, buttonLabel) {
  return `
    <label>Name<input name="name" required value="${escapeHtml(person.name || "")}"></label>
    <label>Phone<input name="phone" value="${escapeHtml(person.phone || "")}"></label>
    <label>Opening due<input name="due" type="number" min="0" step="0.01" value="${person.due || 0}"></label>
    <label>Address<textarea name="address" rows="2">${escapeHtml(person.address || "")}</textarea></label>
    <div class="action-row">
      <button class="primary-button" type="submit">${buttonLabel}</button>
    </div>
  `;
}

function renderPeople() {
  renderPeopleForms();
  renderTable(
    "#supplier-table",
    personColumns("supplier"),
    db.suppliers.slice().sort(byName)
  );
  renderTable(
    "#customer-table",
    personColumns("customer"),
    db.customers.slice().sort(byName)
  );
}

function personColumns(type) {
  return [
    { label: "Name", render: (p) => `<strong>${escapeHtml(p.name)}</strong><br><span class="muted">${escapeHtml(p.phone || "-")}</span>` },
    { label: "Due", render: (p) => money(p.due) },
    { label: "Address", render: (p) => escapeHtml(p.address || "-") },
    {
      label: "Actions",
      render: (p) => `
        <div class="action-row">
          <button class="table-action" data-edit-${type}="${p.id}">Edit</button>
          <button class="table-action danger-action" data-delete-${type}="${p.id}">Delete</button>
        </div>
      `,
    },
  ];
}

function reportMonth() {
  return $("#report-month").value || thisMonth();
}

function renderReports() {
  if (!$("#report-month").value) $("#report-month").value = thisMonth();
  const month = reportMonth();
  const sales = db.sales.filter((sale) => monthOf(sale.date) === month);
  const purchases = db.purchases.filter((purchase) => monthOf(purchase.date) === month);
  const totalSales = sales.reduce((sum, sale) => sum + number(sale.total), 0);
  const totalCost = sales.reduce((sum, sale) => sum + number(sale.costTotal), 0);
  const totalPurchase = purchases.reduce((sum, purchase) => sum + number(purchase.total), 0);
  const profit = totalSales - totalCost;
  $("#report-metrics").innerHTML = [
    { label: "Monthly sales", value: money(totalSales), note: `${sales.length} invoices` },
    { label: "Monthly purchases", value: money(totalPurchase), note: `${purchases.length} entries` },
    { label: "Gross profit", value: money(profit), note: "Sales minus batch cost" },
    { label: "Monthly due", value: money(sales.reduce((sum, sale) => sum + number(sale.due), 0)), note: "Customer dues" },
  ]
    .map((metric) => `<article class="metric-card"><span>${metric.label}</span><strong>${metric.value}</strong><small>${metric.note}</small></article>`)
    .join("");

  const daily = Object.values(
    sales.reduce((map, sale) => {
      map[sale.date] ||= { date: sale.date, sales: 0, due: 0, invoices: 0 };
      map[sale.date].sales += number(sale.total);
      map[sale.date].due += number(sale.due);
      map[sale.date].invoices += 1;
      return map;
    }, {})
  ).sort((a, b) => b.date.localeCompare(a.date));

  renderTable(
    "#daily-report",
    [
      { label: "Date", render: (row) => formatDate(row.date) },
      { label: "Invoices", render: (row) => row.invoices },
      { label: "Sales", render: (row) => money(row.sales) },
      { label: "Due", render: (row) => money(row.due) },
    ],
    daily
  );

  renderTable(
    "#profit-report",
    [
      { label: "Type", render: (row) => row.type },
      { label: "Amount", render: (row) => money(row.amount) },
      { label: "Note", render: (row) => row.note },
    ],
    [
      { type: "Sales revenue", amount: totalSales, note: "From selected month" },
      { type: "Medicine cost", amount: totalCost, note: "Cost of sold batches" },
      { type: "Purchase spend", amount: totalPurchase, note: "New purchases this month" },
      { type: profit >= 0 ? "Profit" : "Loss", amount: Math.abs(profit), note: profit >= 0 ? "Positive margin" : "Negative margin" },
    ]
  );
}

function renderAll() {
  renderMetrics();
  renderAlerts();
  renderSalesChart();
  renderQuickResults();
  renderMedicines();
  renderMasters();
  renderPurchases();
  renderSales();
  renderStock();
  renderPeople();
  renderReports();
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function upsertNamed(collection, editKey, prefix, form) {
  const data = formObject(form);
  if (editing[editKey]) {
    const item = db[collection].find((row) => row.id === editing[editKey]);
    item.name = data.name.trim();
    editing[editKey] = null;
  } else {
    db[collection].push({ id: uid(prefix), name: data.name.trim() });
  }
  saveData();
  renderAll();
}

function upsertPerson(collection, editKey, prefix, form) {
  const data = formObject(form);
  const person = {
    name: data.name.trim(),
    phone: data.phone.trim(),
    due: number(data.due),
    address: data.address.trim(),
  };
  if (editing[editKey]) {
    Object.assign(db[collection].find((row) => row.id === editing[editKey]), person);
    editing[editKey] = null;
  } else {
    db[collection].push({ id: uid(prefix), ...person });
  }
  saveData();
  renderAll();
}

function deleteFrom(collection, id, usageCheck) {
  if (!requireAdmin()) return;
  if (usageCheck()) {
    alert("This item is already used in records, so it cannot be deleted.");
    return;
  }
  db[collection] = db[collection].filter((item) => item.id !== id);
  saveData();
  renderAll();
}

function handleMedicineSubmit(event) {
  event.preventDefault();
  const data = formObject(event.currentTarget);
  const medicine = {
    name: data.name.trim(),
    generic: data.generic.trim(),
    categoryId: data.categoryId,
    companyId: data.companyId,
    barcode: data.barcode.trim(),
    lowStock: number(data.lowStock),
    salePrice: number(data.salePrice),
  };
  if (editing.medicine) {
    Object.assign(getMedicine(editing.medicine), medicine);
    editing.medicine = null;
  } else {
    db.medicines.push({ id: uid("med"), ...medicine });
  }
  saveData();
  renderAll();
}

function handlePurchaseSubmit(event) {
  event.preventDefault();
  const data = formObject(event.currentTarget);
  const quantity = number(data.quantity);
  const purchasePrice = number(data.purchasePrice);
  const salePrice = number(data.salePrice);
  const total = quantity * purchasePrice;
  const paid = number(data.paid);
  const due = Math.max(0, total - paid);
  const purchaseId = uid("pur");
  db.purchases.push({
    id: purchaseId,
    date: data.date,
    supplierId: data.supplierId,
    medicineId: data.medicineId,
    batchNo: data.batchNo.trim(),
    expiryDate: data.expiryDate,
    quantity,
    purchasePrice,
    salePrice,
    paid,
    total,
    due,
  });
  const existingBatch = db.batches.find(
    (batch) => batch.medicineId === data.medicineId && batch.batchNo.toLowerCase() === data.batchNo.trim().toLowerCase()
  );
  if (existingBatch) {
    existingBatch.quantity += quantity;
    existingBatch.expiryDate = data.expiryDate;
    existingBatch.purchasePrice = purchasePrice;
    existingBatch.salePrice = salePrice;
    existingBatch.supplierId = data.supplierId;
  } else {
    db.batches.push({
      id: uid("bat"),
      medicineId: data.medicineId,
      batchNo: data.batchNo.trim(),
      expiryDate: data.expiryDate,
      quantity,
      purchasePrice,
      salePrice,
      supplierId: data.supplierId,
      purchaseId,
    });
  }
  const supplier = db.suppliers.find((item) => item.id === data.supplierId);
  if (supplier) supplier.due = number(supplier.due) + due;
  saveData();
  event.currentTarget.reset();
  renderAll();
}

function consumeStock(medicineId, quantity) {
  let remaining = quantity;
  let costTotal = 0;
  const usedBatches = [];
  const batches = db.batches
    .filter((batch) => batch.medicineId === medicineId && batch.quantity > 0)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const available = batches.reduce((sum, batch) => sum + number(batch.quantity), 0);
  if (available < quantity) {
    return { ok: false, message: `Only ${available} units are available in stock.` };
  }
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    batch.quantity -= take;
    remaining -= take;
    costTotal += take * number(batch.purchasePrice);
    usedBatches.push(`${batch.batchNo} (${take})`);
  }
  return { ok: true, costTotal, batchNo: usedBatches.join(", ") };
}

function nextInvoiceNo() {
  const next = db.sales.length + 1001;
  return `INV-${next}`;
}

function handleSaleSubmit(event) {
  event.preventDefault();
  const data = formObject(event.currentTarget);
  const quantity = number(data.quantity);
  const salePrice = number(data.salePrice);
  const total = quantity * salePrice;
  const paid = number(data.paid);
  const due = Math.max(0, total - paid);
  const stock = consumeStock(data.medicineId, quantity);
  if (!stock.ok) {
    alert(stock.message);
    return;
  }
  const sale = {
    id: uid("sal"),
    invoiceNo: nextInvoiceNo(),
    date: data.date,
    customerId: data.customerId,
    medicineId: data.medicineId,
    batchNo: stock.batchNo,
    quantity,
    salePrice,
    total,
    paid,
    due,
    costTotal: stock.costTotal,
  };
  db.sales.push(sale);
  const customer = db.customers.find((item) => item.id === data.customerId);
  if (customer) customer.due = number(customer.due) + due;
  saveData();
  event.currentTarget.reset();
  $("#last-invoice").innerHTML = invoiceHtml(sale);
  renderAll();
  $("#last-invoice").innerHTML = invoiceHtml(sale);
}

function invoiceHtml(sale) {
  const medicine = getMedicine(sale.medicineId);
  return `
    <article class="invoice">
      <div class="invoice-head">
        <div>
          <strong>Sizan Pharmacy</strong><br>
          <span class="muted">Medicine sales invoice</span>
        </div>
        <div>
          <strong>${escapeHtml(sale.invoiceNo)}</strong><br>
          <span class="muted">${formatDate(sale.date)}</span>
        </div>
      </div>
      <table>
        <tbody>
          <tr><th>Customer</th><td>${escapeHtml(getCustomer(sale.customerId))}</td></tr>
          <tr><th>Medicine</th><td>${escapeHtml(medicine?.name || "-")}</td></tr>
          <tr><th>Batch</th><td>${escapeHtml(sale.batchNo)}</td></tr>
          <tr><th>Quantity</th><td>${sale.quantity}</td></tr>
          <tr><th>Unit price</th><td>${money(sale.salePrice)}</td></tr>
          <tr><th>Total</th><td>${money(sale.total)}</td></tr>
          <tr><th>Paid</th><td>${money(sale.paid)}</td></tr>
          <tr><th>Due</th><td>${money(sale.due)}</td></tr>
        </tbody>
      </table>
      <div class="action-row" style="margin-top: 12px">
        <button class="primary-button" onclick="window.print()">Print invoice</button>
      </div>
    </article>
  `;
}

function lookupBarcode() {
  const code = $("#sale-barcode")?.value.trim();
  if (!code) return;
  const medicine = db.medicines.find((item) => item.barcode === code);
  if (!medicine) {
    alert("No medicine found for this barcode.");
    return;
  }
  const form = $("#sale-form");
  form.elements.medicineId.value = medicine.id;
  form.elements.salePrice.value = medicine.salePrice;
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `sizan-pharmacy-backup-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function restoreBackup(file) {
  if (!requireAdmin() || !file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      ["categories", "companies", "suppliers", "customers", "medicines", "batches", "purchases", "sales"].forEach((key) => {
        if (!Array.isArray(parsed[key])) throw new Error(`Missing ${key}`);
      });
      db = parsed;
      saveData();
      renderAll();
      alert("Backup restored successfully.");
    } catch (error) {
      alert(`Invalid backup file: ${error.message}`);
    }
  };
  reader.readAsText(file);
}

function startBarcodeScan(inputId) {
  const input = document.getElementById(inputId);
  if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
    input?.focus();
    alert("Camera barcode scanning is not supported in this browser. A USB/Bluetooth barcode scanner still works by typing into the barcode field.");
    return;
  }
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:20px";
  overlay.innerHTML = `
    <div style="width:min(100%,520px);background:#fff;border-radius:8px;padding:14px">
      <video style="width:100%;border-radius:7px;background:#111" autoplay muted playsinline></video>
      <div class="action-row" style="margin-top:12px">
        <button class="primary-button" type="button">Close scanner</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const video = overlay.querySelector("video");
  const detector = new BarcodeDetector({ formats: ["ean_13", "code_128", "qr_code"] });
  let stream;
  let active = true;
  const close = () => {
    active = false;
    stream?.getTracks().forEach((track) => track.stop());
    overlay.remove();
  };
  overlay.querySelector("button").addEventListener("click", close);
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then((cameraStream) => {
      stream = cameraStream;
      video.srcObject = cameraStream;
      const scan = async () => {
        if (!active) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length) {
            input.value = codes[0].rawValue;
            close();
            if (inputId === "sale-barcode") lookupBarcode();
            return;
          }
        } catch {
          close();
          alert("The barcode scanner could not read from the camera.");
          return;
        }
        requestAnimationFrame(scan);
      };
      video.addEventListener("loadedmetadata", scan, { once: true });
    })
    .catch(() => {
      close();
      input?.focus();
      alert("Camera permission was blocked. You can still use a hardware barcode scanner or type the barcode.");
    });
}

function bindEvents() {
  $("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const role = $("#login-role").value;
    const pin = $("#login-pin").value;
    if ((role === "admin" && pin === ADMIN_PIN) || (role === "staff" && pin === STAFF_PIN)) {
      currentUser = role;
      $("#current-role").textContent = role === "admin" ? "Admin" : "Staff";
      $("#login-screen").classList.add("hidden");
      $("#app-shell").classList.remove("hidden");
      renderAll();
      return;
    }
    $("#login-error").textContent = "Invalid role or PIN.";
  });

  $("#logout-button").addEventListener("click", () => {
    currentUser = null;
    $("#login-pin").value = "";
    $("#app-shell").classList.add("hidden");
    $("#login-screen").classList.remove("hidden");
  });

  $("#main-nav").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (button) showView(button.dataset.view);
  });

  $("#global-search").addEventListener("input", renderAll);
  $("#print-button").addEventListener("click", () => window.print());
  $("#medicine-form").addEventListener("submit", handleMedicineSubmit);
  $("#purchase-form").addEventListener("submit", handlePurchaseSubmit);
  $("#sale-form").addEventListener("submit", handleSaleSubmit);
  $("#category-form").addEventListener("submit", (event) => {
    event.preventDefault();
    upsertNamed("categories", "category", "cat", event.currentTarget);
  });
  $("#company-form").addEventListener("submit", (event) => {
    event.preventDefault();
    upsertNamed("companies", "company", "com", event.currentTarget);
  });
  $("#supplier-form").addEventListener("submit", (event) => {
    event.preventDefault();
    upsertPerson("suppliers", "supplier", "sup", event.currentTarget);
  });
  $("#customer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    upsertPerson("customers", "customer", "cus", event.currentTarget);
  });
  $("#refresh-reports").addEventListener("click", renderReports);
  $("#report-month").addEventListener("change", renderReports);
  $("#export-backup").addEventListener("click", exportBackup);
  $("#restore-file").addEventListener("change", (event) => restoreBackup(event.target.files[0]));

  document.addEventListener("click", (event) => {
    const target = event.target;
    const editMedicine = target.closest("[data-edit-medicine]");
    const deleteMedicine = target.closest("[data-delete-medicine]");
    const editCategory = target.closest("[data-edit-category]");
    const deleteCategory = target.closest("[data-delete-category]");
    const editCompany = target.closest("[data-edit-company]");
    const deleteCompany = target.closest("[data-delete-company]");
    const editSupplier = target.closest("[data-edit-supplier]");
    const deleteSupplier = target.closest("[data-delete-supplier]");
    const editCustomer = target.closest("[data-edit-customer]");
    const deleteCustomer = target.closest("[data-delete-customer]");
    const invoice = target.closest("[data-invoice]");
    if (editMedicine) {
      editing.medicine = editMedicine.dataset.editMedicine;
      renderMedicines();
    }
    if (deleteMedicine) {
      deleteFrom("medicines", deleteMedicine.dataset.deleteMedicine, () =>
        db.batches.some((batch) => batch.medicineId === deleteMedicine.dataset.deleteMedicine)
      );
    }
    if (editCategory) {
      editing.category = editCategory.dataset.editCategory;
      renderMasters();
    }
    if (deleteCategory) {
      deleteFrom("categories", deleteCategory.dataset.deleteCategory, () =>
        db.medicines.some((medicine) => medicine.categoryId === deleteCategory.dataset.deleteCategory)
      );
    }
    if (editCompany) {
      editing.company = editCompany.dataset.editCompany;
      renderMasters();
    }
    if (deleteCompany) {
      deleteFrom("companies", deleteCompany.dataset.deleteCompany, () =>
        db.medicines.some((medicine) => medicine.companyId === deleteCompany.dataset.deleteCompany)
      );
    }
    if (editSupplier) {
      editing.supplier = editSupplier.dataset.editSupplier;
      renderPeople();
    }
    if (deleteSupplier) {
      deleteFrom("suppliers", deleteSupplier.dataset.deleteSupplier, () =>
        db.purchases.some((purchase) => purchase.supplierId === deleteSupplier.dataset.deleteSupplier)
      );
    }
    if (editCustomer) {
      editing.customer = editCustomer.dataset.editCustomer;
      renderPeople();
    }
    if (deleteCustomer) {
      deleteFrom("customers", deleteCustomer.dataset.deleteCustomer, () =>
        db.sales.some((sale) => sale.customerId === deleteCustomer.dataset.deleteCustomer)
      );
    }
    if (target.id === "cancel-medicine-edit") {
      editing.medicine = null;
      renderMedicines();
    }
    if (target.id === "lookup-barcode") lookupBarcode();
    if (target.id === "scan-sale-barcode") startBarcodeScan("sale-barcode");
    if (target.id === "scan-medicine-barcode") startBarcodeScan("medicine-barcode");
    if (invoice) {
      const sale = db.sales.find((item) => item.id === invoice.dataset.invoice);
      $("#last-invoice").innerHTML = invoiceHtml(sale);
      showView("sales");
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.name === "medicineId" && event.target.closest("#sale-form")) {
      const medicine = getMedicine(event.target.value);
      if (medicine) event.target.form.elements.salePrice.value = medicine.salePrice;
    }
  });
}

bindEvents();
renderAll();
