/* ==========================================
   1. المتغيرات الأساسية (تأكد من وجودها في الأعلى)
   ========================================== */
const STORAGE_KEY = 'asgate_visits_final_v31';
const LOGS_KEY = 'asgate_visits_logs_v32';
const OPPORTUNITIES_KEY = 'asgate_opportunities_final_v31';

let saveTimeout;
let currentActivePreview = null;

/* ==========================================
   2. الدالة المفقودة الأساسية (renderRow)
   ========================================== */
function renderRow(v = {}, prepend = false) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const rowId = 'row-' + Date.now() + Math.random().toString(36).substr(2, 5);

    const mainRow = document.createElement('tr');
    mainRow.className = 'main-row';
    mainRow.id = rowId;

    const subRow = document.createElement('tr');
    subRow.className = 'sub-table-row';
    subRow.id = 'sub-' + rowId;

    const today = getTodayFormatted();
    const visitDate = v.visitDate || today;
    const notesJson = v.notes || "[]";
    const lastNoteText = getLastNoteOnlyFromJSON(notesJson);

    mainRow.innerHTML = `
        <td class="col-select">
            <input type="checkbox" class="select-check">
            <span class="toggle-arrow" onclick="toggleSubTable('${rowId}')"><i class="fas fa-caret-left"></i></span>
        </td>
        <td><input type="text" class="excel-input" value="${v.comp || ''}" data-old="${v.comp || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('الشركة', this.dataset.old, this.value, this.value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input" value="${v.address || ''}" data-old="${v.address || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('العنوان', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input" value="${v.mgr || ''}" data-old="${v.mgr || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('المسؤول', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td>
            <div class="phone-cell-container">
                <a class="whatsapp-icon-btn" onclick="openWhatsAppChat(this)" title="مراسلة عبر واتساب"><i class="fa-brands fa-whatsapp"></i></a>
                <input type="text" class="excel-input" value="${v.mob || ''}" data-old="${v.mob || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, ''); debouncedSaveAllData();" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr'));" onblur="addToActivityLog('رقم التواصل', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;">
            </div>
        </td>
        <td><input type="text" class="excel-input" value="${v.email || ''}" data-old="${v.email || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('الإيميل', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input" value="${v.record || ''}" data-old="${v.record || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, ''); debouncedSaveAllData();" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr'));" onblur="addToActivityLog('السجل', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input readonly-input" value="${visitDate}" style="color:var(--text-muted); font-weight:700;" readonly><input type="hidden" class="visit-date-val" value="${visitDate}"></td>
        <td><input type="text" class="excel-input cur-serv-val" value="${v.curServ || ''}" data-old="${v.curServ || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('الخدمة', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td><input type="number" class="excel-input opp-value-input readonly-input" value="${v.oppValue || ''}" readonly style="color:var(--accent-blue); font-weight:800; cursor:not-allowed; background: transparent;"></td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${notesJson.replace(/'/g, "&apos;")}' id="preview-${Date.now()}">${lastNoteText}</div></td>
        <td>
            <select class="excel-input status-select" data-old="${v.status || ''}" onfocus="this.dataset.old=this.value" onchange="handleStatusChange(this, '${rowId}')">
                <option value="" ${v.status === '' ? 'selected' : ''}>-</option>
                <option value="تأهيل لفرصة" ${v.status === 'تأهيل لفرصة' ? 'selected' : ''}>تأهيل لفرصة</option>
                <option value="عرض سعر" ${v.status === 'عرض سعر' ? 'selected' : ''}>عرض سعر</option>
                <option value="فقدان" ${v.status === 'فقدان' ? 'selected' : ''}>فقدان</option>
            </select>
        </td>
    `;

    if (prepend && tbody.firstChild) {
        tbody.insertBefore(mainRow, tbody.firstChild);
    } else {
        tbody.appendChild(mainRow);
    }
}

/* ==========================================
   3. الدوال التنفيذية (التي تشتكي من الأخطاء)
   ========================================== */
function loadSavedData() {
    const rawData = localStorage.getItem(STORAGE_KEY);
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (rawData) {
        const data = JSON.parse(rawData);
        data.forEach(v => renderRow(v, false));
    }
    
    if (typeof reorderRows === "function") reorderRows();
    if (typeof updateStats === "function") updateStats();
    if (typeof renderActivityLog === "function") renderActivityLog();
}

function insertNewRow() {
    renderRow({}, true);
    saveAllDataSilently();
    const wrapper = document.querySelector('.table-wrapper');
    if (wrapper) wrapper.scrollTop = 0;
}

/* ==========================================
   4. بقية الدوال المساعدة للحفظ والوقت والملاحظات
   ========================================== */
function saveAllDataSilently() {
    const rows = document.querySelectorAll('#tableBody .main-row');
    const data = Array.from(rows).map(row => {
        return {
            comp: row.cells[1].querySelector('input').value,
            address: row.cells[2].querySelector('input').value,
            mgr: row.cells[3].querySelector('input').value,
            mob: row.cells[4].querySelector('input').value,
            email: row.cells[5].querySelector('input').value,
            record: row.cells[6].querySelector('input').value,
            visitDate: row.querySelector('.visit-date-val').value,
            curServ: row.cells[8].querySelector('input').value,
            oppValue: row.cells[9].querySelector('input').value,
            notes: row.querySelector('.notes-preview').getAttribute('data-full-notes'),
            status: row.cells[11].querySelector('select').value
        };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function debouncedSaveAllData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveAllDataSilently();
        if (typeof updateStats === "function") updateStats();
    }, 600);
}

function getTodayFormatted() {
    return new Date().toISOString().split('T')[0];
}

function getTimeFormatted() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0');
}

function getLastNoteOnlyFromJSON(jsonStr) {
    try {
        const arr = JSON.parse(jsonStr);
        return arr.length > 0 ? arr[arr.length - 1].text : "لا توجد ملاحظات";
    } catch(e) { return "لا توجد ملاحظات"; }
}

function toggleSubTable(rowId) {
    const sub = document.getElementById('sub-' + rowId);
    if (sub) sub.style.display = sub.style.display === 'table-row' ? 'none' : 'table-row';
}

function openWhatsAppChat(el) {
    const inputEl = el.closest('.phone-cell-container').querySelector('input');
    let rawPhone = inputEl.value.trim();
    if (!rawPhone) return;
    let cleanNumber = rawPhone.replace(/\D/g, '');
    if (cleanNumber.startsWith('05')) cleanNumber = '966' + cleanNumber.substring(1);
    window.open("https://wa.me/" + cleanNumber, '_blank');
}
