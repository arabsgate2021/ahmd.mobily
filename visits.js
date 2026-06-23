/* ==========================================================
   1. المتغيرات والتعريفات الأساسية (يجب أن تكون في السطر الأول)
   ========================================================== */
let currentActivePreview = null;
let saveTimeout;

const STORAGE_KEY = 'asgate_visits_final_v31';
const LOGS_KEY = 'asgate_visits_logs_v32';
const OPPORTUNITIES_KEY = 'asgate_opportunities_final_v31';

/* ==========================================================
   2. الدالة الأساسية لبناء السطور (renderRow)
   ========================================================== */
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
    subRow.style.display = 'none'; // مخفية افتراضياً

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

    // دمج جدول المنتجات مع تفاصيل التعديل القديمة في نفس السطر
    subRow.innerHTML = `
        <td colspan="12" style="padding:15px 10px; background:#f8fafc; box-shadow: inset 0 2px 4px rgba(0,0,0,.02);">
            <div style="display: flex; gap: 15px; align-items: stretch;">
                
                <div class="sub-table-container" style="flex: 1; padding: 0;">
                    <table class="inner-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>التفاصيل</th>
                                <th>العدد</th>
                                <th>الاشتراك</th>
                                <th>الإجمالي</th>
                                <th style="width:75px">
                                    <button class="header-plus-btn" onclick="addProductRow('${rowId}')" title="إضافة منتج"><i class="fas fa-plus"></i></button>
                                </th>
                            </tr>
                        </thead>
                        <tbody class="product-body"></tbody>
                    </table>
                </div>

                <div style="width: 250px; background: white; border: 1px solid var(--border-soft); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,.05);">
                    <div style="font-weight:bold; color:#2e1065; margin-bottom:10px; font-size:12px;">تفاصيل التعديل والوقت:</div>
                    <div class="edit-date-container">
                        ${parseEditDateHTML(v.editDate || '')}
                    </div>
                    <input type="hidden" class="edit-date-val" value="${v.editDate || ''}">
                </div>

            </div>
        </td>
    `;

    if (prepend && tbody.firstChild) {
        tbody.insertBefore(subRow, tbody.firstChild);
        tbody.insertBefore(mainRow, tbody.firstChild);
    } else {
        tbody.appendChild(mainRow);
        tbody.appendChild(subRow);
    }

    const selectEl = mainRow.querySelector('.status-select');
    applyStatusColor(selectEl);

    // إضافة صفوف المنتجات المحفوظة أو صف فارغ جديد
    if (v.products && v.products.length > 0) {
        v.products.forEach(p => addProductRow(rowId, p));
    } else {
        addProductRow(rowId);
    }
    
    // حساب الإجمالي المبدئي
    calculateMainVisitValue(rowId);
}

/* ==========================================================
   3. دوال جدول المنتجات (إضافة وحساب الإجمالي)
   ========================================================== */
function addProductRow(rowId, data = {}) {
    const subRow = document.getElementById('sub-' + rowId);
    if (!subRow) return;
    const tbody = subRow.querySelector('.product-body');
    if (!tbody) return;

    const row = tbody.insertRow();
    row.innerHTML = `
        <td>
            <select onchange="debouncedSaveAllData()">
                <option value="">-</option>
                <option value="جوال" ${data.type === 'جوال' ? 'selected' : ''}>جوال</option>
                <option value="بيانات" ${data.type === 'بيانات' ? 'selected' : ''}>بيانات</option>
                <option value="هاتف" ${data.type === 'هاتف' ? 'selected' : ''}>هاتف</option>
                <option value="فايبر نت" ${data.type === 'فايبر نت' ? 'selected' : ''}>فايبر نت</option>
                <option value="DIA" ${data.type === 'DIA' ? 'selected' : ''}>DIA</option>
                <option value="IPVPN" ${data.type === 'IPVPN' ? 'selected' : ''}>IPVPN</option>
                <option value="SIP" ${data.type === 'SIP' ? 'selected' : ''}>SIP</option>
            </select>
        </td>
        <td><input type="text" value="${data.desc || ''}" onkeyup="debouncedSaveAllData()"></td>
        <td><input type="number" class="prod-qty" min="0" value="${data.qty || ''}" onkeyup="calculateMainVisitValue('${rowId}')" oninput="calculateMainVisitValue('${rowId}')"></td>
        <td><input type="number" class="prod-sub" min="0" value="${data.sub || ''}" onkeyup="calculateMainVisitValue('${rowId}')" oninput="calculateMainVisitValue('${rowId}')"></td>
        <td><input type="number" class="prod-total readonly-input" value="${data.total || ''}" readonly style="color:var(--text-muted); font-weight:700; cursor:not-allowed;"></td>
        <td>
            <div style="display:flex; justify-content:center; gap:5px;">
                <button class="sub-action-btn" title="حذف" onclick="if(this.closest('tbody').rows.length > 1) { this.closest('tr').remove(); calculateMainVisitValue('${rowId}'); }"><i class="fas fa-trash-alt" style="font-size:10px;"></i></button>
            </div>
        </td>
    `;
}

