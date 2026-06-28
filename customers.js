/* ==========================================================
   1. المتغيرات والتعريفات الأساسية
   ========================================================== */
let currentActivePreview = null;
let saveTimeout;
let searchTimeout;
const STORAGE_KEY = 'asgate_customers_final_v2'; // تم تغيير المفتاح لعدم تعارض البيانات القديمة
const LOGS_KEY = 'asgate_customers_logs_v2';

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
    
    const today = getTodayFormatted();
    const creationDate = v.creationDate || today;
    const notesJson = v.notes || "[]";
    const lastNoteText = getLastNoteOnlyFromJSON(notesJson);
    const customerCode = v.code || Math.floor(10000 + Math.random() * 90000); // كود من 5 أرقام

    mainRow.innerHTML = `
        <td class="col-select"><input type="checkbox" class="select-check"></td>
        <td><a href="customer_details.html?id=${customerCode}" class="code-link" target="_blank">${customerCode}</a><input type="hidden" class="code-val" value="${customerCode}"></td>
        <td><input type="text" class="excel-input" value="${v.comp || ''}" data-old="${v.comp || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('اسم الشركة', this.dataset.old, this.value, this.value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input" value="${v.address || ''}" data-old="${v.address || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('العنوان', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input" value="${v.mgr || ''}" data-old="${v.mgr || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('المسؤول', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td>
            <div class="phone-cell-container">
                <a class="whatsapp-icon-btn" onclick="openWhatsAppChat(this)" title="مراسلة عبر واتساب"><i class="fa-brands fa-whatsapp"></i></a>
                <input type="text" class="excel-input" value="${v.mob || ''}" data-old="${v.mob || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, ''); debouncedSaveAllData();" onfocus="this.dataset.old=this.value" onblur="addToActivityLog('رقم التواصل', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;">
            </div>
        </td>
        <td><input type="text" class="excel-input" value="${v.email || ''}" data-old="${v.email || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('البريد الالكتروني', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input readonly-input visit-date-val" value="${creationDate}" style="color:var(--text-muted); font-weight:700;" readonly></td>
        
        <td>
            <select class="excel-input class-select" data-old="${v.classification || ''}" onfocus="this.dataset.old=this.value" onchange="handleClassChange(this)">
                <option value="" ${v.classification === '' ? 'selected' : ''}>-</option>
                <option value="حكومي" ${v.classification === 'حكومي' ? 'selected' : ''}>حكومي</option>
                <option value="مهم" ${v.classification === 'مهم' ? 'selected' : ''}>مهم</option>
                <option value="متوسط" ${v.classification === 'متوسط' ? 'selected' : ''}>متوسط</option>
                <option value="صغير" ${v.classification === 'صغير' ? 'selected' : ''}>صغير</option>
            </select>
        </td>
        
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${notesJson.replace(/'/g, "&apos;")}' id="preview-${Date.now()}">${lastNoteText}</div></td>
        
        <td>
            <select class="excel-input status-select" data-old="${v.status || ''}" onfocus="this.dataset.old=this.value" onchange="handleStatusChange(this)">
                <option value="" ${v.status === '' ? 'selected' : ''}>-</option>
                <option value="نشط" ${v.status === 'نشط' ? 'selected' : ''}>نشط</option>
                <option value="غير نشط" ${v.status === 'غير نشط' ? 'selected' : ''}>غير نشط</option>
            </select>
        </td>
        
        <td><input type="text" class="excel-input" value="${v.owner || ''}" data-old="${v.owner || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('المالك', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;"></td>
    `;

    if (prepend && tbody.firstChild) { tbody.insertBefore(mainRow, tbody.firstChild); } 
    else { tbody.appendChild(mainRow); }
    
    applyClassColor(mainRow.querySelector('.class-select'));
    applyStatusColor(mainRow.querySelector('.status-select'));
}

/* ==========================================================
   3. الإجراءات الجماعية والبحث والفرز
   ========================================================== */
