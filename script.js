/* ==========================================================================
   ASGate Management System - Core Script (Sales, Visits & Customers)
   ========================================================================== */

let currentActivePreview = null;
let currentAttachmentName = null; 
let saveTimeout;

// مفاتيح التخزين الثابتة (Storage Keys)
const SALES_DB_KEY = 'asgate_sales_db';
const VISITS_DB_KEY = 'asgate_visits_db';
const CUSTOMERS_STORAGE_KEY = 'asgate_customers_v2_final'; 

// مفاتيح سجل النشاطات (Logs Keys)
const LOGS_KEY = 'asgate_general_sales_logs';
const VISITS_LOGS_KEY = 'asgate_general_visits_logs';
const CUSTOMERS_LOGS_KEY = 'asgate_customers_logs_v2';

document.addEventListener('DOMContentLoaded', initPage);

function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }

/* --- دالة التهيئة عند تحميل الصفحة --- */
function initPage() {
    initStatsVisibility();
    
    // التحقق من الصفحة الحالية لتشغيل الدوال المناسبة بناءً على الـ ID الموجود في الـ tbody
    if (document.getElementById('salesBody')) {
        loadSalesFromStorage();
    } else if (document.getElementById('visitsBody')) {
        loadVisitsFromStorage();
    } else if (document.getElementById('customersBody')) {
        loadCustomersFromStorage();
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

/* --- الحفظ التلقائي الذكي (Debounced Auto-save) --- */
function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (document.getElementById('salesBody')) autoSaveSales();
        else if (document.getElementById('visitsBody')) autoSaveVisits();
        else if (document.getElementById('customersBody')) autoSaveCustomers();
    }, 500);
}

/* --- 1. دوال المبيعات (Sales Logic) --- */
function loadSalesFromStorage() {
    const saved = JSON.parse(localStorage.getItem(SALES_DB_KEY) || '[]');
    const tbody = document.getElementById('salesBody');
    if(!tbody) return;
    tbody.innerHTML = "";
    saved.forEach(item => renderSalesRow(item));
    updateHeaderStats();
    renderLogs(LOGS_KEY, 'activityLogs');
}

function renderSalesRow(obj) {
    const tbody = document.getElementById('salesBody');
    if(!tbody) return;
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
        date: r.cells[3].querySelector('input').value,
        comp: r.cells[4].querySelector('input').value,
        cr: r.cells[5].querySelector('input').value,
        status: r.cells[6].querySelector('select').value,
        notes: r.cells[9].querySelector('.notes-preview').getAttribute('data-full-notes'),
        lastModifiedDate: r.cells[10].querySelector('input').value,
        owner: r.cells[11].querySelector('input').value
    }));
    localStorage.setItem(SALES_DB_KEY, JSON.stringify(data));
    updateHeaderStats();
}

/* --- 2. دوال الزيارات (Visits Logic) --- */
function loadVisitsFromStorage() {
    const saved = JSON.parse(localStorage.getItem(VISITS_DB_KEY) || '[]');
    const tbody = document.getElementById('visitsBody');
    if(!tbody) return;
    tbody.innerHTML = "";
    saved.forEach(item => renderVisitRow(item));
    updateVisitsStats();
    renderLogs(VISITS_LOGS_KEY, 'activityLogs');
}

