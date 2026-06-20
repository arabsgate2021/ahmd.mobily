/* ==========================================================================
   ASGate Management System - Core Script (Sales, Visits & Customers)
   ========================================================================== */

let currentActivePreview = null;
let saveTimeout;

// مفاتيح التخزين الثابتة من النسخة الأصلية
const SALES_DB_KEY = 'asgate_sales_db';
const VISITS_DB_KEY = 'asgate_visits_db';
const CUSTOMERS_STORAGE_KEY = 'asgate_customers_v2_final'; 

// مفاتيح سجل النشاطات
const LOGS_KEY = 'asgate_general_sales_logs';
const VISITS_LOGS_KEY = 'asgate_general_visits_logs';
const CUSTOMERS_LOGS_KEY = 'asgate_customers_logs_v2';

document.addEventListener('DOMContentLoaded', initPage);

function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }

/* --- دالة التهيئة الحكيمة عند تحميل الصفحة --- */
function initPage() {
    initStatsVisibility();
    
    // فحص ذكي لتشغيل بيانات الصفحة الحالية دون أي تداخل
    if (document.getElementById('salesBody')) {
        loadSalesFromStorage();
    } else if (document.getElementById('visitsBody')) {
        loadVisitsFromStorage();
    } else if (document.getElementById('customersBody')) {
        loadCustomersFromStorage();
    }
}

/* --- نظام إخفاء/إظهار الإحصائيات (Visibility) --- */
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

/* ==========================================================================
   1. نظام إدارة العملاء (13 عموداً مطابقاً لـ customers (8)_2.html تماماً)
   ========================================================================== */
function loadCustomersFromStorage() {
    const saved = JSON.parse(localStorage.getItem(CUSTOMERS_STORAGE_KEY) || '[]');
    const tbody = document.getElementById('customersBody');
    if (!tbody) return;
    tbody.innerHTML = "";
    saved.forEach(item => renderCustomerRow(item));
    renderLogs(CUSTOMERS_LOGS_KEY, 'activityList');
    updateCustomersStats();
}

function renderCustomerRow(c = {}, prepend = false) {
    const tbody = document.getElementById('customersBody');
    if (!tbody) return;
    
    const mainRow = prepend ? tbody.insertRow(0) : tbody.insertRow(-1);
    mainRow.className = 'main-row';
    
    const notes = c.notes || '';
    const lastNoteText = getLastNoteOnly(notes);
    const createdAt = c.createdDate || getTodayFormatted();
    const generatedId = c.id || Math.floor(1000 + Math.random() * 9000);

    // بناء الخلايا الـ 13 مطابقة لترتيب الجدول الأصلي لمنع أي انزياح أو تداخل
    mainRow.innerHTML = `
        <td class="col-select"><input type="checkbox" class="select-check"></td>
        <td class="col-id"><a href="customer-profile.html?id=${generatedId}" class="id-link" target="_blank">${generatedId}</a></td>
        <td><input type="text" class="excel-input" value="${c.comp || ''}" onchange="trackCustomerChange('اسم المنشأة الشركة', this); debouncedSave();"></td>
        <td><input type="text" class="excel-input" value="${c.subRecord || ''}" onchange="trackCustomerChange('العنوان', this); debouncedSave();"></td>
        <td><input type="text" class="excel-input" value="${c.mainRecord || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, '')" onchange="trackCustomerChange('السجل الرئيسي', this); debouncedSave();"></td>
        <td><input type="text" class="excel-input" value="${c.contact || ''}" onchange="trackCustomerChange('الشخص المسؤول', this); debouncedSave();"></td>
        <td>
            <div class="phone-cell-container">
                <a class="whatsapp-icon-btn" onclick="openWhatsAppChat(this)" title="مراسلة عبر واتساب"><i class="fab fa-whatsapp"></i></a>
                <input type="text" class="excel-input" value="${c.phone || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, '')" onchange="trackCustomerChange('رقم التواصل', this); debouncedSave();">
            </div>
        </td>
        <td><input type="text" class="excel-input" value="${c.email || ''}" onchange="trackCustomerChange('البريد الإلكتروني', this); debouncedSave();"></td>
        <td>
            <select class="excel-input" onchange="trackCustomerChange('التصنيف', this); debouncedSave();">
                <option value="VIP" ${c.type === 'VIP' ? 'selected' : ''}>VIP</option>
                <option value="تجاري" ${c.type === 'تجاري' ? 'selected' : ''}>تجاري</option>
                <option value="حكومي" ${c.type === 'حكومي' ? 'selected' : ''}>حكومي</option>
                <option value="صغير" ${c.type === 'صغير' ? 'selected' : ''}>صغير</option>
            </select>
        </td>
        <td>
            <select class="excel-input" onchange="trackCustomerChange('الحالة', this); debouncedSave();">
                <option value="نشط" ${c.status === 'نشط' ? 'selected' : ''}>نشط</option>
                <option value="غير نشط" ${c.status === 'غير نشط' ? 'selected' : ''}>غير نشط</option>
            </select>
        </td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${notes.replace(/'/g, "&apos;")}'>${lastNoteText}</div></td>
        <td><input type="text" class="excel-input readonly-input" value="${createdAt}" readonly><input type="hidden" class="created-date-val" value="${createdAt}"></td>
        <td><input type="text" class="excel-input" value="${c.owner || 'أحمد'}" onchange="trackCustomerChange('المالك', this); debouncedSave();"></td>
    `;
    updateCustomersStats();
}

