let currentActivePreview = null;

const STORAGE_KEY = 'asgate_visits_final_v31';
const LOGS_KEY = 'asgate_visits_logs_v32';
const OPPORTUNITIES_KEY = 'asgate_opportunities_final_v31';

let saveTimeout;

/* =========================
   Debounced Save
========================= */

function debouncedSaveAllData() {
    clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        saveAllDataSilently();
        updateStats();
    }, 600);
}

/* =========================
   Date Helpers
========================= */

function getTodayFormatted() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

function getTimeFormatted() {
    const d = new Date();
    return (
        String(d.getHours()).padStart(2, '0') +
        ":" +
        String(d.getMinutes()).padStart(2, '0')
    );
}

/* =========================
   WhatsApp
========================= */

function openWhatsAppChat(el) {
    const inputEl = el.closest('.phone-cell-container').querySelector('input');
    let rawPhone = inputEl.value.trim();

    if (!rawPhone) {
        Swal.fire({
            icon: 'warning',
            title: 'تنبيه',
            text: 'يرجى إدخال رقم الجوال أولاً',
            confirmButtonText: 'حسناً',
            confirmButtonColor: '#3b82f6'
        });
        return;
    }

    let cleanNumber = rawPhone.replace(/\D/g, '');

    if (cleanNumber.startsWith('00966')) {
        cleanNumber = cleanNumber.substring(2);
    } else if (cleanNumber.startsWith('05')) {
        cleanNumber = '966' + cleanNumber.substring(1);
    } else if (cleanNumber.startsWith('5') && cleanNumber.length === 9) {
        cleanNumber = '966' + cleanNumber;
    }

    window.open("https://wa.me/" + cleanNumber, '_blank');
}

/* =========================
   Activity Log Expand
========================= */

function toggleLogExpansion() {
    const logSection = document.getElementById('activityLogSection');
    const toggleBtn = document.getElementById('toggleExpandBtn');

    if (logSection.classList.contains('expanded')) {
        logSection.classList.remove('expanded');
        toggleBtn.innerHTML = '<i class="fas fa-expand-alt"></i>';
    } else {
        logSection.classList.add('expanded');
        toggleBtn.innerHTML = '<i class="fas fa-compress-alt"></i>';
    }
}

/* =========================
   Edit Date
========================= */

function updateEditDateField(row) {
    if (!row) return;

    const d = new Date();
    const dateFormatted = d.toISOString().split('T')[0];
    const time24 = getTimeFormatted();
    const fullDateTime = `${dateFormatted} ${time24}`;

    const container = row.querySelector('.edit-date-container');
    const hiddenInput = row.querySelector('.edit-date-val');

    if (container) {
        container.innerHTML = `
            <span class="edit-date-d">${dateFormatted}</span>
            <span class="edit-date-t">${time24}</span>
        `;
    }

    if (hiddenInput) {
        hiddenInput.value = fullDateTime;
    }
}

function parseEditDateHTML(fullDateTime) {
    if (!fullDateTime || !fullDateTime.includes(' ')) {
        return `
            <span class="edit-date-d">${fullDateTime || ''}</span>
            <span class="edit-date-t"></span>
        `;
    }

    const parts = fullDateTime.split(' ');
    return `
        <span class="edit-date-d">${parts[0]}</span>
        <span class="edit-date-t">${parts[1]}</span>
    `;
}

/* =========================
   Activity Log
========================= */

function addToActivityLog(fieldName, oldVal, newVal, companyName) {
    if (oldVal === newVal) return;

    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const d = new Date();
    let dd = String(d.getDate()).padStart(2, '0');
    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let yyyy = d.getFullYear();

    const cleanCompany = (companyName && companyName.toString().trim() !== '') ? companyName : 'شركة غير مسماة';
    const v1 = (oldVal && oldVal.toString().trim() !== '') ? oldVal : 'فارغ';
    const v2 = (newVal && newVal.toString().trim() !== '') ? newVal : 'فارغ';

    let actionText;
    if (fieldName === 'إجراء') {
        actionText = `${oldVal} لزيارة شركة ( ${cleanCompany} )`;
    } else {
        actionText = `تعديل ${fieldName} من [${v1}] إلى [${v2}] للعميل ( ${cleanCompany} )`;
    }

    const fullLogHTML = `
        <span style="color:#64748b;font-size:9px;">
            <i class="fas fa-clock"></i>
            ${days[d.getDay()]}
            ${yyyy}-${mm}-${dd}
            ${getTimeFormatted()}
        </span>
        &nbsp;|&nbsp;
        <span style="color:#0f172a;font-weight:700;">
            ${actionText}
        </span>
    `;

    let logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    logs.unshift(fullLogHTML);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100)));

    renderActivityLog();
}

