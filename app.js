const SUPABASE_URL = "https://lplrefgpyjnrgpqmrnwv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Qso0T-HLfVo21pNLIeRY1w_-HX8TGLQ";
const LOCAL_FALLBACK_KEY = "pharmacy-manager-local-fallback-v2";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const money = (amount) => `BDT ${Number(amount || 0).toFixed(2)}`;
const number = (value) => Number(value || 0);
const byName = (a, b) => a.name.localeCompare(b.name);

const emptyData = () => ({
  categories: [],
  companies: [],
  suppliers: [],
  customers: [],
  medicines: [],
  batches: [],
  purchases: [],
  sales: [],
});

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let db = emptyData();
let currentUser = null;
let currentProfile = null;
let usingLocalFallback = false;
let editing = {
  medicine: null,
  category: null,
  company: null,
  supplier: null,
  customer: null,
};

function seedData() {
  return {
    categories: [
      { id: "cat-tablet", name: "Tablet" },
      { id: "cat-syrup", name: "Syrup" },
      { id: "cat-injection", name: "Injection" },
    ],
    companies: [
      { id: "com-square", name: "Square Pharmaceuticals" },
      { id: "com-beximco", name: "Beximco Pharma" },
      { id: "com-incepta", name: "Incepta" },
    ],
    suppliers: [
      { id: "sup-1", name: "Metro Medical Supply", phone: "01710000001", due: 2500, address: "Dhaka" },
      { id: "sup-2", name: "Central Pharma Depot", phone: "01710000002", due: 0, address: "Chattogram" },
    ],
    customers: [
      { id: "cus-1", name: "Walk-in Customer", phone: "", due: 0, address: "" },
      { id: "cus-2", name: "Rahim Ahmed", phone: "01810000003", due: 420, address: "Mirpur" },
    ],
    medicines: [
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
    ],
    batches: [
      {
        id: "bat-1",
        medicineId: "med-napa",
        batchNo: "NP2401",
        expiryDate: addDays(75),
        quantity: 180,
        purchasePrice: 1.12,
        salePrice: 1.8,
        supplierId: "sup-1",
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
      },
    ],
    purchases: [],
    sales: [],
  };
}

function mapMedicine(row) {
  return {
    id: row.id,
    name: row.name,
    generic: row.generic || "",
    categoryId: row.category_id,
    companyId: row.company_id,
    barcode: row.barcode || "",
    lowStock: number(row.low_stock),
    salePrice: number(row.sale_price),
  };
}

function toMedicineRow(item) {
  return {
    name: item.name,
    generic: item.generic || null,
    category_id: item.categoryId || null,
    company_id: item.companyId || null,
    barcode: item.barcode || null,
    low_stock: item.lowStock,
    sale_price: item.salePrice,
  };
}

function mapBatch(row) {
  return {
    id: row.id,
    medicineId: row.medicine_id,
    supplierId: row.supplier_id,
    batchNo: row.batch_no,
    expiryDate: row.expiry_date,
    quantity: number(row.quantity),
    purchasePrice: number(row.purchase_price),
    salePrice: number(row.sale_price),
  };
}

function toBatchRow(item) {
  return {
    medicine_id: item.medicineId,
    supplier_id: item.supplierId || null,
    batch_no: item.batchNo,
    expiry_date: item.expiryDate,
    quantity: item.quantity,
    purchase_price: item.purchasePrice,
    sale_price: item.salePrice,
  };
}

function mapPurchase(row) {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    medicineId: row.medicine_id,
    batchId: row.batch_id,
    quantity: number(row.quantity),
    purchasePrice: number(row.purchase_price),
    total: number(row.total),
    paid: number(row.paid),
    due: number(row.due),
    date: row.purchase_date,
  };
}

function mapSale(row) {
  return {
    id: row.id,
    invoiceNo: row.invoice_no,
    customerId: row.customer_id,
    medicineId: row.medicine_id,
    batchId: row.batch_id,
    quantity: number(row.quantity),
    salePrice: number(row.sale_price),
    total: number(row.total),
    paid: number(row.paid),
    due: number(row.due),
    costTotal: number(row.cost_total),
    date: row.sale_date,
  };
}

async function expectSupabase(query, message) {
  const { data, error } = await query;
  if (error) throw new Error(`${message}: ${error.message}`);
  return data;
}

