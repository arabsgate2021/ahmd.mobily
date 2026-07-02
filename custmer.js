const STORAGE_KEY = 'asgate_customers_final_v2';
const LOGS_KEY = 'asgate_customers_logs_v2';

const tableBody = document.getElementById('tableBody');
const logsBody = document.getElementById('logsBody');
const totalCustomers = document.getElementById('totalCustomers');
const monthCustomers = document.getElementById('monthCustomers');
const todayCustomers = document.getElementById('todayCustomers');
const searchInput = document.getElementById('searchInput');

let searchTimeout;

function getCustomers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function getLogs() {
  return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
}

function normalizeText(v) {
  return String(v || '').toLowerCase().trim();
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

function badgeClass(status) {
  const s = normalizeText(status);
  if (s.includes('جديد') || s.includes('مفتوح')) return 'info';
  if (s.includes('نشط') || s.includes('مكتمل') || s.includes('تم')) return 'success';
  if (s.includes('متابعة')) return 'warning';
  if (s.includes('مغلق') || s.includes('ملغي')) return 'danger';
  return 'info';
}

function classBadgeColor(classification) {
  const c = normalizeText(classification);
  if (c.includes('حكومي')) return 'badge info'; // أزرق
  if (c.includes('هام')) return 'badge danger'; // أحمر
  if (c.includes('متوسط')) return 'badge warning'; // برتقالي
  if (c.includes('صغير')) return 'badge success'; // أخضر
  return '';
}

function safe(value, fallback = '-') {
  const val = value && String(value).trim() ? String(value).trim() : fallback;
  return escapeHTML(val);
}

function getDisplayManager(v) {
  if (v.delegatePriority && v.delegateName) return safe(v.delegateName);
  return safe(v.mgr);
}

function getDisplayMobile(v) {
  if (v.delegatePriority && v.delegateMob) return safe(v.delegateMob);
  return safe(v.mob);
}

function getDisplayEmail(v) {
  if (v.delegatePriority && v.delegateEmail) return safe(v.delegateEmail);
  return safe(v.email);
}

function renderCustomers(list) {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (!list.length) {
    tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:28px;color:#6b7280;">لا توجد بيانات لعرضها</td></tr>`;
    return;
  }

  list.forEach(v => {
    const classification = safe(v.classification || v.source || 'غير محدد');
    const tr = document.createElement('tr');
    tr.style.cursor = "pointer";
    tr.onclick = () => window.location.href = `customer-details.html?code=${v.code}`; // ربط الكود بالصفحة
    
    tr.innerHTML = `
      <td>${safe(v.code, '00001')}</td>
      <td><strong>${safe(v.comp)}</strong></td>
      <td>${safe(v.address || v.city)}</td>
      <td>${getDisplayManager(v)}</td>
      <td>${getDisplayMobile(v)}</td>
      <td>${getDisplayEmail(v)}</td>
      <td>${safe(v.creationDate || v.date)}</td>
      <td><span class="${classBadgeColor(classification)}">${classification}</span></td>
      <td>${safe(v.notesText || v.lastNote || '-')}</td>
      <td><span class="badge ${badgeClass(v.status)}">${safe(v.status, 'غير محدد')}</span></td>
      <td>${safe(v.owner)}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderLogs(list) {
  if (!logsBody) return;
  logsBody.innerHTML = '';

  if (!list.length) {
    logsBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:28px;color:#6b7280;">لا يوجد سجل نشاط بعد</td></tr>`;
    return;
  }

  list.slice(0, 20).forEach(log => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${safe(log.date)}</td>
      <td>${safe(log.client)}</td>
      <td>${safe(log.action)}</td>
      <td>${safe(log.notes)}</td>
    `;
    logsBody.appendChild(tr);
  });
}

function updateStats(list) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const today = now.toISOString().slice(0, 10);

  totalCustomers.textContent = list.length;
  monthCustomers.textContent = list.filter(v => {
    const d = new Date(v.creationDate || v.date || '');
    return !isNaN(d) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;
  todayCustomers.textContent = list.filter(v => {
    const d = String(v.creationDate || v.date || '');
    return d.includes(today) || d.includes(`${now.getDate()}`) || d.includes(`${now.getMonth() + 1}`);
  }).length;
}

function applyFilter() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const customers = getCustomers();
    const q = normalizeText(searchInput.value);
    const filtered = customers.filter(v => {
      const haystack = [
        v.code, v.comp, v.address, v.city, v.mgr, v.delegateName,
        v.mob, v.delegateMob, v.email, v.delegateEmail, v.status,
        v.owner, v.classification, v.notesText, v.lastNote
      ].map(normalizeText).join(' ');
      return haystack.includes(q);
    });
    renderCustomers(filtered);
  }, 300); // إنتظار 300 جزء من الثانية قبل البحث (Debounce)
}

function init() {
  const customers = getCustomers();
  updateStats(customers);
  renderCustomers(customers);
  renderLogs(getLogs());

  if (searchInput) {
    searchInput.addEventListener('input', applyFilter);
  }
}

document.addEventListener('DOMContentLoaded', init);