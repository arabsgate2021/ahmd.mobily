let currentActivePreview = null;
const STORAGE_KEY = 'asgate_customers_final_v3'; 
const LOGS_KEY = 'asgate_customers_logs_v3';

// تقنية Debounce لتحسين الأداء أثناء الكتابة والحفظ التلقائي
let saveTimeout;
function debouncedSaveAllData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveAllDataSilently();
    }, 600);
}

let searchTimeout;
function debouncedFilterTable() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(filterTable, 300);
}

function getTodayFormatted() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

function getTimeFormatted() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0');
}

function toggleActivityLogHeight() {
    const section = document.getElementById('custActivityLogSection');
    const btn = document.getElementById('toggleLogBtn');
    if (section.classList.contains('expanded')) {
        section.classList.remove('expanded');
        btn.innerHTML = '<i class="fas fa-expand-alt"></i>';
    } else {
        section.classList.add('expanded');
        btn.innerHTML = '<i class="fas fa-compress-alt"></i>';
    }
}

function addToActivityLog(fieldName, oldVal, newVal, companyName) {
    if (oldVal === newVal) return;
    
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const d = new Date();
    let dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear();
    const cleanCompany = companyName && companyName.trim() !== "" ? companyName : "عميل جديد";
    const val1 = (oldVal && oldVal.trim() !== "") ? oldVal : "فارغ";
    const val2 = (newVal && newVal.trim() !== "") ? newVal : "فارغ";
    
    let actionText = fieldName === "إجراء" ? newVal : `تغيير ${fieldName} من [${val1}] إلى [${val2}] للعميل ( ${cleanCompany} )`;
    const fullLogHTML = `<span style="color: #64748b; font-size: 9px;"><i class="fas fa-clock"></i> ${days[d.getDay()]} ${yyyy}-${mm}-${dd} ${getTimeFormatted()}</span> &nbsp;|&nbsp; <span style="color: #0f172a; font-weight: 700;">${actionText}</span>`;
    
    let logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    logs.unshift(fullLogHTML);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
    renderActivityLog();
}

function renderActivityLog() {
    const list = document.getElementById('activityList');
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    list.innerHTML = logs.map(log => `<div class="activity-item">${log}</div>`).join('');
}

function updateStats() {
    const rows = document.querySelectorAll('#tableBody .main-row');
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

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-month').innerText = countMonth;
    document.getElementById('stat-today').innerText = countToday;
}

function openWhatsAppChat(el) {
    const inputEl = el.closest('.phone-cell-container').querySelector('input');
    let rawPhone = inputEl.value.trim();
    
    if (!rawPhone) {
        Swal.fire({icon: 'warning', title: 'تنبيه', text: 'يرجى إدخال رقم الجوال أولاً', confirmButtonText: 'حسناً', confirmButtonColor: '#3b82f6'});
        return;
    }
    
    let cleanNumber = rawPhone.replace(/\D/g, '');
    if (cleanNumber.startsWith('00966')) cleanNumber = cleanNumber.substring(2);
    else if (cleanNumber.startsWith('05')) cleanNumber = '966' + cleanNumber.substring(1);
    else if (cleanNumber.startsWith('5') && cleanNumber.length === 9) cleanNumber = '966' + cleanNumber;
    
    window.open("https://wa.me/" + cleanNumber, '_blank');
}

function applyStatusColor(selectEl) {
    const val = selectEl.value;
    selectEl.classList.remove('status-active', 'status-inactive');
    if (val === "نشط") {
        selectEl.classList.add('status-active');
    } else if (val === "غير نشط") {
        selectEl.classList.add('status-inactive');
    }
}