function renderActivityLog() {
    const list = document.getElementById('activityList');
    if (!list) return;

    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');

    list.innerHTML = logs.map(log => {
        if (log.includes('||')) {
            const parts = log.split('||');
            return `
                <div class="activity-item">
                    <span style="color:#94a3b8;font-size:9px;">${parts[0]}</span>
                    &nbsp;|&nbsp;
                    <span>${parts[2]}</span>
                </div>
            `;
        }
        return `
            <div class="activity-item">
                ${log}
            </div>
        `;
    }).join('');
}

/* =========================
   Statistics
========================= */

function updateStats() {
    const rows = document.querySelectorAll('#tableBody .main-row');
    const today = getTodayFormatted();
    const currentMonth = today.substring(0, 7);

    let total = rows.length;
    let tDay = 0;
    let tMonth = 0;
    let valTotal = 0;
    let valMonth = 0;

    rows.forEach(row => {
        const dateInput = row.querySelector('.visit-date-val');
        const visitValInput = row.querySelector('.opp-value-input');
        const visitVal = visitValInput ? parseFloat(visitValInput.value) || 0 : 0;

        valTotal += visitVal;

        if (dateInput) {
            const date = dateInput.value;
            if (date === today) {
                tDay++;
            }
            if (date.startsWith(currentMonth)) {
                tMonth++;
                valMonth += visitVal;
            }
        }
    });

    if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
    if (document.getElementById('stat-today')) document.getElementById('stat-today').innerText = tDay;
    if (document.getElementById('stat-month')) document.getElementById('stat-month').innerText = tMonth;
    
    if (document.getElementById('stat-value-total')) {
        document.getElementById('stat-value-total').innerText = valTotal.toLocaleString() + ' ر.س';
    }
    if (document.getElementById('stat-value-month')) {
        document.getElementById('stat-value-month').innerText = valMonth.toLocaleString() + ' ر.s';
    }
}

/* =========================
   Status Colors
========================= */

function applyStatusColor(selectEl) {
    if (!selectEl) return;
    const val = selectEl.value;
    const parentCell = selectEl.closest('td');
    const mainRow = selectEl.closest('.main-row');

    if (!parentCell) return;

    parentCell.classList.remove('status-yellow', 'status-red');
    selectEl.classList.remove('status-yellow', 'status-red');

    if (mainRow) {
        mainRow.classList.remove('lost-row');
    }

    if (val === 'عرض سعر') {
        selectEl.classList.add('status-yellow');
    } else if (val === 'فقدان') {
        selectEl.classList.add('status-red');
        if (mainRow) {
            mainRow.classList.add('lost-row');
        }
    }
}

/* =========================
   Reorder Rows
========================= */

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
        if (!groups[month]) {
            groups[month] = [];
        }
        groups[month].push(item);
    });

    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    Object.keys(groups)
        .sort((a, b) => b.localeCompare(a))
        .forEach(month => {
            const sepRow = document.createElement('tr');
            sepRow.className = 'month-separator';

            const isCurrentMonth = (month === currentMonth);
            const sepStyle = isCurrentMonth ? 'background-color: var(--accent-blue) !important; color:#fff !important;' : '';

            sepRow.innerHTML = `
                <td colspan="14">
                    <div class="sep-text" style="${sepStyle}">
                        ${month}
                    </div>
                </td>
            `;

            fragment.appendChild(sepRow);

            groups[month].forEach(item => {
                fragment.appendChild(item.row);
                if (item.subRow) {
                    fragment.appendChild(item.subRow);
                }
            });
        });

    tbody.appendChild(fragment);
}

/* =========================
   New Row
========================= */

function insertNewRow() {
    renderRow({}, true);
    saveAllDataSilently();
    const wrapper = document.querySelector('.table-wrapper');
    if (wrapper) wrapper.scrollTop = 0;
}

/* =========================
   Render Row
========================= */

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
    const editDateHTML = parseEditDateHTML(v.editDate || '');

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
        <td><input type="text" class="excel-input cur-serv-val" value="${v.curServ || ''}" data-old="${v.curServ || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('الخدمة', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;" onmouseenter="showStatusTooltip(this)" onmouseleave="hideStatusTooltip()"></td>
        <td><input type="number" class="excel-input opp-value-input readonly-input" value="${v.oppValue || ''}" readonly style="color:var(--accent-blue); font-weight:800; cursor:not-allowed; background: transparent;"></td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${notesJson.replace(/'/g, "&apos;")}' id="preview-${Date.now()}">${lastNoteText}</div></td>
        <td>
            <select class="excel-input status-select" data-old="${v.status || ''}" onfocus="this.dataset.old=this.value" onchange="handleStatusChange(this, '${rowId}')">
                <option value="" ${v.status === '' ? 'selected' : ''}>-</option>
                <option value="تأهيل لفرصة" ${v.status === 'تأهيل لفرصة' ? 'selected' : ''}>تأهيل لفرصة</option>
