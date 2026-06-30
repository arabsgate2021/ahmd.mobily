/* ==========================================================
   1. المتغيرات والتعريفات الأساسية
   ========================================================== */
let currentActivePreview = null;
let searchTimeout;
const STORAGE_KEY = 'asgate_customers_final_v2'; 
const LOGS_KEY = 'asgate_customers_logs_v2';

/* ==========================================================
   2. الدالة الأساسية لبناء السطور المغلقة (renderRow) 
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
    const customerCode = v.code || "00001";

    // ميزة الأولوية للمفوض: إذا جرى تحديد خيار الأولوية ووجود بيانات للمفوض، يتم عرضها بدلاً من المسؤول الرئيسي
    const displayMgr = (v.delegatePriority && v.delegateName) ? v.delegateName : (v.mgr || '-');
    const displayMob = (v.delegatePriority && v.delegateMob) ? v.delegateMob : (v.mob || '-');
    const displayEmail = (v.delegatePriority && v.delegateEmail) ? v.delegateEmail : (v.email || '-');

    // تحديد كلاس التلوين الخاص بالتصنيف والحالة
    const classColorClass = getStyleClassForClassification(v.classification);
    const statusColorClass = getStyleClassForStatus(v.status);

    mainRow.innerHTML = `
        <td class="col-select"><input type="checkbox" class="select-check"></td>
        <td>
            <a href="customer-details.html?code=${customerCode}" class="code-link">${customerCode}</a>
            <input type="hidden" class="code-val" value="${customerCode}">
        </td>
        <td style="font-weight: 700; color: var(--text-dark);">${v.comp || '-'}</td>
        <td>${v.address || '-'}</td>
        <td style="${v.delegatePriority ? 'color: #4c1d95; font-weight: 700;' : ''}">${displayMgr} ${v.delegatePriority ? '<small style="font-size:9px; background:#e0e7ff; padding:1px 4px; border-radius:3px;">مفوض</small>' : ''}</td>
        <td>
            <div class="phone-cell-container">
                ${displayMob !== '-' ? `<a class="whatsapp-icon-btn" onclick="openWhatsAppChatForNumber('${displayMob}')" title="مراسلة عبر واتساب"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                <span>${displayMob}</span>
            </div>
        </td>
        <td>${displayEmail}</td>
        <td><span style="color:var(--text-muted); font-weight:700;">${creationDate}</span></td>
        <td>
            <span class="excel-input ${classColorClass}" style="display: inline-block; width: auto; padding: 2px 8px; border-radius: 4px; line-height: 1.6; font-weight: 800;">${v.classification || '-'}</span>
        </td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${notesJson.replace(/'/g, "&apos;")}' id="preview-${Date.now()}">${lastNoteText}</div></td>
        <td>
            <span class="excel-input ${statusColorClass}" style="display: inline-block; width: auto; padding: 2px 8px; border-radius: 4px; line-height: 1.6; font-weight: 800;">${v.status || '-'}</span>
        </td>
        <td>${v.owner || '-'}</td>
    `;

    if (prepend && tbody.firstChild) { tbody.insertBefore(mainRow, tbody.firstChild); } 
    else { tbody.appendChild(mainRow); }
}

function getStyleClassForClassification(val) {
    if (val === 'حكومي') return 'status-gov';
    if (val === 'مهم') return 'status-important';
    if (val === 'متوسط') return 'status-med';
    if (val === 'صغير') return 'status-small';
    return '';
}

function getStyleClassForStatus(val) {
    if (val === 'نشط') return 'status-active';
    if (val === 'غير نشط') return 'status-inactive';
    return '';
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

function deleteCustomerFromStorage(code) {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) return;
    try {
        let list = JSON.parse(rawData);
        list = list.filter(c => c.code !== code);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch(e) {}
}

async function handleBulkAction(action) {
    const selected = document.querySelectorAll('.select-check:checked');
    if (selected.length === 0) { Swal.fire({icon: 'info', text: 'يرجى تحديد صف واحد على الأقل', confirmButtonText: 'حسناً', confirmButtonColor: '#3b82f6'}); return; }
    
    if (action === 'حذف') {
        const result = await Swal.fire({ title: 'تأكيد الحذف؟', text: "سيتم حذف بيانات العملاء المحددة نهائياً!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#94a3b8', confirmButtonText: 'نعم، احذف', cancelButtonText: 'إلغاء' });
        if (result.isConfirmed) {
            selected.forEach(chk => { 
                const row = chk.closest('tr'); 
                const code = row.cells[1].querySelector('.code-val').value;
                const companyName = row.cells[2].textContent.trim();
                addToActivityLog('إجراء', 'حذف العميل', '', companyName); 
                deleteCustomerFromStorage(code);
                row.remove(); 
            });
            updateStats(); reorderRows(); Swal.fire({icon: 'success', title: 'تم الحذف', showConfirmButton: false, timer: 1500});
        }
    } else if (action === 'تصدير') {
        exportToExcel(selected); addToActivityLog('إجراء', 'تصدير بيانات للإكسيل', '', 'مجموعة محددة');
    } else if (action === 'طباعة') {
        printSelected(selected); addToActivityLog('إجراء', 'طباعة بيانات', '', 'مجموعة محددة');
    }
}

function exportToExcel(selectedRows) {
    let csvContent = "\uFEFFكود العميل,اسم الشركة,العنوان,تاريخ الانشاء,المالك\n";
    selectedRows.forEach(chk => {
        const row = chk.closest('tr');
        const code = row.cells[1].querySelector('.code-val').value;
        const comp = row.cells[2].textContent.trim();
        const addr = row.cells[3].textContent.trim();
        const date = row.cells[7].textContent.trim();
        const owner = row.cells[11].textContent.trim();
        csvContent += `"${code}","${comp}","${addr}","${date}","${owner}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "تقرير_العملاء_" + getTodayFormatted() + ".csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function printSelected(selectedRows) {
    let printWindow = window.open('', '_blank');
    let html = `<html dir="rtl"><head><title>تقرير العملاء</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"><style>body { font-family: 'Cairo', sans-serif; padding: 20px; color: #0f172a; } h2 { text-align: center; color: #4c1d95; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; } table { width: 100%; border-collapse: collapse; font-size: 12px; } th { background-color: #f1f5f9; color: #1e293b; padding: 10px; border: 1px solid #cbd5e1; font-weight: 700; } td { padding: 8px; border: 1px solid #cbd5e1; text-align: center; } tr:nth-child(even) { background-color: #f8fafc; }</style></head><body><h2>تقرير العملاء (ASGate CRM)</h2><table><thead><tr><th>الكود</th><th>الشركة</th><th>العنوان</th><th>التاريخ</th><th>المالك</th></tr></thead><tbody>`;
    selectedRows.forEach(chk => { 
        const row = chk.closest('tr'); 
        html += `<tr><td>${row.cells[1].querySelector('.code-val').value}</td><td><strong>${row.cells[2].textContent.trim()}</strong></td><td>${row.cells[3].textContent.trim()}</td><td>${row.cells[7].textContent.trim()}</td><td>${row.cells[11].textContent.trim()}</td></tr>`; 
    });
    html += `</tbody></table></body></html>`;
    printWindow.document.write(html); printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

function debouncedFilterTable() { clearTimeout(searchTimeout); searchTimeout = setTimeout(filterTable, 300); }
function filterTable() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    document.querySelectorAll('.main-row').forEach(row => {
        const text = Array.from(row.cells).slice(1, 12).map(c => c.textContent.trim().toLowerCase()).join(' ');
        if (text.includes(q)) { row.style.display = 'table-row'; } else { row.style.display = 'none'; }
    });
}

/* ==========================================================
   4. إدارة الملاحظات وحفظها في التخزين المباشر لضمان عدم الفقد
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
                </div>
                <div class="log-action" style="padding-right: 5px; color: #0f172a; font-size: 11px; font-weight: 700; white-space: pre-wrap;">${msg.text}</div>
            </div>
            `;
        }).join('') || '<div style="color:#64748b; text-align:center; font-size:10px; padding:20px; font-weight:700;">لا توجد ملاحظات سابقة</div>';
    }
    
    document.getElementById('noteModal').style.display = "flex";
    document.getElementById('modalTextArea').value = "";
    document.getElementById('modalTextArea').focus();
}

function saveNote() {
    const txt = document.getElementById('modalTextArea').value.trim();
    if (txt && currentActivePreview) {
        const mainRow = currentActivePreview.closest('.main-row');
        const code = mainRow.cells[1].querySelector('.code-val').value;
        const compName = mainRow.cells[2].textContent.trim();

        let arr = []; try { arr = JSON.parse(currentActivePreview.getAttribute('data-full-notes') || "[]"); } catch(e) {}
        let username = "المستخدم";
        const ownerText = mainRow.cells[11]?.textContent.trim();
        if (ownerText && ownerText !== '-') username = ownerText;

        arr.push({ user: username, date: getTodayFormatted(), time: getTimeFormatted(), text: txt });
        
        // تحديث مصفوفة التخزين المحلي مباشرة دون الاعتماد على مسح الـ Inputs
        const rawData = localStorage.getItem(STORAGE_KEY);
        if (rawData) {
            try {
                let list = JSON.parse(rawData);
                const idx = list.findIndex(c => c.code === code);
                if (idx !== -1) {
                    list[idx].notes = JSON.stringify(arr);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
                }
            } catch(e) {}
        }

        currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr)); 
        currentActivePreview.innerText = txt;
        addToActivityLog('الملاحظات', 'إضافة ملاحظة جديدة', txt, compName);
    }
    closeNote();
}

function closeNote() { document.getElementById('noteModal').style.display = "none"; }

/* ==========================================================
   5. العمليات التشغيلية والألوان المساعدة
   ========================================================== */