function toggleDropdown(e, btn) {
    e.stopPropagation();
    const menu = btn.nextElementSibling;
    document.querySelectorAll('.dropdown-menu').forEach(m => { if(m !== menu) m.classList.remove('show'); });
    menu.classList.toggle('show');
}

window.onclick = (e) => {
    if (!e.target.matches('.btn-bulk-trigger') && !e.target.matches('.fa-chevron-down')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    }
};

function toggleAllCheckboxes(source) { document.querySelectorAll('.select-check').forEach(chk => chk.checked = source.checked); }

async function handleBulkAction(action) {
    const selected = document.querySelectorAll('.select-check:checked');
    if (selected.length === 0) { Swal.fire({icon: 'info', text: 'يرجى تحديد صف واحد على الأقل', confirmButtonText: 'حسناً', confirmButtonColor: '#3b82f6'}); return; }
    if (action === 'حذف') {
        const result = await Swal.fire({ title: 'تأكيد الحذف؟', text: "سيتم حذف بيانات العملاء المحددة نهائياً!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#94a3b8', confirmButtonText: 'نعم، احذف', cancelButtonText: 'إلغاء' });
        if (result.isConfirmed) {
            selected.forEach(chk => { const row = chk.closest('tr'); addToActivityLog('إجراء', 'حذف العميل', '', row.cells[2].querySelector('input').value); row.remove(); });
            saveAllDataSilently(); updateStats(); reorderRows(); Swal.fire({icon: 'success', title: 'تم الحذف', showConfirmButton: false, timer: 1500});
        }
    } else if (action === 'تصدير') {
        exportToExcel(selected); addToActivityLog('إجراء', 'تصدير بيانات للإكسيل', '', 'مجموعة محددة');
    } else if (action === 'طباعة') {
        printSelected(selected); addToActivityLog('إجراء', 'طباعة بيانات', '', 'مجموعة محددة');
    } else { 
        selected.forEach(chk => { const row = chk.closest('tr'); addToActivityLog('إجراء', action, '', row.cells[2].querySelector('input').value); });
        Swal.fire({icon: 'success', title: 'تم', text: 'تم تنفيذ الإجراء على ' + selected.length + ' صف', showConfirmButton: false, timer: 1500});
    }
}

function exportToExcel(selectedRows) {
    let csvContent = "\uFEFFكود العميل,اسم الشركة,العنوان,المسؤول,رقم التواصل,البريد الالكتروني,تاريخ الانشاء,تصنيف العميل,حالة العميل,المالك\n";
    selectedRows.forEach(chk => {
        const row = chk.closest('tr');
        const getVal = (idx) => { const inp = row.cells[idx].querySelector('input, select'); return `"${inp ? inp.value.replace(/"/g, '""') : ''}"`; };
        csvContent += [getVal(1), getVal(2), getVal(3), getVal(4), getVal(5), getVal(6), getVal(7), getVal(8), getVal(10), getVal(11)].join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "تقرير_العملاء_" + getTodayFormatted() + ".csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function printSelected(selectedRows) {
    let printWindow = window.open('', '_blank');
    let html = `<html dir="rtl"><head><title>تقرير العملاء المحددة</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"><style>body { font-family: 'Cairo', sans-serif; padding: 20px; color: #0f172a; } h2 { text-align: center; color: #4c1d95; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; } table { width: 100%; border-collapse: collapse; font-size: 12px; } th { background-color: #f1f5f9; color: #1e293b; padding: 10px; border: 1px solid #cbd5e1; font-weight: 700; } td { padding: 8px; border: 1px solid #cbd5e1; text-align: center; } tr:nth-child(even) { background-color: #f8fafc; } .footer { margin-top: 30px; text-align: left; font-size: 10px; color: #64748b; }</style></head><body><h2>تقرير العملاء (ASGate CRM)</h2><table><thead><tr><th>الكود</th><th>الشركة</th><th>المسؤول</th><th>رقم التواصل</th><th>التاريخ</th><th>التصنيف</th><th>الحالة</th></tr></thead><tbody>`;
    selectedRows.forEach(chk => { const row = chk.closest('tr'); const getVal = (idx) => row.cells[idx].querySelector('input, select')?.value || ''; html += `<tr><td>${getVal(1)}</td><td><strong>${getVal(2)}</strong></td><td>${getVal(4)}</td><td dir="ltr">${getVal(5)}</td><td>${getVal(7)}</td><td>${getVal(8)}</td><td>${getVal(10)}</td></tr>`; });
    html += `</tbody></table><div class="footer">تاريخ الطباعة: ${getTodayFormatted()}</div></body></html>`;
    printWindow.document.write(html); printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

function debouncedFilterTable() { clearTimeout(searchTimeout); searchTimeout = setTimeout(filterTable, 300); }
function filterTable() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    document.querySelectorAll('.main-row').forEach(row => {
        // البحث في جميع الأعمدة المدخلة
        const text = Array.from(row.cells).slice(1, 8).map(c => {
            const input = c.querySelector('input');
            const link = c.querySelector('a');
            return input ? input.value.toLowerCase() : (link ? link.innerText.toLowerCase() : '');
        }).join(' ');
        
        if (text.includes(q)) { row.style.display = 'table-row'; } else { row.style.display = 'none'; }
    });
}

/* ==========================================================
   4. إدارة الملاحظات 
   ========================================================== */
function openNote(el) {
    currentActivePreview = el;
    let arr = []; try { arr = JSON.parse(el.getAttribute('data-full-notes') || "[]"); } catch(e) {}
    const historyLog = document.getElementById('historyLog');
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    if (historyLog) {
        historyLog.innerHTML = arr.map(msg => {
            let msgDateObj = new Date(msg.date);
            let dayStr = isNaN(msgDateObj) ? '' : days[msgDateObj.getDay()] + ' ';
            let userName = msg.user && msg.user !== "المستخدم" ? msg.user : "المستخدم";

            return `
            <div class="log-entry" style="display: block; line-height: 1.6;">
                <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="log-badge-user"><i class="fas fa-user-circle"></i> ${userName}</span>
                    <span class="log-divider">|</span>
                    <span class="log-timestamp"><i class="fas fa-clock"></i> ${dayStr}${msg.date} ${msg.time}</span>
                    <span class="log-divider">|</span>
                </div>
                <div class="log-action" style="padding-right: 5px; color: #0f172a; font-size: 11px; font-weight: 700; white-space: pre-wrap; display: block;">${msg.text}</div>
            </div>
            `;
        }).join('') || '<div style="color:#64748b; text-align:center; font-size:10px; padding:20px; font-weight:700;">لا توجد ملاحظات سابقة - ابدأ بإضافة ملاحظة جديدة</div>';
    }
    
    const noteModal = document.getElementById('noteModal');
    if (noteModal) noteModal.style.display = "flex";
    const modalTextArea = document.getElementById('modalTextArea');
    if (modalTextArea) { modalTextArea.value = ""; modalTextArea.focus(); }
}

function saveNote() {
    const txt = document.getElementById('modalTextArea').value.trim();
    if (txt && currentActivePreview) {
        let arr = []; try { arr = JSON.parse(currentActivePreview.getAttribute('data-full-notes') || "[]"); } catch(e) {}
        let username = "المستخدم"; const mainRow = currentActivePreview.closest('.main-row');
        if (mainRow) { const ownerInput = mainRow.cells[11]?.querySelector('input'); if (ownerInput && ownerInput.value.trim()) username = ownerInput.value.trim(); }
        arr.push({ user: username, date: getTodayFormatted(), time: getTimeFormatted(), text: txt });
        currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr)); currentActivePreview.innerText = txt;
        saveAllDataSilently();
    }
    closeNote();
}

function closeNote() { document.getElementById('noteModal').style.display = "none"; }

/* ==========================================================
   5. العمليات التشغيلية والألوان
   ========================================================== */
function insertNewRow() { 
    renderRow({}, true); 
    saveAllDataSilently(); 
    const wrapper = document.querySelector('.table-wrapper'); 
    if (wrapper) wrapper.scrollTop = 0; 
}

function toggleLogExpansion() { const logSection = document.getElementById('activityLogSection'); const toggleBtn = document.getElementById('toggleExpandBtn'); if (logSection.classList.contains('expanded')) { logSection.classList.remove('expanded'); toggleBtn.innerHTML = '<i class="fas fa-expand-alt"></i>'; } else { logSection.classList.add('expanded'); toggleBtn.innerHTML = '<i class="fas fa-compress-alt"></i>'; } }

function handleStatusChange(selectEl) {
    const newVal = selectEl.value; const oldVal = selectEl.dataset.old; const companyName = selectEl.closest('tr').cells[2].querySelector('input').value;
    applyStatusColor(selectEl); addToActivityLog('الحالة', oldVal, newVal, companyName); saveAllDataSilently(); selectEl.dataset.old = newVal;
}

function handleClassChange(selectEl) {
    const newVal = selectEl.value; const oldVal = selectEl.dataset.old; const companyName = selectEl.closest('tr').cells[2].querySelector('input').value;
    applyClassColor(selectEl); addToActivityLog('التصنيف', oldVal, newVal, companyName); saveAllDataSilently(); selectEl.dataset.old = newVal;
}

function applyStatusColor(selectEl) { 
    if (!selectEl) return; 
    const val = selectEl.value; 
    selectEl.classList.remove('status-active', 'status-inactive'); 
    if (val === 'نشط') selectEl.classList.add('status-active'); 
    else if (val === 'غير نشط') selectEl.classList.add('status-inactive');
}

function applyClassColor(selectEl) { 
    if (!selectEl) return; 
    const val = selectEl.value; 
    selectEl.classList.remove('status-gov', 'status-important', 'status-med', 'status-small'); 
    if (val === 'حكومي') selectEl.classList.add('status-gov'); 
    else if (val === 'مهم') selectEl.classList.add('status-important');
    else if (val === 'متوسط') selectEl.classList.add('status-med');
    else if (val === 'صغير') selectEl.classList.add('status-small');
}

/* ==========================================================
   6. حفظ واسترجاع وعمليات مساعدة
   ========================================================== */
function saveAllDataSilently() {
    const data = Array.from(document.querySelectorAll('#tableBody .main-row')).map(row => {
        return { 
            code: row.cells[1].querySelector('.code-val').value,
            comp: row.cells[2].querySelector('input').value, 
            address: row.cells[3].querySelector('input').value, 
            mgr: row.cells[4].querySelector('input').value, 
            mob: row.cells[5].querySelector('input').value, 
            email: row.cells[6].querySelector('input').value, 
            creationDate: row.querySelector('.visit-date-val').value, 
            classification: row.cells[8].querySelector('select').value, 
            notes: row.cells[9].querySelector('.notes-preview').getAttribute('data-full-notes'), 
            status: row.cells[10].querySelector('select').value, 
            owner: row.cells[11].querySelector('input').value 
        };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function debouncedSaveAllData() { clearTimeout(saveTimeout); saveTimeout = setTimeout(() => { saveAllDataSilently(); updateStats(); }, 600); }
function loadSavedData() { const rawData = localStorage.getItem(STORAGE_KEY); const tbody = document.getElementById('tableBody'); if (!tbody) return; tbody.innerHTML = ''; if (rawData) { JSON.parse(rawData).forEach(v => renderRow(v, false)); } reorderRows(); updateStats(); renderActivityLog(); }
function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }
function getLastNoteOnlyFromJSON(jsonStr) { try { const arr = JSON.parse(jsonStr); return arr.length > 0 ? arr[arr.length - 1].text : "أضف ملاحظة..."; } catch(e) { return "أضف ملاحظة..."; } }

function reorderRows() { 
    const tbody = document.getElementById('tableBody'); if (!tbody) return; 
    const rows = Array.from(tbody.querySelectorAll('.main-row')); 
    const today = getTodayFormatted(), currentMonth = today.substring(0, 7); 
    const rowsData = rows.map(row => ({ row: row, date: row.querySelector('.visit-date-val')?.value || '9999-12-31' })); 
    rowsData.sort((a, b) => b.date.localeCompare(a.date)); 
    
    const groups = {}; 
    rowsData.forEach(item => { const month = item.date.substring(0, 7); if (!groups[month]) groups[month] = []; groups[month].push(item); }); 
    tbody.innerHTML = ''; 
    const fragment = document.createDocumentFragment(); 
    
    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(month => { 
        const sepRow = document.createElement('tr'); sepRow.className = 'month-separator'; 
        const isCurrentMonth = (month === currentMonth); 
        const sepStyle = isCurrentMonth ? 'background-color: var(--accent-blue) !important; color:#fff !important; box-shadow: 0 2px 4px rgba(59,130,246,0.3);' : ''; 
        sepRow.innerHTML = `<td colspan="12"><div class="sep-text" style="${sepStyle}"><i class="far fa-calendar-alt"></i> إضافات شهر ${month}</div></td>`; 
        fragment.appendChild(sepRow); 
        groups[month].forEach(item => { fragment.appendChild(item.row); }); 
    }); 
    tbody.appendChild(fragment); 
}

function updateStats() { 
    const rows = document.querySelectorAll('#tableBody .main-row'); 
    const today = getTodayFormatted(), currentMonth = today.substring(0, 7); 
    let total = rows.length, tDay = 0, tMonth = 0; 
    
    rows.forEach(row => { 
        const dateInput = row.querySelector('.visit-date-val'); 
        if (dateInput) { 
            const date = dateInput.value; 
            if (date === today) tDay++; 
            if (date.startsWith(currentMonth)) tMonth++; 
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
    let dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear(); 
    const dayName = days[d.getDay()];
    const timeStr = getTimeFormatted();
    const cleanCompany = companyName || 'شركة غير مسماة'; 
    let actionText = fieldName === 'إجراء' ? `${oldVal} للعميل ( ${cleanCompany} )` : `تعديل ${fieldName} من [${oldVal || 'فارغ'}] إلى [${newVal || 'فارغ'}] للعميل ( ${cleanCompany} )`; 
    
    const fullLogHTML = `
        <div class="log-entry">
            <span class="log-badge-user"><i class="fas fa-user-circle"></i> المستخدم</span>
            <span class="log-divider">|</span>
            <span class="log-timestamp"><i class="fas fa-clock"></i> ${dayName} ${yyyy}-${mm}-${dd} ${timeStr}</span>
            <span class="log-divider">|</span>
            <span class="log-action">${actionText}</span>
        </div>
    `; 
    
    let logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]'); 
    logs.unshift(fullLogHTML); 
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100))); 
    renderActivityLog(); 
}

function renderActivityLog() { const list = document.getElementById('activityList'); if (!list) return; const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]'); list.innerHTML = logs.join(''); }

function openWhatsAppChat(el) { const inputEl = el.closest('.phone-cell-container').querySelector('input'); let rawPhone = inputEl.value.trim(); if (!rawPhone) { Swal.fire({icon: 'warning', title: 'تنبيه', text: 'يرجى إدخال رقم الجوال أولاً', confirmButtonText: 'حسناً', confirmButtonColor: '#3b82f6'}); return; } let cleanNumber = rawPhone.replace(/\D/g, ''); if (cleanNumber.startsWith('00966')) cleanNumber = cleanNumber.substring(2); else if (cleanNumber.startsWith('05')) cleanNumber = '966' + cleanNumber.substring(1); else if (cleanNumber.startsWith('5') && cleanNumber.length === 9) cleanNumber = '966' + cleanNumber; window.open("https://wa.me/" + cleanNumber, '_blank'); }