function renderRow(c = {}, prepend = false) {
    const tbody = document.getElementById('tableBody');
    const rowId = 'cust-' + Date.now() + Math.random().toString(36).substr(2, 5);
    const mainRow = prepend ? tbody.insertRow(0) : tbody.insertRow();
    mainRow.className = 'main-row';
    mainRow.id = rowId;
    
    const notes = c.notes || '';
    const lastNoteText = getLastNoteOnly(notes);
    const createdAt = c.createdDate || getTodayFormatted();
    const generatedId = c.id || Math.floor(1000 + Math.random() * 9000);

    // تم تغيير الرابط هنا إلى customer-details.html بدلاً من customer-profile.html
    mainRow.innerHTML = `
        <td class="col-select"><input type="checkbox" class="select-check"></td>
        <td class="col-id"><a href="customer-details.html?id=${generatedId}" class="id-link" target="_blank">${generatedId}</a></td>
        <td><input type="text" class="excel-input" value="${c.comp || ''}" data-old="${c.comp || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData()" onblur="addToActivityLog('اسم المنشأة الشركة', this.dataset.old, this.value, this.value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input" value="${c.subRecord || ''}" data-old="${c.subRecord || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData()" onblur="addToActivityLog('العنوان', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input" value="${c.mainRecord || ''}" data-old="${c.mainRecord || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, ''); debouncedSaveAllData();" onfocus="this.dataset.old=this.value" onblur="addToActivityLog('السجل الرئيسي', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input" value="${c.contact || ''}" data-old="${c.contact || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData()" onblur="addToActivityLog('الشخص المسؤول', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td>
            <div class="phone-cell-container">
                <a class="whatsapp-icon-btn" onclick="openWhatsAppChat(this)" title="مراسلة عبر واتساب"><i class="fa-brands fa-whatsapp"></i></a>
                <input type="text" class="excel-input" value="${c.phone || ''}" data-old="${c.phone || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, ''); debouncedSaveAllData();" onfocus="this.dataset.old=this.value" onblur="addToActivityLog('رقم التواصل', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;">
            </div>
        </td>
        <td><input type="text" class="excel-input" value="${c.email || ''}" data-old="${c.email || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData()" onblur="addToActivityLog('البريد الإلكتروني', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td>
            <select class="excel-input" data-old="${c.type || ''}" onfocus="this.dataset.old=this.value" onchange="debouncedSaveAllData(); addToActivityLog('التصنيف', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;">
                <option value="VIP" ${c.type === 'VIP' ? 'selected' : ''}>VIP</option>
                <option value="تجاري" ${c.type === 'تجاري' ? 'selected' : ''}>تجاري</option>
                <option value="حكومي" ${c.type === 'حكومي' ? 'selected' : ''}>حكومي</option>
                <option value="صغير" ${c.type === 'صغير' ? 'selected' : ''}>صغير</option>
            </select>
        </td>
        <td>
            <select class="excel-input status-select" data-old="${c.status || ''}" onfocus="this.dataset.old=this.value" onchange="applyStatusColor(this); debouncedSaveAllData(); addToActivityLog('الحالة', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;">
                <option value="نشط" ${c.status === 'نشط' ? 'selected' : ''}>نشط</option>
                <option value="غير نشط" ${c.status === 'غير نشط' ? 'selected' : ''}>غير نشط</option>
            </select>
        </td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${notes.replace(/'/g, "&apos;")}' id="preview-${Date.now()}">${lastNoteText}</div></td>
        <td><input type="text" class="excel-input readonly-input" value="${createdAt}" readonly style="color:var(--text-muted); font-weight:700;"><input type="hidden" class="created-date-val" value="${createdAt}"></td>
        <td><input type="text" class="excel-input" value="${c.owner || 'أحمد'}" data-old="${c.owner || 'أحمد'}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData()" onblur="addToActivityLog('المالك', this.dataset.old, this.value, this.closest('tr').cells[2].querySelector('input').value); this.dataset.old=this.value;"></td>
    `;
    applyStatusColor(mainRow.querySelector('.status-select'));
    updateStats();
}