function renderVisitRow(obj) {
    const tbody = document.getElementById('visitsBody');
    if(!tbody) return;
    const row = tbody.insertRow(-1);
    row.className = 'main-row';
    row.innerHTML = `
        <td><input type="checkbox" class="select-check"></td>
        <td><input type="text" class="excel-input" value="${obj.comp || ''}" onkeyup="debouncedSave()"></td>
        <td><input type="text" class="excel-input" value="${obj.address || ''}" onkeyup="debouncedSave()"></td>
        <td><input type="text" class="excel-input" value="${obj.manager || ''}" onkeyup="debouncedSave()"></td>
        <td><input type="text" class="excel-input" value="${obj.phone || ''}" onkeyup="debouncedSave()"></td>
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
    localStorage.setItem(VISITS_DB_KEY, JSON.stringify(data));
    updateVisitsStats();
}

/* --- 3. دوال العملاء (Customers Logic) --- */
function loadCustomersFromStorage() {
    const saved = JSON.parse(localStorage.getItem(CUSTOMERS_STORAGE_KEY) || '[]');
    const tbody = document.getElementById('customersBody');
    if (!tbody) return;
    tbody.innerHTML = "";
    saved.forEach(item => renderCustomerRow(item));
    renderLogs(CUSTOMERS_LOGS_KEY, 'activityLogs');
}

function renderCustomerRow(obj) {
    const tbody = document.getElementById('customersBody');
    if(!tbody) return;
    const row = tbody.insertRow(-1);
    row.className = 'main-row';
    
    row.innerHTML = `
        <td><input type="checkbox" class="select-check"></td>
        <td><input type="text" class="excel-input" value="${obj.name || ''}" onkeyup="debouncedSave()"></td>
        <td><input type="text" class="excel-input" value="${obj.phone || ''}" onkeyup="debouncedSave()"></td>
        <td><input type="text" class="excel-input" value="${obj.email || ''}" onkeyup="debouncedSave()"></td>
        <td><input type="text" class="excel-input" value="${obj.city || ''}" onkeyup="debouncedSave()"></td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${(obj.notes || '[]').replace(/'/g, "&apos;")}'>${getLastNoteOnly(obj.notes)}</div></td>
        <td>
            <select class="excel-input" onchange="debouncedSave()">
                <option value="نشط" ${obj.status === 'نشط' ? 'selected' : ''}>نشط</option>
                <option value="غير نشط" ${obj.status === 'غير نشط' ? 'selected' : ''}>غير نشط</option>
            </select>
        </td>
    `;
}

function autoSaveCustomers() {
    const rows = document.querySelectorAll('#customersBody .main-row');
    const data = Array.from(rows).map(r => ({
        name: r.cells[1].querySelector('input').value,
        phone: r.cells[2].querySelector('input').value,
        email: r.cells[3].querySelector('input').value,
        city: r.cells[4].querySelector('input').value,
        notes: r.cells[5].querySelector('.notes-preview').getAttribute('data-full-notes'),
        status: r.cells[6].querySelector('select').value
    }));
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(data));
}

/* --- 4. إدارة الملاحظات والسجلات الموحدة (Shared Module) --- */
function openNote(el) {
    currentActivePreview = el;
    const raw = el.getAttribute('data-full-notes') || "[]";
    let arr = [];
    try { arr = JSON.parse(raw); } catch(e) { arr = []; }
    
    const html = arr.map(msg => `<div class="chat-msg-block"><b>${msg.user || 'المستخدم'}</b>: ${msg.text}</div>`).join('');
    
    const historyLogEl = document.getElementById('historyLog');
    if(historyLogEl) historyLogEl.innerHTML = html;
    
    const modalEl = document.getElementById('noteModal');
    if(modalEl) modalEl.style.display = "flex";
}

function saveNote() {
    const txtArea = document.getElementById('modalTextArea');
    if(!txtArea) return;
    const txt = txtArea.value.trim();
    
    if (txt && currentActivePreview) {
        const raw = currentActivePreview.getAttribute('data-full-notes') || "[]";
        let arr = [];
        try { arr = JSON.parse(raw); } catch(e) { arr = []; }
        
        arr.push({ user: "المستخدم", date: getTodayFormatted(), text: txt });
        currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr));
        currentActivePreview.innerText = txt.substring(0, 20) + "...";
        debouncedSave();
    }
    closeNote();
}

function closeNote() { 
    const modalEl = document.getElementById('noteModal');
    if(modalEl) modalEl.style.display = "none"; 
    const txtArea = document.getElementById('modalTextArea');
    if(txtArea) txtArea.value = "";
}

function getLastNoteOnly(jsonStr) { 
    try { 
        const a = JSON.parse(jsonStr); 
        return a.length ? a[a.length-1].text : '...'; 
    } catch(e) { 
        return '...'; 
    } 
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
    
    // إعادة رندرة السجل إذا كان الكونتينر المفتوح يطابق الطلب
    if(key === LOGS_KEY && document.getElementById('salesBody')) renderLogs(LOGS_KEY, 'activityLogs');
    if(key === VISITS_LOGS_KEY && document.getElementById('visitsBody')) renderLogs(VISITS_LOGS_KEY, 'activityLogs');
    if(key === CUSTOMERS_LOGS_KEY && document.getElementById('customersBody')) renderLogs(CUSTOMERS_LOGS_KEY, 'activityLogs');
}

/* --- 5. خدمات مساعدة وحسابية (Helper Functions) --- */
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
    const saved = JSON.parse(localStorage.getItem(SALES_DB_KEY) || '[]');
    const totalCountEl = document.getElementById('count-total');
    if(totalCountEl) totalCountEl.innerText = saved.length;
}

function updateVisitsStats() {
    const saved = JSON.parse(localStorage.getItem(VISITS_DB_KEY) || '[]');
    const visitCountEl = document.getElementById('visit-count-total');
    if(visitCountEl) visitCountEl.innerText = saved.length;
}

// دالات لتجنب أخطاء توقف الأكواد القديمة
function logChange(field, input, id) {
    addLog(LOGS_KEY, `تعديل ${field} للطلب رقم #${id}`);
}
function handleStatusChange(select, id) {
    debouncedSave();
    addLog(LOGS_KEY, `تغيير حالة الطلب رقم #${id} إلى ${select.value}`);
}