function toggleLogExpansion() { const logSection = document.getElementById('activityLogSection'); const toggleBtn = document.getElementById('toggleExpandBtn'); if (logSection.classList.contains('expanded')) { logSection.classList.remove('expanded'); toggleBtn.innerHTML = '<i class="fas fa-expand-alt"></i>'; } else { logSection.classList.add('expanded'); toggleBtn.innerHTML = '<i class="fas fa-compress-alt"></i>'; } }

function loadSavedData() { 
    const rawData = localStorage.getItem(STORAGE_KEY); 
    const tbody = document.getElementById('tableBody'); 
    if (!tbody) return; 
    tbody.innerHTML = ''; 
    if (rawData) { JSON.parse(rawData).forEach(v => renderRow(v, false)); } 
    reorderRows(); updateStats(); renderActivityLog(); 
}

function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }
function getLastNoteOnlyFromJSON(jsonStr) { try { const arr = JSON.parse(jsonStr); return arr.length > 0 ? arr[arr.length - 1].text : "أضف ملاحظة..."; } catch(e) { return "أضف ملاحظة..."; } }

function reorderRows() { 
    const tbody = document.getElementById('tableBody'); if (!tbody) return; 
    const rows = Array.from(tbody.querySelectorAll('.main-row')); 
    const today = getTodayFormatted(), currentMonth = today.substring(0, 7); 
    const rowsData = rows.map(row => ({ row: row, date: row.querySelector('.col-date span')?.textContent || row.cells[7].textContent || '9999-12-31' })); 
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
    const rawData = localStorage.getItem(STORAGE_KEY);
    let total = 0, tDay = 0, tMonth = 0;
    if (rawData) {
        const list = JSON.parse(rawData);
        total = list.length;
        const today = getTodayFormatted(), currentMonth = today.substring(0, 7);
        list.forEach(c => {
            if (c.creationDate === today) tDay++;
            if (c.creationDate && c.creationDate.startsWith(currentMonth)) tMonth++;
        });
    }
    if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total; 
    if (document.getElementById('stat-today')) document.getElementById('stat-today').innerText = tDay; 
    if (document.getElementById('stat-month')) document.getElementById('stat-month').innerText = tMonth; 
}

