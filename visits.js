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

    const inputEl =
        el.closest('.phone-cell-container')
          .querySelector('input');

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
    }
    else if (cleanNumber.startsWith('05')) {
        cleanNumber = '966' + cleanNumber.substring(1);
    }
    else if (
        cleanNumber.startsWith('5') &&
        cleanNumber.length === 9
    ) {
        cleanNumber = '966' + cleanNumber;
    }

    window.open(
        "https://wa.me/" + cleanNumber,
        '_blank'
    );
}

/* =========================
   Activity Log Expand
========================= */

function toggleLogExpansion() {

    const logSection =
        document.getElementById(
            'activityLogSection'
        );

    const toggleBtn =
        document.getElementById(
            'toggleExpandBtn'
        );

    if (
        logSection.classList.contains(
            'expanded'
        )
    ) {

        logSection.classList.remove(
            'expanded'
        );

        toggleBtn.innerHTML =
            '<i class="fas fa-expand-alt"></i>';

    } else {

        logSection.classList.add(
            'expanded'
        );

        toggleBtn.innerHTML =
            '<i class="fas fa-compress-alt"></i>';
    }
}

/* =========================
   Edit Date
========================= */

function updateEditDateField(row) {

    if (!row) return;

    const d = new Date();

    const dateFormatted =
        d.toISOString().split('T')[0];

    const time24 =
        getTimeFormatted();

    const fullDateTime =
        `${dateFormatted} ${time24}`;

    const container =
        row.querySelector(
            '.edit-date-container'
        );

    const hiddenInput =
        row.querySelector(
            '.edit-date-val'
        );

    if (container) {

        container.innerHTML = `
            <span class="edit-date-d">
                ${dateFormatted}
            </span>

            <span class="edit-date-t">
                ${time24}
            </span>
        `;
    }

    if (hiddenInput) {
        hiddenInput.value = fullDateTime;
    }
}

function parseEditDateHTML(fullDateTime) {

    if (
        !fullDateTime ||
        !fullDateTime.includes(' ')
    ) {

        return `
            <span class="edit-date-d">
                ${fullDateTime || ''}
            </span>

            <span class="edit-date-t">
            </span>
        `;
    }

    const parts =
        fullDateTime.split(' ');

    return `
        <span class="edit-date-d">
            ${parts[0]}
        </span>

        <span class="edit-date-t">
            ${parts[1]}
        </span>
    `;
}
/* =========================
   Activity Log
========================= */

