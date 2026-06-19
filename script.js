/* ==========================================================================
   ASGate Management System - Core Script
   ========================================================================== */

let currentActivePreview = null;
let currentAttachmentName = null; 
const LOGS_KEY = 'asgate_general_sales_logs';
const VISITS_LOGS_KEY = 'asgate_general_visits_logs';
const CUSTOMERS_STORAGE_KEY = 'asgate_customers_v2_final'; 
let saveTimeout;

document.addEventListener('DOMContentLoaded', initPage);

function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }

function initPage() {
    initStatsVisibility();
    // التحقق من الصفحة الحالية لتشغيل الدوال المناسبة
    if (document.getElementById('salesBody')) {
        loadSalesFromStorage();
    } else if (document.getElementById('visitsBody')) {
        loadVisitsFromStorage();
    }
}

/* --- نظام الإحصائيات (Visibility) --- */
function toggleStatsVisibility() {
    const container = document.getElementById('statsContainer');
    const btn = document.getElementById('eyeToggleBtn');
    if (!container || !btn) return;
    const isHidden = container.classList.toggle('blur-active');
    localStorage.setItem('asgate_stats_hidden', isHidden ? 'true' : 'false');
    btn.innerHTML = isHidden ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
}

function initStatsVisibility() {
    const container = document.getElementById('statsContainer');
    const btn = document.getElementById('eyeToggleBtn');
    if (!container || !btn) return;
    if (localStorage.getItem('asgate_stats_hidden') === 'true') {
        container.classList.add('blur-active');
        btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    }
}

/* --- الحفظ التلقائي (Debounced Auto-save) --- */
function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (document.getElementById('salesBody')) autoSaveSales();
        else if (document.getElementById('visitsBody')) autoSaveVisits();
    }, 500);
}

/* --- دوال المبيعات (Sales Logic) --- */
function loadSalesFromStorage() {
    const saved = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
    const tbody = document.getElementById('salesBody');
    if(!tbody) return;
    tbody.innerHTML = "";
    saved.forEach(item => renderSalesRow(item));
    updateHeaderStats();
    renderLogs(LOGS_KEY, 'activityLogs');
}

function renderSalesRow(obj) {
    const tbody = document.getElementById('salesBody');
    const sums = calculateOrderSums(obj.id);
    const row = tbody.insertRow(-1);
    row.className = 'main-row';
    row.id = `row-${obj.id}`;
    if (obj.status === "فقدان") row.classList.add('lost-row');
    
    row.innerHTML = `
        <td><input type="checkbox" class="select-check"></td>
        <td><a href="#" class="order-link">#${obj.id}</a></td>
        <td><input type="text" class="excel-input" value="${obj.type || ''}" onkeyup="debouncedSave()" onblur="logChange('اسم الطلب', this, '${obj.id}')"></td>
        <td><input type="text" class="excel-input" value="${obj.date}" readonly></td>
        <td><input type="text" class="excel-input" value="${obj.comp || ''}" onkeyup="debouncedSave()" onblur="logChange('الشركة', this, '${obj.id}')"></td>
        <td><input type="text" class="excel-input" value="${obj.cr || ''}" onkeyup="debouncedSave()" onblur="logChange('السجل', this, '${obj.id}')"></td>
        <td>
            <select class="excel-input status-select" onchange="handleStatusChange(this, '${obj.id}')">
                <option value="مكتمل" ${obj.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                <option value="معلق" ${obj.status === 'معلق' ? 'selected' : ''}>معلق</option>
                <option value="فقدان" ${obj.status === 'فقدان' ? 'selected' : ''}>فقدان</option>
            </select>
        </td>
        <td>${sums.completed.toFixed(2)}</td>
        <td>${sums.pending.toFixed(2)}</td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${(obj.notes || '[]').replace(/'/g, "&apos;")}'>${getLastNoteOnly(obj.notes)}</div></td>
        <td><input type="text" class="excel-input" value="${obj.lastModifiedDate || ''}" readonly></td>
        <td><input type="text" class="excel-input" value="${obj.owner || 'أحمد'}" onkeyup="debouncedSave()"></td>
    `;
}

function autoSaveSales() {
    const rows = document.querySelectorAll('#salesBody .main-row');
    const data = Array.from(rows).map(r => ({
        id: r.cells[1].innerText.replace('#', ''),
        type: r.cells[2].querySelector('input').value,
        comp: r.cells[4].querySelector('input').value,
        status: r.cells[6].querySelector('select').value,
        notes: r.cells[9].querySelector('.notes-preview').getAttribute('data-full-notes'),
        owner: r.cells[11].querySelector('input').value
    }));
    localStorage.setItem('asgate_sales_db', JSON.stringify(data));
    updateHeaderStats();
}