async function loadRemoteData() {
  const [categories, companies, suppliers, customers, medicines, batches, purchases, sales] = await Promise.all([
    expectSupabase(supabaseClient.from("categories").select("*").order("name"), "Could not load categories"),
    expectSupabase(supabaseClient.from("companies").select("*").order("name"), "Could not load companies"),
    expectSupabase(supabaseClient.from("suppliers").select("*").order("name"), "Could not load suppliers"),
    expectSupabase(supabaseClient.from("customers").select("*").order("name"), "Could not load customers"),
    expectSupabase(supabaseClient.from("medicines").select("*").order("name"), "Could not load medicines"),
    expectSupabase(supabaseClient.from("batches").select("*").order("expiry_date"), "Could not load batches"),
    expectSupabase(supabaseClient.from("purchases").select("*").order("purchase_date", { ascending: false }), "Could not load purchases"),
    expectSupabase(supabaseClient.from("sales").select("*").order("sale_date", { ascending: false }), "Could not load sales"),
  ]);

  db = {
    categories,
    companies,
    suppliers: suppliers.map((row) => ({ ...row, due: number(row.due) })),
    customers: customers.map((row) => ({ ...row, due: number(row.due) })),
    medicines: medicines.map(mapMedicine),
    batches: batches.map(mapBatch),
    purchases: purchases.map(mapPurchase),
    sales: sales.map(mapSale),
  };
}

function loadLocalData() {
  const saved = localStorage.getItem(LOCAL_FALLBACK_KEY);
  if (!saved) return seedData();
  try {
    return JSON.parse(saved);
  } catch {
    return seedData();
  }
}

function saveLocalData() {
  localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(db));
}