function autoSaveCustomers() {
    const rows = document.querySelectorAll('#customersBody .main-row');
    const data = Array.from(rows).map(row => ({
        id: row.cells[1].querySelector('.id-link').innerText,
        comp: row.cells[2].querySelector('input').value,
        subRecord: row.cells[3].querySelector('input').value, 
        mainRecord: row.cells[4].querySelector('input').value,
        contact: row.cells[5].querySelector('input').value,
        phone: row.cells[6].querySelector('input').value,
        email: row.cells[7].querySelector('input').value,
        type: row.cells[8].querySelector('select').value,
        status: row.cells[9].querySelector('select').value,
        notes: row.querySelector('.notes-preview').getAttribute('data-full-notes') || '',
        createdDate: row.querySelector('.created-date-val').value,
        owner: row.cells[12].querySelector('input').value
    }));
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(data));
    updateCustomersStats();
}

function insertNewCustomerRow() { 
    renderCustomerRow({}, true); 
    autoSaveCustomers(); 
}

function trackCustomerChange(fieldName, inputEl) {
    const row = inputEl.closest('tr');
    const compName = row.cells[2].querySelector('input').value || "عميل جديد";
    addLog(CUSTOMERS_LOGS_KEY, `تعديل ${fieldName} للعميل (${compName}) إلى [${inputEl.value}]`);
}

function filterCustomersTable() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    document.querySelectorAll('#customersBody .main-row').forEach(r => {
        const idVal = r.cells[1].querySelector('.id-link').innerText.toLowerCase();
        const compVal = r.cells[2].querySelector('input').value.toLowerCase();
        const mainRecVal = r.cells[4].querySelector('input').value.toLowerCase();
        const contactVal = r.cells[5].querySelector('input').value.toLowerCase();
        const phoneVal = r.cells[6].querySelector('input').value.toLowerCase();
        const emailVal = r.cells[7].querySelector('input').value.toLowerCase();

        const isMatch = idVal.includes(q) || compVal.includes(q) || mainRecVal.includes(q) || 
                        contactVal.includes(q) || phoneVal.includes(q) || emailVal.includes(q);
        r.style.display = isMatch ? "" : "none";
    });
}