function calculateMainVisitValue(rowId) {
    const subRow = document.getElementById('sub-' + rowId);
    if (!subRow) return;
    
    let grandTotal = 0;
    subRow.querySelectorAll('.product-body tr').forEach(pRow => {
        const qtyInput = pRow.querySelector('.prod-qty');
        const subInput = pRow.querySelector('.prod-sub');
        const totalInput = pRow.querySelector('.prod-total');
        
        let qty = parseFloat(qtyInput.value) || 0;
        let sub = parseFloat(subInput.value) || 0;
        const rowTotal = qty * sub;
        
        totalInput.value = rowTotal > 0 ? rowTotal : '';
        grandTotal += rowTotal;
    });
    
    const mainRow = document.getElementById(rowId);
    if (mainRow) {
        const oppValueInput = mainRow.querySelector('.opp-value-input');
        if (oppValueInput) {
            oppValueInput.value = grandTotal > 0 ? grandTotal : '';
        }
    }
    debouncedSaveAllData();
}

/* ==========================================================
   4. الدوال التشغيلية (استدعاء البيانات والإضافة الجديدة)
   ========================================================== */
function loadSavedData() {
    const rawData = localStorage.getItem(STORAGE_KEY);
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (rawData) {
        const data = JSON.parse(rawData);
        data.forEach(v => renderRow(v, false));
    }
    
    reorderRows();
    updateStats();
    renderActivityLog();
}

function insertNewRow() {
    renderRow({}, true);
    saveAllDataSilently();
    const wrapper = document.querySelector('.table-wrapper');
    if (wrapper) wrapper.scrollTop = 0;
}

/* ==========================================================
   5. دوال الحفظ والعمليات التلقائية لقاعدة البيانات المحلية
   ========================================================== */
function saveAllDataSilently() {
    const rows = document.querySelectorAll('#tableBody .main-row');
    const data = Array.from(rows).map(row => {
        const subRow = document.getElementById('sub-' + row.id);
        
        // استخراج بيانات المنتجات لحفظها
        const products = [];
        if (subRow) {
            subRow.querySelectorAll('.product-body tr').forEach(pRow => {
                const inputs = pRow.querySelectorAll('input, select');
                if (inputs.length >= 5) {
                    products.push({
                        type: inputs[0].value,
                        desc: inputs[1].value,
                        qty: inputs[2].value,
                        sub: inputs[3].value,
                        total: inputs[4].value
                    });
                }
            });
        }

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
            status: row.cells[11].querySelector('select').value,
            editDate: subRow ? subRow.querySelector('.edit-date-val')?.value || '' : '',
            products: products // حفظ المنتجات
        };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function debouncedSaveAllData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveAllDataSilently();
        updateStats();
    }, 600);
}

/* ==========================================================
   6. دوال الترتيب وإحصائيات سجل النشاط والوقت
   ========================================================== */
function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
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
    const arrow = document.querySelector(`#${rowId} .toggle-arrow i`);
    
    if (!sub) return;

    if (sub.style.display === 'none' || sub.style.display === '') {
        sub.style.display = 'table-row';
        if (arrow) {
            arrow.classList.remove('fa-caret-left');
            arrow.classList.add('fa-caret-down');
        }
    } else {
        sub.style.display = 'none';
        if (arrow) {
            arrow.classList.remove('fa-caret-down');
            arrow.classList.add('fa-caret-left');
        }
    }
}

function updateEditDateField(row) {
    if (!row) return;
    const dateFormatted = getTodayFormatted();
    const time24 = getTimeFormatted();
    const fullDateTime = `${dateFormatted} ${time24}`;
    const subRow = document.getElementById('sub-' + row.id);
    if (!subRow) return;
    const container = subRow.querySelector('.edit-date-container');
    const hiddenInput = subRow.querySelector('.edit-date-val');
    if (container) {
        container.innerHTML = `<span class="edit-date-d">${dateFormatted}</span> <span class="edit-date-t">${time24}</span>`;
    }
    if (hiddenInput) hiddenInput.value = fullDateTime;
}

function parseEditDateHTML(fullDateTime) {
    if (!fullDateTime || !fullDateTime.includes(' ')) {
        return `<span class="edit-date-d">${fullDateTime || ''}</span> <span class="edit-date-t"></span>`;
    }
    const parts = fullDateTime.split(' ');
    return `<span class="edit-date-d">${parts[0]}</span> <span class="edit-date-t">${parts[1]}</span>`;
}