function addToActivityLog(fieldName, oldVal, newVal, companyName) { 
    if (oldVal === newVal) return; 
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; 
    const d = new Date(); 
    let dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear(); 
    const dayName = days[d.getDay()]; const timeStr = getTimeFormatted();
    const cleanCompany = companyName || 'شركة غير مسماة'; 
    let actionText = fieldName === 'إجراء' ? `${oldVal} ( ${cleanCompany} )` : `تعديل ${fieldName} للعميل ( ${cleanCompany} )`; 
    
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
    logs.unshift(fullLogHTML); localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100))); 
    renderActivityLog(); 
}

function renderActivityLog() { const list = document.getElementById('activityList'); if (!list) return; const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]'); list.innerHTML = logs.join(''); }

function openWhatsAppChatForNumber(rawPhone) {
    if (!rawPhone || rawPhone === '-') return;
    let cleanNumber = rawPhone.replace(/\D/g, '');
    if (cleanNumber.startsWith('00966')) cleanNumber = cleanNumber.substring(2);
    else if (cleanNumber.startsWith('05')) cleanNumber = '966' + cleanNumber.substring(1);
    else if (cleanNumber.startsWith('5') && cleanNumber.length === 9) cleanNumber = '966' + cleanNumber;
    window.open("https://wa.me/" + cleanNumber, '_blank');
}