function requireAdmin() {
  if (currentProfile?.role !== "admin") {
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

function getBatch(id) {
  return db.batches.find((item) => item.id === id);
}

function batchLabel(id) {
  const batch = getBatch(id);
  return batch ? batch.batchNo : "-";
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
  if (!medicine) return false;
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
  const stockValue = db.batches.reduce((sum, batch) => sum + number(batch.quantity) * number(batch.purchasePrice), 0);
  const expiring = db.batches.filter((batch) => expiryStatus(batch.expiryDate).days <= 30).length;
  const metrics = [
    { label: "Total sales", value: money(totalSales), note: `${db.sales.length} invoices` },
    { label: "Current stock value", value: money(stockValue), note: `${db.batches.length} active batches` },
    { label: "Expiry alerts", value: expiring, note: "Within 30 days or expired" },
    { label: "Data source", value: usingLocalFallback ? "Local" : "Live", note: usingLocalFallback ? "Browser fallback" : "Supabase database" },
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
      { label: "Batch", render: (p) => escapeHtml(batchLabel(p.batchId)) },
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
    <label>Customer<select name="customerId" required>${options(db.customers, "", "Select customer")}</select></label>
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
      { label: "Batch", render: (s) => escapeHtml(batchLabel(s.batchId)) },
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
  renderTable("#supplier-table", personColumns("supplier"), db.suppliers.slice().sort(byName));
  renderTable("#customer-table", personColumns("customer"), db.customers.slice().sort(byName));
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

async function refreshAfterWrite() {
  if (usingLocalFallback) {
    saveLocalData();
  } else {
    await loadRemoteData();
  }
  renderAll();
}

async function upsertNamed(collection, table, editKey, prefix, form) {
  const data = formObject(form);
  const name = data.name.trim();
  if (!name) return;
  if (usingLocalFallback) {
    if (editing[editKey]) {
      db[collection].find((row) => row.id === editing[editKey]).name = name;
      editing[editKey] = null;
    } else {
      db[collection].push({ id: `${prefix}-${Date.now()}`, name });
    }
    await refreshAfterWrite();
    return;
  }
  if (editing[editKey]) {
    await expectSupabase(supabaseClient.from(table).update({ name }).eq("id", editing[editKey]).select().single(), `Could not update ${editKey}`);
    editing[editKey] = null;
  } else {
    await expectSupabase(supabaseClient.from(table).insert({ name }).select().single(), `Could not add ${editKey}`);
  }
  await refreshAfterWrite();
}

async function upsertPerson(collection, table, editKey, prefix, form) {
  const data = formObject(form);
  const person = {
    name: data.name.trim(),
    phone: data.phone.trim() || null,
    due: number(data.due),
    address: data.address.trim() || null,
  };
  if (usingLocalFallback) {
    if (editing[editKey]) {
      Object.assign(db[collection].find((row) => row.id === editing[editKey]), person);
      editing[editKey] = null;
    } else {
      db[collection].push({ id: `${prefix}-${Date.now()}`, ...person });
    }
    await refreshAfterWrite();
    return;
  }
  if (editing[editKey]) {
    await expectSupabase(supabaseClient.from(table).update(person).eq("id", editing[editKey]).select().single(), `Could not update ${editKey}`);
    editing[editKey] = null;
  } else {
    await expectSupabase(supabaseClient.from(table).insert(person).select().single(), `Could not add ${editKey}`);
  }
  await refreshAfterWrite();
}

async function deleteFrom(collection, table, id, usageCheck) {
  if (!requireAdmin()) return;
  if (usageCheck()) {
    alert("This item is already used in records, so it cannot be deleted.");
    return;
  }
  if (usingLocalFallback) {
    db[collection] = db[collection].filter((item) => item.id !== id);
    await refreshAfterWrite();
    return;
  }
  await expectSupabase(supabaseClient.from(table).delete().eq("id", id), `Could not delete from ${table}`);
  await refreshAfterWrite();
}

async function handleMedicineSubmit(event) {
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
  if (usingLocalFallback) {
    if (editing.medicine) {
      Object.assign(getMedicine(editing.medicine), medicine);
      editing.medicine = null;
    } else {
      db.medicines.push({ id: `med-${Date.now()}`, ...medicine });
    }
    await refreshAfterWrite();
    return;
  }
  if (editing.medicine) {
    await expectSupabase(supabaseClient.from("medicines").update(toMedicineRow(medicine)).eq("id", editing.medicine).select().single(), "Could not update medicine");
    editing.medicine = null;
  } else {
    await expectSupabase(supabaseClient.from("medicines").insert(toMedicineRow(medicine)).select().single(), "Could not add medicine");
  }
  await refreshAfterWrite();
}

async function handlePurchaseSubmit(event) {
  event.preventDefault();
  const data = formObject(event.currentTarget);
  const quantity = number(data.quantity);
  const purchasePrice = number(data.purchasePrice);
  const salePrice = number(data.salePrice);
  const total = quantity * purchasePrice;
  const paid = number(data.paid);
  const due = Math.max(0, total - paid);
  const batchData = {
    medicineId: data.medicineId,
    supplierId: data.supplierId,
    batchNo: data.batchNo.trim(),
    expiryDate: data.expiryDate,
    quantity,
    purchasePrice,
    salePrice,
  };
  if (usingLocalFallback) {
    const batchId = `bat-${Date.now()}`;
    db.batches.push({ id: batchId, ...batchData });
    db.purchases.push({
      id: `pur-${Date.now()}`,
      date: data.date,
      supplierId: data.supplierId,
      medicineId: data.medicineId,
      batchId,
      quantity,
      purchasePrice,
      total,
      paid,
      due,
    });
    const supplier = db.suppliers.find((item) => item.id === data.supplierId);
    if (supplier) supplier.due = number(supplier.due) + due;
    event.currentTarget.reset();
    await refreshAfterWrite();
    return;
  }
  const batch = await expectSupabase(supabaseClient.from("batches").insert(toBatchRow(batchData)).select().single(), "Could not create batch");
  await expectSupabase(
    supabaseClient
      .from("purchases")
      .insert({
        supplier_id: data.supplierId,
        medicine_id: data.medicineId,
        batch_id: batch.id,
        quantity,
        purchase_price: purchasePrice,
        total,
        paid,
        due,
        purchase_date: data.date,
      })
      .select()
      .single(),
    "Could not save purchase"
  );
  const supplier = db.suppliers.find((item) => item.id === data.supplierId);
  if (supplier) {
    await expectSupabase(supabaseClient.from("suppliers").update({ due: number(supplier.due) + due }).eq("id", data.supplierId), "Could not update supplier due");
  }
  event.currentTarget.reset();
  await refreshAfterWrite();
}

function findSaleBatch(medicineId, quantity) {
  return (
    db.batches
      .filter((batch) => batch.medicineId === medicineId && batch.quantity >= quantity)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0] || null
  );
}

function nextInvoiceNo() {
  return `INV-${db.sales.length + 1001}`;
}

async function handleSaleSubmit(event) {
  event.preventDefault();
  const data = formObject(event.currentTarget);
  const quantity = number(data.quantity);
  const salePrice = number(data.salePrice);
  const total = quantity * salePrice;
  const paid = number(data.paid);
  const due = Math.max(0, total - paid);
  const batch = findSaleBatch(data.medicineId, quantity);
  if (!batch) {
    alert("No single batch has enough stock for this sale. Use a smaller quantity or create separate sales.");
    return;
  }
  const sale = {
    invoiceNo: nextInvoiceNo(),
    date: data.date,
    customerId: data.customerId,
    medicineId: data.medicineId,
    batchId: batch.id,
    quantity,
    salePrice,
    total,
    paid,
    due,
    costTotal: quantity * number(batch.purchasePrice),
  };
  if (usingLocalFallback) {
    batch.quantity -= quantity;
    db.sales.push({ id: `sal-${Date.now()}`, ...sale });
    const customer = db.customers.find((item) => item.id === data.customerId);
    if (customer) customer.due = number(customer.due) + due;
    event.currentTarget.reset();
    await refreshAfterWrite();
    $("#last-invoice").innerHTML = invoiceHtml(db.sales.at(-1));
    return;
  }
  await expectSupabase(supabaseClient.from("batches").update({ quantity: batch.quantity - quantity }).eq("id", batch.id), "Could not update batch stock");
  const savedSale = await expectSupabase(
    supabaseClient
      .from("sales")
      .insert({
        invoice_no: sale.invoiceNo,
        customer_id: sale.customerId || null,
        medicine_id: sale.medicineId,
        batch_id: sale.batchId,
        quantity: sale.quantity,
        sale_price: sale.salePrice,
        total: sale.total,
        paid: sale.paid,
        due: sale.due,
        cost_total: sale.costTotal,
        sale_date: sale.date,
      })
      .select()
      .single(),
    "Could not save sale"
  );
  const customer = db.customers.find((item) => item.id === data.customerId);
  if (customer) {
    await expectSupabase(supabaseClient.from("customers").update({ due: number(customer.due) + due }).eq("id", data.customerId), "Could not update customer due");
  }
  event.currentTarget.reset();
  await refreshAfterWrite();
  $("#last-invoice").innerHTML = invoiceHtml(mapSale(savedSale));
}

function invoiceHtml(sale) {
  const medicine = getMedicine(sale.medicineId);
  return `
    <article class="invoice">
      <div class="invoice-head">
        <div>
          <strong>Pharmacy Manager</strong><br>
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
          <tr><th>Batch</th><td>${escapeHtml(batchLabel(sale.batchId))}</td></tr>
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
  link.download = `pharmacy-manager-backup-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function restoreBackup(file) {
  if (!requireAdmin() || !file) return;
  if (!usingLocalFallback) {
    alert("Restore is only enabled in local fallback mode. For the live database, import data from the Supabase dashboard.");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      ["categories", "companies", "suppliers", "customers", "medicines", "batches", "purchases", "sales"].forEach((key) => {
        if (!Array.isArray(parsed[key])) throw new Error(`Missing ${key}`);
      });
      db = parsed;
      await refreshAfterWrite();
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

async function signIn(email, password) {
  if (!supabaseClient) {
    usingLocalFallback = true;
    currentUser = { email: "local@fallback" };
    currentProfile = { name: "Local Admin", role: "admin" };
    db = loadLocalData();
    return;
  }
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  currentUser = data.user;
  const profile = await expectSupabase(supabaseClient.from("profiles").select("*").eq("id", data.user.id).single(), "Could not load user profile");
  currentProfile = profile;
  usingLocalFallback = false;
  await loadRemoteData();
}

async function signOut() {
  if (supabaseClient && !usingLocalFallback) await supabaseClient.auth.signOut();
  currentUser = null;
  currentProfile = null;
  db = emptyData();
}

function setSignedInUi() {
  $("#current-role").textContent = `${currentProfile.name} (${currentProfile.role})`;
  $("#login-screen").classList.add("hidden");
  $("#app-shell").classList.remove("hidden");
  renderAll();
}

function setSignedOutUi() {
  $("#login-email").value = "";
  $("#login-password").value = "";
  $("#app-shell").classList.add("hidden");
  $("#login-screen").classList.remove("hidden");
}

function bindEvents() {
  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("#login-error").textContent = "Signing in...";
    try {
      await signIn($("#login-email").value.trim(), $("#login-password").value);
      $("#login-error").textContent = "";
      setSignedInUi();
    } catch (error) {
      $("#login-error").textContent = error.message;
    }
  });

  $("#logout-button").addEventListener("click", async () => {
    await signOut();
    setSignedOutUi();
  });

  $("#main-nav").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (button) showView(button.dataset.view);
  });

  $("#global-search").addEventListener("input", renderAll);
  $("#print-button").addEventListener("click", () => window.print());
  $("#medicine-form").addEventListener("submit", (event) => handleMedicineSubmit(event).catch((error) => alert(error.message)));
  $("#purchase-form").addEventListener("submit", (event) => handlePurchaseSubmit(event).catch((error) => alert(error.message)));
  $("#sale-form").addEventListener("submit", (event) => handleSaleSubmit(event).catch((error) => alert(error.message)));
  $("#category-form").addEventListener("submit", (event) => {
    event.preventDefault();
    upsertNamed("categories", "categories", "category", "cat", event.currentTarget).catch((error) => alert(error.message));
  });
  $("#company-form").addEventListener("submit", (event) => {
    event.preventDefault();
    upsertNamed("companies", "companies", "company", "com", event.currentTarget).catch((error) => alert(error.message));
  });
  $("#supplier-form").addEventListener("submit", (event) => {
    event.preventDefault();
    upsertPerson("suppliers", "suppliers", "supplier", "sup", event.currentTarget).catch((error) => alert(error.message));
  });
  $("#customer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    upsertPerson("customers", "customers", "customer", "cus", event.currentTarget).catch((error) => alert(error.message));
  });
  $("#refresh-reports").addEventListener("click", renderReports);
  $("#report-month").addEventListener("change", renderReports);
  $("#export-backup").addEventListener("click", exportBackup);
  $("#restore-file").addEventListener("change", (event) => restoreBackup(event.target.files[0]).catch((error) => alert(error.message)));

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
      deleteFrom("medicines", "medicines", deleteMedicine.dataset.deleteMedicine, () =>
        db.batches.some((batch) => batch.medicineId === deleteMedicine.dataset.deleteMedicine)
      ).catch((error) => alert(error.message));
    }
    if (editCategory) {
      editing.category = editCategory.dataset.editCategory;
      renderMasters();
    }
    if (deleteCategory) {
      deleteFrom("categories", "categories", deleteCategory.dataset.deleteCategory, () =>
        db.medicines.some((medicine) => medicine.categoryId === deleteCategory.dataset.deleteCategory)
      ).catch((error) => alert(error.message));
    }
    if (editCompany) {
      editing.company = editCompany.dataset.editCompany;
      renderMasters();
    }
    if (deleteCompany) {
      deleteFrom("companies", "companies", deleteCompany.dataset.deleteCompany, () =>
        db.medicines.some((medicine) => medicine.companyId === deleteCompany.dataset.deleteCompany)
      ).catch((error) => alert(error.message));
    }
    if (editSupplier) {
      editing.supplier = editSupplier.dataset.editSupplier;
      renderPeople();
    }
    if (deleteSupplier) {
      deleteFrom("suppliers", "suppliers", deleteSupplier.dataset.deleteSupplier, () =>
        db.purchases.some((purchase) => purchase.supplierId === deleteSupplier.dataset.deleteSupplier)
      ).catch((error) => alert(error.message));
    }
    if (editCustomer) {
      editing.customer = editCustomer.dataset.editCustomer;
      renderPeople();
    }
    if (deleteCustomer) {
      deleteFrom("customers", "customers", deleteCustomer.dataset.deleteCustomer, () =>
        db.sales.some((sale) => sale.customerId === deleteCustomer.dataset.deleteCustomer)
      ).catch((error) => alert(error.message));
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