function addToActivityLog(
    fieldName,
    oldVal,
    newVal,
    companyName
) {

    if (oldVal === newVal) return;

    const days = [
        'الأحد',
        'الاثنين',
        'الثلاثاء',
        'الأربعاء',
        'الخميس',
        'الجمعة',
        'السبت'
    ];

    const d = new Date();

    let dd =
        String(d.getDate()).padStart(2, '0');

    let mm =
        String(d.getMonth() + 1)
            .padStart(2, '0');

    let yyyy =
        d.getFullYear();

    const cleanCompany =
        (
            companyName &&
            companyName.toString().trim() !== ''
        )
            ? companyName
            : 'شركة غير مسماة';

    const v1 =
        (
            oldVal &&
            oldVal.toString().trim() !== ''
        )
            ? oldVal
            : 'فارغ';

    const v2 =
        (
            newVal &&
            newVal.toString().trim() !== ''
        )
            ? newVal
            : 'فارغ';

    let actionText;

    if (fieldName === 'إجراء') {

        actionText =
            `${oldVal} لزيارة شركة ( ${cleanCompany} )`;

    } else {

        actionText =
            `تعديل ${fieldName} من [${v1}] إلى [${v2}] للعميل ( ${cleanCompany} )`;
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

    let logs =
        JSON.parse(
            localStorage.getItem(LOGS_KEY)
            || '[]'
        );

    logs.unshift(fullLogHTML);

    localStorage.setItem(
        LOGS_KEY,
        JSON.stringify(
            logs.slice(0, 100)
        )
    );

    renderActivityLog();
}

function renderActivityLog() {

    const list =
        document.getElementById(
            'activityList'
        );

    const logs =
        JSON.parse(
            localStorage.getItem(LOGS_KEY)
            || '[]'
        );

    list.innerHTML =
        logs.map(log => {

            if (log.includes('||')) {

                const parts =
                    log.split('||');

                return `
                    <div class="activity-item">
                        <span style="color:#94a3b8;font-size:9px;">
                            ${parts[0]}
                        </span>
                        &nbsp;|&nbsp;
                        <span>
                            ${parts[2]}
                        </span>
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

    const rows =
        document.querySelectorAll(
            '#tableBody .main-row'
        );

    const today =
        getTodayFormatted();

    const currentMonth =
        today.substring(0, 7);

    let total = 0;
    let tDay = 0;
    let tMonth = 0;

    let valTotal = 0;
    let valMonth = 0;

    total = rows.length;

    rows.forEach(row => {

        const dateInput =
            row.querySelector(
                '.visit-date-val'
            );

        const visitValInput =
            row.querySelector(
                '.opp-value-input'
            );

        const visitVal =
            visitValInput
                ? parseFloat(
                    visitValInput.value
                  ) || 0
                : 0;

        valTotal += visitVal;

        if (dateInput) {

            const date =
                dateInput.value;

            if (date === today) {
                tDay++;
            }

            if (
                date.startsWith(
                    currentMonth
                )
            ) {

                tMonth++;
                valMonth += visitVal;
            }
        }
    });

    document.getElementById(
        'stat-total'
    ).innerText = total;

    document.getElementById(
        'stat-today'
    ).innerText = tDay;

    document.getElementById(
        'stat-month'
    ).innerText = tMonth;

    document.getElementById(
        'stat-value-total'
    ).innerText =
        valTotal.toLocaleString()
        + ' ر.س';

    document.getElementById(
        'stat-value-month'
    ).innerText =
        valMonth.toLocaleString()
        + ' ر.س';
}

/* =========================
   Status Colors
========================= */

function applyStatusColor(
    selectEl
) {

    const val =
        selectEl.value;

    const parentCell =
        selectEl.closest('td');

    const mainRow =
        selectEl.closest('.main-row');

    if (!parentCell) return;

    parentCell.classList.remove(
        'status-yellow',
        'status-red'
    );

    selectEl.classList.remove(
        'status-yellow',
        'status-red'
    );

    if (mainRow) {
        mainRow.classList.remove(
            'lost-row'
        );
    }

    if (val === 'عرض سعر') {

        selectEl.classList.add(
            'status-yellow'
        );

    } else if (
        val === 'فقدان'
    ) {

        selectEl.classList.add(
            'status-red'
        );

        if (mainRow) {

            mainRow.classList.add(
                'lost-row'
            );
        }
    }
}
/* =========================
   Reorder Rows
========================= */

function reorderRows() {

    const tbody =
        document.getElementById(
            'tableBody'
        );

    const rows =
        Array.from(
            tbody.querySelectorAll(
                '.main-row'
            )
        );

    const today =
        getTodayFormatted();

    const currentMonth =
        today.substring(0, 7);

    const rowsData =
        rows.map(row => ({
            row: row,

            subRow:
                document.getElementById(
                    'sub-' + row.id
                ),

            date:
                row.querySelector(
                    '.visit-date-val'
                ).value || '9999-12-31'
        }));

    rowsData.sort(
        (a, b) =>
            b.date.localeCompare(a.date)
    );

    const groups = {};

    rowsData.forEach(item => {

        const month =
            item.date.substring(0, 7);

        if (!groups[month]) {
            groups[month] = [];
        }

        groups[month].push(item);
    });

    tbody.innerHTML = '';

    const fragment =
        document.createDocumentFragment();

    Object.keys(groups)
        .sort((a, b) =>
            b.localeCompare(a)
        )
        .forEach(month => {

            const sepRow =
                document.createElement('tr');

            sepRow.className =
                'month-separator';

            const isCurrentMonth =
                (
                    month ===
                    currentMonth
                );

            const sepStyle =
                isCurrentMonth
                    ? 'background-color: var(--accent-blue) !important; color:#fff !important;'
                    : '';

            sepRow.innerHTML = `
                <td colspan="14">
                    <div class="sep-text"
                         style="${sepStyle}">
                        ${month}
                    </div>
                </td>
            `;

            fragment.appendChild(
                sepRow
            );

            groups[month]
                .forEach(item => {

                    fragment.appendChild(
                        item.row
                    );

                    if (item.subRow) {

                        fragment.appendChild(
                            item.subRow
                        );
                    }
                });
        });

    tbody.appendChild(
        fragment
    );
}

/* =========================
   New Row
========================= */

function insertNewRow() {

    renderRow({}, true);

    saveAllDataSilently();

    document.querySelector(
        '.table-wrapper'
    ).scrollTop = 0;
}

/* =========================
   Render Row
========================= */

function renderRow(
    v = {},
    prepend = false
) {

    const tbody =
        document.getElementById(
            'tableBody'
        );

    const rowId =
        'row-' +
        Date.now() +
        Math.random()
            .toString(36)
            .substr(2, 5);

    const mainRow =
        document.createElement('tr');

    mainRow.className =
        'main-row';

    mainRow.id =
        rowId;

    const subRow =
        document.createElement('tr');

    subRow.className =
        'sub-table-row';

    subRow.id =
        'sub-' + rowId;

    const today =
        getTodayFormatted();

    const visitDate =
        v.visitDate || today;

    const notesJson =
        v.notes || "[]";

    const lastNoteText =
        getLastNoteOnlyFromJSON(
            notesJson
        );

    const editDateHTML =
        parseEditDateHTML(
            v.editDate || ''
        );

            mainRow.innerHTML = `
            <td class="col-select"><input type="checkbox" class="select-check"><span class="toggle-arrow" onclick="toggleSubTable('${rowId}')"><i class="fas fa-caret-left"></i></span></td>
            <td><input type="text" class="excel-input" value="${v.comp || ''}" data-old="${v.comp || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('الشركة', this.dataset.old, this.value, this.value); this.dataset.old=this.value;"></td>
            <td><input type="text" class="excel-input" value="${v.address || ''}" data-old="${v.address || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('العنوان', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
            <td><input type="text" class="excel-input" value="${v.mgr || ''}" data-old="${v.mgr || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('المسؤول', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
            <td><div class="phone-cell-container"><a class="whatsapp-icon-btn" onclick="openWhatsAppChat(this)" title="مراسلة عبر واتساب"><i class="fa-brands fa-whatsapp"></i></a><input type="text" class="excel-input" value="${v.mob || ''}" data-old="${v.mob || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, ''); debouncedSaveAllData();" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr'));" onblur="addToActivityLog('رقم التواصل', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></div></td>
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
                    <option value="عرض سعر" ${v.status === 'عرض سعر' ? 'selected' : ''}>عرض سعر</option>
                    <option value="غير مهتم" ${v.status === 'غير مهتم' ? 'selected' : ''}>غير مهتم</option>
                    <option value="فقدان" ${v.status === 'فقدان' ? 'selected' : ''}>فقدان</option>
                </select>
            </td>
            <td><div class="edit-date-container">${editDateHTML}</div><input type="hidden" class="edit-date-val" value="${v.editDate || ''}"></td>
            <td><input type="text" class="excel-input" value="${v.owner || ''}" data-old="${v.owner || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('المالك', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
        `;

        subRow.innerHTML = `<td colspan="14"><div class="sub-table-container"><table class="inner-table"><thead><tr><th>المنتج</th><th>التفاصيل</th><th>العدد</th><th>الاشتراك</th><th>الإجمالي</th><th style="width:75px"><button class="header-plus-btn" onclick="addProductRow('${rowId}')" title="إضافة منتج"><i class="fas fa-plus"></i></button></th></tr></thead><tbody class="product-body"></tbody></table></div></td>`;
        
        if (prepend) { tbody.insertBefore(subRow, tbody.firstChild); tbody.insertBefore(mainRow, subRow); } 
        else { tbody.appendChild(mainRow); tbody.appendChild(subRow); }

        applyStatusColor(mainRow.querySelector('.status-select'));
        if (v.products && v.products.length > 0) v.products.forEach(p => addProductRow(rowId, p)); 
        else addProductRow(rowId);
        
        calculateMainVisitValue(rowId);
        if(!prepend) reorderRows();
    }

    async function handleStatusChange(selectEl, rowId) {
        const newVal = selectEl.value; const oldVal = selectEl.dataset.old;
        const companyName = selectEl.closest('tr').cells[1].querySelector('input').value;

        if (newVal === "تأهيل لفرصة") {
            const result = await Swal.fire({ title: 'نقل إلى الفرص البيعية؟', text: "سيتم تحويل هذه الزيارة إلى صفحة الفرص البيعية.", icon: 'question', showCancelButton: true, confirmButtonColor: '#3b82f6', cancelButtonColor: '#94a3b8', confirmButtonText: 'نعم، انقلها', cancelButtonText: 'إلغاء' });
            if (result.isConfirmed) { transferToOpportunities(rowId); return; } 
            else { selectEl.value = oldVal; applyStatusColor(selectEl); return; }
        }

        applyStatusColor(selectEl);
        addToActivityLog('الحالة', oldVal, newVal, companyName);
        updateEditDateField(selectEl.closest('tr'));
        saveAllDataSilently(); updateStats(); reorderRows();
        selectEl.dataset.old = newVal;
    }

    function transferToOpportunities(rowId) {
        const row = document.getElementById(rowId); const subRow = document.getElementById('sub-' + rowId);
        const products = [];
        subRow.querySelectorAll('.product-body tr').forEach(pRow => {
            const inputs = pRow.querySelectorAll('input, select');
            products.push({ type: inputs[0].value, desc: inputs[1].value, qty: inputs[2].value, sub: inputs[3].value, total: inputs[4].value });
        });

        const visitData = {
            comp: row.cells[1].querySelector('input').value, address: row.cells[2].querySelector('input').value,
            mgr: row.cells[3].querySelector('input').value, mob: row.cells[4].querySelector('input').value,
            email: row.cells[5].querySelector('input').value, record: row.cells[6].querySelector('input').value,
            oppDate: getTodayFormatted(), curServ: row.querySelector('.cur-serv-val').value,
            oppValue: row.querySelector('.opp-value-input').value, notes: row.querySelector('.notes-preview').getAttribute('data-full-notes') || '[]',
            status: "مهتم", editDate: row.querySelector('.edit-date-val').value, owner: row.cells[13].querySelector('input').value, products: products
        };

        let opps = JSON.parse(localStorage.getItem(OPPORTUNITIES_KEY) || '[]'); opps.unshift(visitData); localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(opps));
        addToActivityLog('إجراء', 'تأهيل ونقل الفرصة البيعية', '', visitData.comp);
        row.remove(); if(subRow) subRow.remove();
        saveAllDataSilently(); updateStats(); reorderRows();
        Swal.fire({icon: 'success', title: 'تم النقل', text: 'تم نقل الزيارة بنجاح', showConfirmButton: false, timer: 1500});
    }

    function toggleSubTable(rowId) {
        const subRow = document.getElementById('sub-' + rowId);
        const arrow = document.querySelector(`#${rowId} .toggle-arrow`);
        const isOpen = subRow.style.display === 'table-row';
        subRow.style.display = isOpen ? 'none' : 'table-row';
        if(isOpen) { arrow.classList.remove('arrow-open'); arrow.innerHTML = '<i class="fas fa-caret-left"></i>'; }
        else { arrow.classList.add('arrow-open'); arrow.innerHTML = '<i class="fas fa-caret-down"></i>'; }
    }

    function addProductRow(rowId, data = {}) {
        const tbody = document.querySelector(`#sub-${rowId} .product-body`); const row = tbody.insertRow();
        row.innerHTML = `<td><select onchange="debouncedSaveAllData()"><option value="">-</option><option value="جوال" ${data.type === 'جوال' ? 'selected' : ''}>جوال</option><option value="بيانات" ${data.type === 'بيانات' ? 'selected' : ''}>بيانات</option><option value="هاتف" ${data.type === 'هاتف' ? 'selected' : ''}>هاتف</option><option value="فايبر نت" ${data.type === 'فايبر نت' ? 'selected' : ''}>فايبر نت</option><option value="DIA" ${data.type === 'DIA' ? 'selected' : ''}>DIA</option><option value="IPVPN" ${data.type === 'IPVPN' ? 'selected' : ''}>IPVPN</option><option value="SIP" ${data.type === 'SIP' ? 'selected' : ''}>SIP</option></select></td><td><input type="text" value="${data.desc || ''}" onkeyup="debouncedSaveAllData()"></td><td><input type="number" class="prod-qty" min="0" value="${data.qty || ''}" onkeyup="calculateMainVisitValue('${rowId}')" oninput="calculateMainVisitValue('${rowId}')"></td><td><input type="number" class="prod-sub" min="0" value="${data.sub || ''}" onkeyup="calculateMainVisitValue('${rowId}')" oninput="calculateMainVisitValue('${rowId}')"></td><td><input type="number" class="prod-total readonly-input" value="${data.total || ''}" readonly style="color:var(--text-muted); font-weight:700; cursor:not-allowed;"></td><td><div style="display:flex; justify-content:center; gap:5px;"><button class="sub-action-btn" title="حذف" onclick="if(this.closest('tbody').rows.length > 1) { this.closest('tr').remove(); calculateMainVisitValue('${rowId}'); }"><i class="fas fa-trash-alt" style="font-size:10px;"></i></button></div></td>`;
    }

    function calculateMainVisitValue(rowId) {
        const subRow = document.getElementById('sub-' + rowId); if (!subRow) return;
        let grandTotal = 0;
        subRow.querySelectorAll('.product-body tr').forEach(pRow => {
            const qtyInput = pRow.querySelector('.prod-qty'), subInput = pRow.querySelector('.prod-sub'), totalInput = pRow.querySelector('.prod-total');
            let qty = parseFloat(qtyInput.value) || 0, sub = parseFloat(subInput.value) || 0;
            const rowTotal = qty * sub; totalInput.value = rowTotal > 0 ? rowTotal : ''; grandTotal += rowTotal;
        });
        const mainRow = document.getElementById(rowId);
        if (mainRow) { const oppValueInput = mainRow.querySelector('.opp-value-input'); if (oppValueInput) oppValueInput.value = grandTotal > 0 ? grandTotal : ''; }
        debouncedSaveAllData();
    }

    function toggleAllCheckboxes(source) { document.querySelectorAll('.select-check').forEach(chk => chk.checked = source.checked); }
    function toggleDropdown(e, btn) { e.stopPropagation(); const menu = btn.nextElementSibling; document.querySelectorAll('.dropdown-menu').forEach(m => { if(m !== menu) m.classList.remove('show'); }); menu.classList.toggle('show'); }

    async function handleBulkAction(action) {
        const selected = document.querySelectorAll('.select-check:checked');
        if (selected.length === 0) { 
            Swal.fire({icon: 'info', text: 'يرجى تحديد صف واحد على الأقل', confirmButtonText: 'حسناً', confirmButtonColor: '#3b82f6'}); 
            return; 
        }
        
        if (action === 'حذف') {
            const result = await Swal.fire({ title: 'تأكيد الحذف؟', text: "سيتم حذف الزيارات المحددة نهائياً!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#94a3b8', confirmButtonText: 'نعم، احذف', cancelButtonText: 'إلغاء' });
            if (result.isConfirmed) {
                selected.forEach(chk => { const row = chk.closest('tr'); const id = row.id; addToActivityLog('إجراء', 'حذف الزيارة', '', row.cells[1].querySelector('input').value); row.remove(); if(document.getElementById('sub-' + id)) document.getElementById('sub-' + id).remove(); });
                saveAllDataSilently(); updateStats(); reorderRows(); Swal.fire({icon: 'success', title: 'تم الحذف', showConfirmButton: false, timer: 1500});
            }
        } else if (action === 'تصدير') {
            exportToExcel(selected);
            addToActivityLog('إجراء', 'تصدير بيانات للإكسيل', '', 'مجموعة محددة');
        } else if (action === 'طباعة') {
            printSelected(selected);
            addToActivityLog('إجراء', 'طباعة بيانات', '', 'مجموعة محددة');
        } else { 
            selected.forEach(chk => { const row = chk.closest('tr'); addToActivityLog('إجراء', action, '', row.cells[1].querySelector('input').value); });
            Swal.fire({icon: 'success', title: 'تم', text: 'تم تنفيذ الإجراء على ' + selected.length + ' صف', showConfirmButton: false, timer: 1500});
        }
    }

    function exportToExcel(selectedRows) {
        let csvContent = "\uFEFF"; 
        csvContent += "الشركة,العنوان,المسؤول,رقم التواصل,الإيميل,السجل,تاريخ الزيارة,الخدمة,القيمة,الحالة,المالك\n";
        
        selectedRows.forEach(chk => {
            const row = chk.closest('tr');
            const getVal = (index) => {
                const input = row.cells[index].querySelector('input, select');
                let val = input ? input.value.replace(/"/g, '""') : '';
                return `"${val}"`; 
            };
            
            const rowData = [
                getVal(1), getVal(2), getVal(3), getVal(4), getVal(5), 
                getVal(6), getVal(7), getVal(8), getVal(9), getVal(11), getVal(13)
            ];
            csvContent += rowData.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "تقرير_الزيارات_" + getTodayFormatted() + ".csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function printSelected(selectedRows) {
        let printWindow = window.open('', '_blank');
        let html = `
            <html dir="rtl">
            <head>
                <title>تقرير الزيارات المحددة</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; padding: 20px; color: #0f172a; }
                    h2 { text-align: center; color: #4c1d95; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { background-color: #f1f5f9; color: #1e293b; padding: 10px; border: 1px solid #cbd5e1; font-weight: 700; }
                    td { padding: 8px; border: 1px solid #cbd5e1; text-align: center; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    .footer { margin-top: 30px; text-align: left; font-size: 10px; color: #64748b; }
                </style>
            </head>
            <body>
                <h2>تقرير الزيارات (ASGate CRM)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>الشركة</th><th>المسؤول</th><th>رقم التواصل</th>
                            <th>الخدمة</th><th>تاريخ الزيارة</th><th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        selectedRows.forEach(chk => {
            const row = chk.closest('tr');
            const getVal = (index) => row.cells[index].querySelector('input, select')?.value || '';
            html += `<tr>
                <td><strong>${getVal(1)}</strong></td>
                <td>${getVal(3)}</td>
                <td dir="ltr">${getVal(4)}</td>
                <td>${getVal(8)}</td>
                <td>${getVal(7)}</td>
                <td>${getVal(11)}</td>
            </tr>`;
        });

        html += `
                    </tbody>
                </table>
                <div class="footer">تاريخ الطباعة: ${getTodayFormatted()} - تم الإنشاء بواسطة نظام ASGate</div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }

    function saveAllDataSilently() {
        const data = [];
        document.querySelectorAll('.main-row').forEach(row => {
            const id = row.id; const products = []; const subRow = document.getElementById('sub-' + id);
            if(subRow) { subRow.querySelectorAll('.product-body tr').forEach(pRow => { const inputs = pRow.querySelectorAll('input, select'); products.push({ type: inputs[0].value, desc: inputs[1].value, qty: inputs[2].value, sub: inputs[3].value, total: inputs[4].value }); }); }
            data.push({ 
                comp: row.cells[1].querySelector('input').value, address: row.cells[2].querySelector('input').value, 
                mgr: row.cells[3].querySelector('input').value, mob: row.cells[4].querySelector('input').value, 
                email: row.cells[5].querySelector('input').value, record: row.cells[6].querySelector('input').value, 
                visitDate: row.querySelector('.visit-date-val').value, curServ: row.querySelector('.cur-serv-val').value, 
                oppValue: row.querySelector('.opp-value-input').value, notes: row.querySelector('.notes-preview').getAttribute('data-full-notes') || '[]', 
                status: row.querySelector('.status-select').value, editDate: row.querySelector('.edit-date-val').value, 
                owner: row.cells[13].querySelector('input').value, products: products 
            });
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function loadSavedData() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) { document.getElementById('tableBody').innerHTML = ''; JSON.parse(saved).forEach(v => renderRow(v)); }
        renderActivityLog(); updateStats(); reorderRows();
    }

    let searchTimeout;
    function debouncedFilterTable() { clearTimeout(searchTimeout); searchTimeout = setTimeout(filterTable, 300); }

    function filterTable() {
        const q = document.getElementById('searchInput').value.toLowerCase().trim();
        document.querySelectorAll('.main-row').forEach(row => {
            const comp = row.cells[1].querySelector('input').value.toLowerCase();
            const mgr = row.cells[3].querySelector('input').value.toLowerCase();
            const mob = row.cells[4].querySelector('input').value.toLowerCase();
            const email = row.cells[5].querySelector('input').value.toLowerCase();
            const record = row.cells[6].querySelector('input').value.toLowerCase();
            const subRow = document.getElementById('sub-' + row.id);
            if (comp.includes(q) || mgr.includes(q) || mob.includes(q) || email.includes(q) || record.includes(q)) { row.style.display = 'table-row'; } 
            else { row.style.display = 'none'; if(subRow) subRow.style.display = 'none'; }
        });
    }

    function showStatusTooltip(el) {
        const val = el.value || "فارغ";
        let tooltip = document.getElementById('status-custom-tooltip');
        if(!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'status-custom-tooltip';
            tooltip.style.position = 'absolute';
            tooltip.style.background = '#1e293b';
            tooltip.style.color = '#fff';
            tooltip.style.padding = '5px 10px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '11px';
            tooltip.style.fontFamily = 'Cairo';
            tooltip.style.zIndex = '3000';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
        }
        tooltip.innerText = val;
        tooltip.style.display = 'block';
        
        const rect = el.getBoundingClientRect();
        tooltip.style.top = (rect.top + window.scrollY - tooltip.offsetHeight - 6) + 'px';
        tooltip.style.left = (rect.left + window.scrollX + (rect.width/2) - (tooltip.offsetWidth/2)) + 'px';
    }

    function hideStatusTooltip() {
        const tooltip = document.getElementById('status-custom-tooltip');
        if(tooltip) tooltip.style.display = 'none';
    }

    function getLastNoteOnlyFromJSON(jsonStr) {
        try { const arr = JSON.parse(jsonStr); return arr.length > 0 ? arr[arr.length - 1].text : 'أضف ملاحظة...'; } 
        catch(e) { 
            if(jsonStr && typeof jsonStr === 'string' && jsonStr.trim() !== "") { const parts = jsonStr.split('\n--------------------\n'); const last = parts[parts.length - 1]; if(last.includes('||')) return last.split('||')[1] || ""; return last; }
            return 'أضف ملاحظة...'; 
        }
    }

    function openNote(el) {
        currentActivePreview = el; const raw = el.getAttribute('data-full-notes') || "[]"; let arr = []; 
        try { arr = JSON.parse(raw); } 
        catch(e) { 
            arr = [];
            if(raw.trim() !== "") { raw.split('\n--------------------\n').forEach(entry => { if(entry.includes('||')) { const parts = entry.split('||'); arr.push({user: "النظام", date: "", time: "", text: parts[1]}); } else { arr.push({user: "النظام", date: "", time: "", text: entry}); } }); }
        }
        let htmlContent = arr.map(msg => `<div class="chat-msg-block"><span class="chat-msg-header"><span><i class="fas fa-user-circle"></i> ${msg.user}</span> <span style="font-weight: 600; color:#94a3b8; font-size:9px;">${msg.date} ${msg.time}</span></span><span class="chat-msg-text">${msg.text}</span></div>`).join('');
        document.getElementById('historyLog').innerHTML = htmlContent;
        document.getElementById('noteModal').style.display = "flex";
        document.getElementById('modalTextArea').focus();
    }

    function saveNote() {
        const txt = document.getElementById('modalTextArea').value.trim();
        if (txt && currentActivePreview) {
            const raw = currentActivePreview.getAttribute('data-full-notes') || "[]"; let arr = []; 
            try { arr = JSON.parse(raw); } catch(e) { arr = []; }
            const d = new Date();
            arr.push({ user: document.querySelector('.main-row').cells[13].querySelector('input').value || "المستخدم", date: getTodayFormatted(), time: getTimeFormatted(), text: txt });
            currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr));
            currentActivePreview.innerText = txt;
            updateEditDateField(currentActivePreview.closest('tr'));
            saveAllDataSilently();
        }
        closeNote();
    }

    function closeNote() { document.getElementById('noteModal').style.display = "none"; document.getElementById('modalTextArea').value = ""; }

    window.onclick = (e) => { if (!e.target.matches('.btn-bulk-trigger') && !e.target.matches('.fa-chevron-down')) document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show')); };