function updateCustomersStats() {
    const rows = document.querySelectorAll('#customersBody .main-row');
    const today = getTodayFormatted();
    const currentMonth = today.substring(0, 7);
    
    let total = rows.length;
    let countToday = 0;
    let countMonth = 0;

    rows.forEach(r => {
        const dateVal = r.querySelector('.created-date-val').value;
        if(dateVal === today) countToday++;
        if(dateVal.startsWith(currentMonth)) countMonth++;
    });

    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
    if(document.getElementById('stat-month')) document.getElementById('stat-month').innerText = countMonth;
    if(document.getElementById('stat-today')) document.getElementById('stat-today').innerText = countToday;
}

function openWhatsAppChat(el) {
    const inputEl = el.closest('.phone-cell-container').querySelector('input');
    let rawPhone = inputEl.value.trim();
    if (!rawPhone) return alert("يرجى إدخال رقم الجوال أولاً");
    let cleanNumber = rawPhone.replace(/\D/g, '');
    if (cleanNumber.startsWith('00966')) cleanNumber = cleanNumber.substring(2);
    else if (cleanNumber.startsWith('05')) cleanNumber = '966' + cleanNumber.substring(1);
    else if (cleanNumber.startsWith('5') && cleanNumber.length === 9) cleanNumber = '966' + cleanNumber;
    window.open("https://wa.me/" + cleanNumber, '_blank');
}

function toggleActivityLogHeight() {
    const section = document.getElementById('custActivityLogSection');
    const btn = document.getElementById('toggleLogBtn');
    if(!section || !btn) return;
    if (section.classList.contains('expanded')) {
        section.classList.remove('expanded');
        btn.innerText = '⤢';
    } else {
        section.classList.add('expanded');
        btn.innerText = '⤡';
    }
}

function handleCustomerBulkAction(action) {
    const selected = document.querySelectorAll('#customersBody .select-check:checked');
    if (selected.length === 0) return alert('يرجى تحديد العملاء أولاً');
    
    if (action === 'حذف' && confirm('هل أنت متأكد من حذف العملاء المحددين؟')) {
        selected.forEach(chk => chk.closest('tr').remove());
        addLog(CUSTOMERS_LOGS_KEY, `إجراء جماعي: حذف عدد (${selected.length}) من العملاء المحددين.`);
        autoSaveCustomers();
    } else {
        alert('تم طلب تنفيذ ' + action + ' على ' + selected.length + ' عميل');
    }
}

/* ==========================================================================
   2. دوال المبيعات والزيارات الأخرى (تظل ثابتة ومستقرة كما هي)
   ========================================================================== */
function loadSalesFromStorage() {
    const saved = JSON.parse(localStorage.getItem(SALES_DB_KEY) || '[]');
    const tbody = document.getElementById('salesBody');
    if(!tbody) return;
    tbody.innerHTML = "";
    saved.forEach(item => renderSalesRow(item));
    renderLogs(LOGS_KEY, 'activityLogs');
}

