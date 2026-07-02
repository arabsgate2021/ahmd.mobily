const urlParams = new URLSearchParams(window.location.search);
const clientCode = urlParams.get('code');
let clientName = '';

const STORAGE_KEY = 'asgate_customers_final_v2';
const VISITS_KEY = 'asgate_visits_final_v21';

const contentBody = document.getElementById('contentBody');
const managerTableBody = document.getElementById('managerTableBody');
const tabTitle = document.getElementById('tabTitle');

function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

function safe(v, fallback = '-') {
  const val = v && String(v).trim() ? String(v).trim() : fallback;
  return escapeHTML(val);
}

function goBackAndFocus() {
  if (clientCode) sessionStorage.setItem('last_viewed_client_code', clientCode);
  window.location.href = 'customers.html';
}

function getTodayDateFormatted() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function loadClientData() {
  if (!clientCode) return;
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const client = data.find(c => c.code === clientCode);
  if (!client) return;

  clientName = client.comp || '';
  document.title = `${safe(client.comp, 'تفاصيل العميل')} | ASGate`;
  document.getElementById('c-name').innerText = safe(client.comp, 'غير محدد');
  document.getElementById('c-cr1').innerText = safe(client.cr1 || client.cr || client.record, '0000000');
  document.getElementById('c-cr2').innerText = safe(client.cr2, 'غير محدد');
  document.getElementById('c-city').innerText = safe(client.city || client.address, 'غير محدد');
  document.getElementById('c-district').innerText = safe(client.district, 'غير محدد');
  document.getElementById('c-source').innerText = safe(client.classification || client.source, 'غير محدد');
  document.getElementById('c-owner').innerText = safe(client.owner, 'غير محدد');
}

function renderEmptyMessage(message) {
  contentBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:#6b7280;">${message}</td></tr>`;
}

function openTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (tab === 'o-history') {
    document.getElementById('btn-o').classList.add('active');
    tabTitle.innerText = 'الأوامر / الطلبات';
    renderEmptyMessage('لا توجد طلبات سابقة مسجلة لهذا العميل حتى الآن.');
  } else if (tab === 'attachments') {
    document.getElementById('btn-a').classList.add('active');
    tabTitle.innerText = 'المرفقات والملفات';
    renderEmptyMessage('لا توجد ملفات مرفقة.');
  } else if (tab === 'v-history') {
    document.getElementById('btn-v').classList.add('active');
    tabTitle.innerText = 'سجل الزيارات الميدانية';
    const visits = JSON.parse(localStorage.getItem(VISITS_KEY) || '[]').filter(v => v.comp === clientName);
    if (!visits.length) {
      renderEmptyMessage('لا توجد سجلات زيارات مسجلة لهذا العميل حالياً.');
      return;
    }
    contentBody.innerHTML = visits.map(v => `
      <tr>
        <td>${safe(v.visitDate)}</td>
        <td>${safe(v.address || v.location || 'غير محدد')}</td>
        <td>${safe(v.status || 'مكتملة')}</td>
        <td>${safe(v.notes || '-')}</td>
      </tr>
    `).join('');
  }
}

// --- نظام فريق المتابعة المحدث ---

function getManagersKey() {
  return `asgate_customer_managers_${clientCode}`;
}

function loadManagersData() {
  if (!managerTableBody) return;
  const managers = JSON.parse(localStorage.getItem(getManagersKey()) || '[]');

  if (!managers.length) {
    managerTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:22px;color:#6b7280;">لا توجد بيانات متابعة بعد</td></tr>`;
    return;
  }

  // استخدام حقول الإدخال لتسهيل التعديل
  managerTableBody.innerHTML = managers.map((m, index) => `
    <tr>
      <td><input type="text" class="edit-input" value="${safe(m.name)}" onchange="updateManager(${index}, 'name', this.value)" style="border:1px solid #e5e7eb; border-radius:6px; padding:6px; width:100%;"></td>
      <td><input type="text" class="edit-input" value="${safe(m.mob)}" onchange="updateManager(${index}, 'mob', this.value)" style="border:1px solid #e5e7eb; border-radius:6px; padding:6px; width:100%;"></td>
      <td><input type="text" class="edit-input" value="${safe(m.email)}" onchange="updateManager(${index}, 'email', this.value)" style="border:1px solid #e5e7eb; border-radius:6px; padding:6px; width:100%;"></td>
      <td style="text-align:center;">
        <input type="radio" name="main_contact" ${m.main ? 'checked' : ''} onchange="setMainManager(${index})">
      </td>
      <td>${safe(m.date || getTodayDateFormatted())}</td>
      <td>
        <button class="btn" style="background:#fee2e2; color:#991b1b;" onclick="removeManagerRow(${index})">حذف</button>
      </td>
    </tr>
  `).join('');
}

function updateManager(index, field, value) {
  const managers = JSON.parse(localStorage.getItem(getManagersKey()) || '[]');
  if(managers[index]) {
    managers[index][field] = value;
    localStorage.setItem(getManagersKey(), JSON.stringify(managers));
  }
}

function setMainManager(index) {
  const managers = JSON.parse(localStorage.getItem(getManagersKey()) || '[]');
  managers.forEach((m, i) => m.main = (i === index));
  localStorage.setItem(getManagersKey(), JSON.stringify(managers));
}

function addNewManagerRow() {
  const managers = JSON.parse(localStorage.getItem(getManagersKey()) || '[]');
  managers.push({
    name: '',
    mob: '',
    email: '',
    main: managers.length === 0, // اجعله الأساسي لو كان الأول
    date: getTodayDateFormatted()
  });
  localStorage.setItem(getManagersKey(), JSON.stringify(managers));
  loadManagersData();
}

function removeManagerRow(index) {
  const managers = JSON.parse(localStorage.getItem(getManagersKey()) || '[]');
  managers.splice(index, 1);
  localStorage.setItem(getManagersKey(), JSON.stringify(managers));
  loadManagersData();
}

document.addEventListener('DOMContentLoaded', () => {
  loadClientData();
  loadManagersData();
  openTab('o-history');
});