function handleStatusChange(selectEl, rowId) {
    applyStatusColor(selectEl);
    updateEditDateField(selectEl.closest('tr'));
    addToActivityLog('الوضع الحالي', selectEl.dataset.old, selectEl.value, selectEl.closest('tr').cells[1].querySelector('input').value);
    selectEl.dataset.old = selectEl.value;
    debouncedSaveAllData();
}

function applyStatusColor(selectEl) {
    if (!selectEl) return;
    const val = selectEl.value;
    const parentCell = selectEl.closest('td');
    const mainRow = selectEl.closest('.main-row');
    if (!parentCell) return;
    parentCell.classList.remove('status-yellow', 'status-red');
    selectEl.classList.remove('status-yellow', 'status-red');
    if (mainRow) mainRow.classList.remove('lost-row');
    if (val === 'عرض سعر') {
        selectEl.classList.add('status-yellow');
    } else if (val === 'فقدان') {
        selectEl.classList.add('status-red');
        if (mainRow) mainRow.classList.add('lost-row');
    }
}

function reorderRows() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('.main-row'));
    const today = getTodayFormatted();
    const currentMonth = today.substring(0, 7);
    const rowsData = rows.map(row => ({
        row: row,
        subRow: document.getElementById('sub-' + row.id),
        date: row.querySelector('.visit-date-val')?.value || '9999-12-31'
    }));
    rowsData.sort((a, b) => b.date.localeCompare(a.date));
    const groups = {};
    rowsData.forEach(item => {
        const month = item.date.substring(0, 7);
        if (!groups[month]) groups[month] = [];
        groups[month].push(item);
    });
    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(month => {
        const sepRow = document.createElement('tr');
        sepRow.className = 'month-separator';
        const isCurrentMonth = (month === currentMonth);
        const sepStyle = isCurrentMonth ? 'background-color: #3b82f6 !important; color:#fff !important;' : '';
        sepRow.innerHTML = `<td colspan="12"><div class="sep-text" style="${sepStyle}">${month}</div></td>`;
        fragment.appendChild(sepRow);
        groups[month].forEach(item => {
            fragment.appendChild(item.row);
            if (item.subRow) fragment.appendChild(item.subRow);
        });
    });
    tbody.appendChild(fragment);
}

function updateStats() {
    const rows = document.querySelectorAll('#tableBody .main-row');
    const today = getTodayFormatted();
    const currentMonth = today.substring(0, 7);
    let total = rows.length, tDay = 0, tMonth = 0, valTotal = 0, valMonth = 0;
    rows.forEach(row => {
        const dateInput = row.querySelector('.visit-date-val');
        const visitValInput = row.querySelector('.opp-value-input');
        const visitVal = visitValInput ? parseFloat(visitValInput.value) || 0 : 0;
        valTotal += visitVal;
        if (dateInput) {
            const date = dateInput.value;
            if (date === today) tDay++;
            if (date.startsWith(currentMonth)) { tMonth++; valMonth += visitVal; }
        }
    });
    if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
    if (document.getElementById('stat-today')) document.getElementById('stat-today').innerText = tDay;
    if (document.getElementById('stat-month')) document.getElementById('stat-month').innerText = tMonth;
}

function addToActivityLog(fieldName, oldVal, newVal, companyName) {
    if (oldVal === newVal) return;
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const d = new Date();
    const cleanCompany = companyName || 'شركة غير مسماة';
    let actionText = fieldName === 'إجراء' ? `${oldVal} لزيارة شركة ( ${cleanCompany} )` : `تعديل ${fieldName} من [${oldVal || 'فارغ'}] إلى [${newVal || 'فارغ'}] للعميل ( ${cleanCompany} )`;
    const fullLogHTML = `<span style="color:#64748b;font-size:9px;"><i class="fas fa-clock"></i> ${days[d.getDay()]} ${d.toLocaleDateString()} ${getTimeFormatted()}</span> &nbsp;|&nbsp; <span style="color:#0f172a;font-weight:700;">${actionText}</span>`;
    let logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    logs.unshift(fullLogHTML);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
    renderActivityLog();
}

function renderActivityLog() {
    const list = document.getElementById('activityList');
    if (!list) return;
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    list.innerHTML = logs.map(log => `<div class="activity-item">${log}</div>`).join('');
}

function openWhatsAppChat(el) {
    const inputEl = el.closest('.phone-cell-container').querySelector('input');
    let rawPhone = inputEl.value.trim();
    if (!rawPhone) return;
    let cleanNumber = rawPhone.replace(/\D/g, '');
    if (cleanNumber.startsWith('05')) cleanNumber = '966' + cleanNumber.substring(1);
    window.open("https://wa.me/" + cleanNumber, '_blank');
}