function renderSalesRow(obj) {
    const tbody = document.getElementById('salesBody');
    if(!tbody) return;
    const row = tbody.insertRow(-1);
    row.className = 'main-row';
    if (obj.status === "فقدان") row.classList.add('lost-row');
    
    row.innerHTML = `
        <td><input type="checkbox" class="select-check"></td>
        <td><a href="#" class="order-link">#${obj.id}</a></td>
        <td><input type="text" class="excel-input" value="${obj.type || ''}" onkeyup="debouncedSave()"></td>
        <td><input type="text" class="excel-input" value="${obj.date}" readonly></td>
        <td><input type="text" class="excel-input" value="${obj.comp || ''}" onkeyup="debouncedSave()"></td>
        <td><input type="text" class="excel-input" value="${obj.cr || ''}" onkeyup="debouncedSave()"></td>
        <td>
            <select class="excel-input status-select" onchange="debouncedSave()">
                <option value="مكتمل" ${obj.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                <option value="معلق" ${obj.status === 'معلق' ? 'selected' : ''}>معلق</option>
                <option value="فقدان" ${obj.status === 'فقدان' ? 'selected' : ''}>فقدان</option>
            </select>
        </td>
        <td>0.00</td>
        <td>0.00</td>
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
}

function loadVisitsFromStorage() {
    const saved = JSON.parse(localStorage.getItem(VISITS_DB_KEY) || '[]');
    const tbody = document.getElementById('visitsBody');
    if(!tbody) return;
    tbody.innerHTML = "";
    saved.forEach(item => renderVisitRow(item));
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
}

/* ==========================================================================
   3. إدارة الملاحظات والسجلات المشتركة (Shared Chat-style Notes)
   ========================================================================== */
function openNote(el) {
    currentActivePreview = el;
    const raw = el.getAttribute('data-full-notes') || "[]";
    let arr = [];
    try { arr = JSON.parse(raw); } catch(e) { arr = []; }
    
    const html = arr.map(msg => `
        <div class="chat-msg-block">
            <span class="chat-msg-header">👤 ${msg.user || 'أحمد'} <span class="chat-msg-time">🗓️ ${msg.date || ''} ${msg.time || ''}</span></span>
            <span class="chat-msg-text">${msg.text}</span>
        </div>
    `).join('');
    
    if(document.getElementById('historyLog')) document.getElementById('historyLog').innerHTML = html;
    if(document.getElementById('noteModal')) {
        document.getElementById('noteModal').style.display = "flex";
        document.getElementById('modalTextArea').focus();
    }
}

function saveNote() {
    const txtArea = document.getElementById('modalTextArea');
    if(!txtArea) return;
    const txt = txtArea.value.trim();
    
    if (txt && currentActivePreview) {
        const raw = currentActivePreview.getAttribute('data-full-notes') || "[]";
        let arr = [];
        try { arr = JSON.parse(raw); } catch(e) { arr = []; }
        
        arr.push({ user: "أحمد", date: getTodayFormatted(), time: getTimeFormatted(), text: txt });
        currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr));
        currentActivePreview.innerText = txt;
        debouncedSave();
    }
    closeNote();
}

function closeNote() { 
    if(document.getElementById('noteModal')) document.getElementById('noteModal').style.display = "none"; 
    if(document.getElementById('modalTextArea')) document.getElementById('modalTextArea').value = "";
}

function getLastNoteOnly(jsonStr) { 
    try { 
        const a = JSON.parse(jsonStr); 
        return a.length ? a[a.length-1].text : 'أضف ملاحظة...'; 
    } catch(e) { 
        return 'أضف ملاحظة...'; 
    } 
}

function renderLogs(key, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const logs = JSON.parse(localStorage.getItem(key) || '[]');
    container.innerHTML = logs.map(l => `<div class="activity-item">${l}</div>`).join('');
}

function addLog(key, actionText) {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const d = new Date();
    const headerHTML = `<span class="activity-header-part">👤 (أحمد)  🗓️ ${days[d.getDay()]}  ${getTodayFormatted()}  <span class="activity-time-part">${getTimeFormatted()}</span>&nbsp;&nbsp;</span>`;
    const fullLogHTML = `${headerHTML}<span class="activity-text-part">${actionText}</span>`;
    
    const logs = JSON.parse(localStorage.getItem(key) || '[]');
    logs.unshift(fullLogHTML);
    localStorage.setItem(key, JSON.stringify(logs.slice(0, 50)));
    
    if(key === CUSTOMERS_LOGS_KEY && document.getElementById('customersBody')) renderLogs(CUSTOMERS_LOGS_KEY, 'activityList');
}

function toggleAllCheckboxes(source) {
    document.querySelectorAll('.select-check').forEach(chk => chk.checked = source.checked);
}

function toggleDropdown(e, btn) {
    e.stopPropagation();
    const menu = btn.nextElementSibling;
    const isOpen = menu.classList.contains('show');
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    if(!isOpen) menu.classList.add('show');
}

window.onclick = (e) => {
    if (!e.target.matches('.btn-bulk-trigger')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    }
};