function toggleAllCheckboxes(source) { document.querySelectorAll('.select-check').forEach(chk => chk.checked = source.checked); }

function toggleDropdown(e, btn) { 
    e.stopPropagation(); 
    const menu = btn.nextElementSibling; 
    document.querySelectorAll('.dropdown-menu').forEach(m => { if(m !== menu) m.classList.remove('show'); }); 
    menu.classList.toggle('show'); 
}

async function handleBulkAction(action) {
    const selected = document.querySelectorAll('.select-check:checked');
    if (selected.length === 0) {
        Swal.fire({icon: 'info', text: 'يرجى تحديد العملاء أولاً', confirmButtonText: 'حسناً', confirmButtonColor: '#3b82f6'});
        return;
    }
    
    let companiesNames = [];
    selected.forEach(chk => {
        const name = chk.closest('tr').cells[2].querySelector('input').value;
        companiesNames.push(name && name.trim() !== "" ? name : "عميل جديد");
    });

    if (action === 'حذف') {
        const result = await Swal.fire({ title: 'تأكيد الحذف؟', text: "سيتم حذف العملاء المحددين نهائياً!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#94a3b8', confirmButtonText: 'نعم، احذف', cancelButtonText: 'إلغاء' });
        if (result.isConfirmed) {
            selected.forEach(chk => chk.closest('tr').remove());
            addToActivityLog('إجراء', '', `تنفيذ إجراء [حذف بيانات] لعدد (${selected.length}) من العملاء: [ ${companiesNames.join(' ، ')} ]`, '');
            saveAllDataSilently();
            updateStats();
            Swal.fire({icon: 'success', title: 'تم الحذف', showConfirmButton: false, timer: 1500});
        }
    } else if (action === 'تصدير') {
        exportToExcel(selected);
        addToActivityLog('إجراء', '', `تنفيذ إجراء [تصدير للإكسيل] لعدد (${selected.length}) من العملاء`, '');
    } else if (action === 'طباعة') {
        printSelected(selected);
        addToActivityLog('إجراء', '', `تنفيذ إجراء [طباعة] لعدد (${selected.length}) من العملاء`, '');
    } else {
        addToActivityLog('إجراء', '', `تنفيذ إجراء [${action}] لعدد (${selected.length}) من العملاء: [ ${companiesNames.join(' ، ')} ]`, '');
        Swal.fire({icon: 'success', title: 'تم', text: 'تم تنفيذ ' + action + ' بنجاح', showConfirmButton: false, timer: 1500});
    }
}

function exportToExcel(selectedRows) {
    let csvContent = "\uFEFF"; 
    csvContent += "رقم العميل,اسم المنشأة / الشركة,العنوان,السجل الرئيسي,الشخص المسؤول,رقم التواصل,البريد الإلكتروني,التصنيف,الحالة,تاريخ الإنشاء,المالك\n";
    
    selectedRows.forEach(chk => {
        const row = chk.closest('tr');
        const getVal = (index) => {
            let text = "";
            if(index === 1) text = row.cells[index].innerText;
            else {
                const input = row.cells[index].querySelector('input, select');
                text = input ? input.value : '';
            }
            return `"${text.replace(/"/g, '""')}"`; 
        };
        
        const rowData = [ getVal(1), getVal(2), getVal(3), getVal(4), getVal(5), getVal(6), getVal(7), getVal(8), getVal(9), getVal(11), getVal(12) ];
        csvContent += rowData.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "تقرير_العملاء_" + getTodayFormatted() + ".csv");
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
            <title>تقرير العملاء</title>
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
            <h2>تقرير العملاء (ASGate CRM)</h2>
            <table>
                <thead>
                    <tr>
                        <th>رقم العميل</th><th>الشركة</th><th>المسؤول</th><th>رقم التواصل</th>
                        <th>التصنيف</th><th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
    `;

    selectedRows.forEach(chk => {
        const row = chk.closest('tr');
        const getVal = (index) => {
            if(index === 1) return row.cells[index].innerText;
            return row.cells[index].querySelector('input, select')?.value || '';
        };
        html += `<tr>
            <td>${getVal(1)}</td>
            <td><strong>${getVal(2)}</strong></td>
            <td>${getVal(5)}</td>
            <td dir="ltr">${getVal(6)}</td>
            <td>${getVal(8)}</td>
            <td>${getVal(9)}</td>
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
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

function saveAllDataSilently() {
    const data = [];
    document.querySelectorAll('.main-row').forEach(row => {
        data.push({
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
        });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateStats();
}

function loadSavedData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) JSON.parse(saved).forEach(item => renderRow(item));
    renderActivityLog();
    updateStats();
}

function insertNewRow() { 
    renderRow({}, true); 
    saveAllDataSilently(); 
    document.querySelector('.table-wrapper').scrollTop = 0;
}

function filterTable() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    document.querySelectorAll('.main-row').forEach(r => {
        const idVal = r.cells[1].querySelector('.id-link').innerText.toLowerCase();
        const compVal = r.cells[2].querySelector('input').value.toLowerCase();
        const mainRecVal = r.cells[4].querySelector('input').value.toLowerCase();
        const contactVal = r.cells[5].querySelector('input').value.toLowerCase();
        const phoneVal = r.cells[6].querySelector('input').value.toLowerCase();
        const emailVal = r.cells[7].querySelector('input').value.toLowerCase();

        const isMatch = idVal.includes(q) || compVal.includes(q) || mainRecVal.includes(q) || contactVal.includes(q) || phoneVal.includes(q) || emailVal.includes(q);
        r.style.display = isMatch ? "" : "none";
    });
}

function getLastNoteOnly(fullJsonText) {
    if (!fullJsonText) return 'أضف ملاحظة...';
    try {
        const arr = JSON.parse(fullJsonText);
        if (arr.length === 0) return 'أضف ملاحظة...';
        return arr[arr.length - 1].text;
    } catch(e) { return 'أضف ملاحظة...'; }
}

function openNote(el) {
    currentActivePreview = el;
    const raw = el.getAttribute('data-full-notes') || "[]";
    let arr = [];
    try { arr = JSON.parse(raw); } catch(e) { arr = []; }
    
    let htmlContent = "";
    arr.forEach(msg => {
        htmlContent += `
            <div class="chat-msg-block">
                <span class="chat-msg-header"><span><i class="fas fa-user-circle"></i> ${msg.user}</span> <span style="font-weight: 600; color:#94a3b8; font-size:9px;">${msg.date} ${msg.time}</span></span>
                <span class="chat-msg-text">${msg.text}</span>
            </div>
        `;
    });
    
    document.getElementById('historyLog').innerHTML = htmlContent;
    document.getElementById('noteModal').style.display = "flex";
    document.getElementById('modalTextArea').focus();
}

function saveNote() {
    const txt = document.getElementById('modalTextArea').value.trim();
    if (txt && currentActivePreview) {
        const raw = currentActivePreview.getAttribute('data-full-notes') || "[]";
        let arr = [];
        try { arr = JSON.parse(raw); } catch(e) { arr = []; }
        
        const newMsg = {
            user: document.querySelector('.main-row').cells[12].querySelector('input').value || "أحمد",
            date: getTodayFormatted(),
            time: getTimeFormatted(),
            text: txt
        };
        arr.push(newMsg);
        
        currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr));
        currentActivePreview.innerText = txt;
        saveAllDataSilently();
    }
    closeNote();
}

function closeNote() { 
    document.getElementById('noteModal').style.display = "none"; 
    document.getElementById('modalTextArea').value = ""; 
}

window.onclick = (e) => {
    if (!e.target.matches('.btn-bulk-trigger') && !e.target.matches('.fa-chevron-down')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    }
};