/* --- دوال الزيارات (Visits Logic) --- */
function loadVisitsFromStorage() {
    const saved = JSON.parse(localStorage.getItem('asgate_visits_db') || '[]');
    const tbody = document.getElementById('visitsBody');
    if(!tbody) return;
    tbody.innerHTML = "";
    saved.forEach(item => renderVisitRow(item));
    updateVisitsStats();
    renderLogs(VISITS_LOGS_KEY, 'activityLogs');
}

function renderVisitRow(obj) {
    const tbody = document.getElementById('visitsBody');
    const row = tbody.insertRow(-1);
    row.className = 'main-row';
    row.innerHTML = `
        <td><input type="checkbox" class="select-check"></td>
        <td><input type="text" class="excel-input" value="${obj.comp}" onkeyup="debouncedSave()"></td>
        <td><input type="text" class="excel-input" value="${obj.address}" onkeyup="debouncedSave()"></td>
        <td><input type="text" class="excel-input" value="${obj.manager}" onkeyup="debouncedSave()"></td>
        <td><input type="text" class="excel-input" value="${obj.phone}" onkeyup="debouncedSave()"></td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${(obj.notes || '[]').replace(/'/g, "&apos;")}'>${getLastNoteOnly(obj.notes)}</div></td>
        <td><select class="excel-input" onchange="debouncedSave()"><option value="معلق" ${obj.status==='معلق'?'selected':''}>معلق</option><option value="ناجحة" ${obj.status==='ناجحة'?'selected':''}>ناجحة</option></select></td>
    `;
}

function autoSaveVisits() {
    const rows = document.querySelectorAll('#visitsBody .main-row');
    const data = Array.from(rows).map(r => ({
        comp: r.cells[1].querySelector('input').value,
        address: r.cells[2].querySelector('input').value,
        manager: r.cells[3].querySelector('input').value,
        phone: r.cells[4].querySelector('input').value,
        notes: r.cells[5].querySelector('.notes-preview').getAttribute('data-full-notes'),
        status: r.cells[6].querySelector('select').value
    }));
    localStorage.setItem('asgate_visits_db', JSON.stringify(data));
    updateVisitsStats();
}

/* --- إدارة الملاحظات والسجلات (Shared) --- */
function openNote(el) {
    currentActivePreview = el;
    const raw = el.getAttribute('data-full-notes') || "[]";
    const arr = JSON.parse(raw);
    const html = arr.map(msg => `<div class="chat-msg-block"><b>${msg.user}</b>: ${msg.text}</div>`).join('');
    document.getElementById('historyLog').innerHTML = html;
    document.getElementById('noteModal').style.display = "flex";
}

function saveNote() {
    const txt = document.getElementById('modalTextArea').value;
    if (txt && currentActivePreview) {
        const raw = currentActivePreview.getAttribute('data-full-notes') || "[]";
        let arr = JSON.parse(raw);
        arr.push({ user: "المستخدم", date: getTodayFormatted(), text: txt });
        currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr));
        currentActivePreview.innerText = txt.substring(0, 20) + "...";
        debouncedSave();
    }
    closeNote();
}

function renderLogs(key, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const logs = JSON.parse(localStorage.getItem(key) || '[]');
    container.innerHTML = logs.map(l => `<div class="activity-item">${l}</div>`).join('');
}

function addLog(key, text) {
    const logs = JSON.parse(localStorage.getItem(key) || '[]');
    logs.unshift(`${getTodayFormatted()} - ${text}`);
    localStorage.setItem(key, JSON.stringify(logs.slice(0, 50)));
    renderLogs(key, 'activityLogs');
}

function closeNote() { document.getElementById('noteModal').style.display = "none"; }
function getLastNoteOnly(jsonStr) { try { const a = JSON.parse(jsonStr); return a.length ? a[a.length-1].text : '...'; } catch(e) { return '...'; } }

/* --- خدمات مساعدة --- */
function calculateOrderSums(id) {
    const db = JSON.parse(localStorage.getItem('asgate_products_db') || '{}');
    const prods = db[id] || [];
    let completed = 0, pending = 0;
    prods.forEach(p => {
        const val = (parseFloat(p.qty) || 0) * (parseFloat(p.sub) || 0);
        if(p.status === "مكتمل") completed += val;
        else pending += val;
    });
    return { completed, pending };
}

function updateHeaderStats() {
    // تحديث إحصائيات المبيعات في الهيدر
    const saved = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
    if(document.getElementById('count-total')) document.getElementById('count-total').innerText = saved.length;
}

function updateVisitsStats() {
    // تحديث إحصائيات الزيارات
    const saved = JSON.parse(localStorage.getItem('asgate_visits_db') || '[]');
    if(document.getElementById('visit-count-total')) document.getElementById('visit-count-total').innerText = saved.length;
}
