let currentActivePreview = null;
let currentAttachmentName = null; 
const LOGS_KEY = 'asgate_general_sales_logs';
const CUSTOMERS_STORAGE_KEY = 'asgate_customers_v2_final'; 
const VISITS_LOGS_KEY = 'asgate_general_visits_logs'; // مفتاح سجل نشاطات الزيارات
let saveTimeout;

// تشغيل دالة التهيئة عند اكتمال تحميل الصفحة
document.addEventListener('DOMContentLoaded', initPage);

function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }

function initPage() {
    initStatsVisibility();
    
    // التحقق من الصفحة الحالية لتشغيل الدالة المناسبة
    if (document.getElementById('salesBody')) {
        loadSalesFromStorage();
    } else if (document.getElementById('visitsBody')) {
        loadVisitsFromStorage();
    }
}

function toggleStatsVisibility() {
    const container = document.getElementById('statsContainer');
    const btn = document.getElementById('eyeToggleBtn');
    if (!container || !btn) return;
    const isHidden = container.classList.toggle('blur-active');
    
    if (isHidden) {
        btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        localStorage.setItem('asgate_sales_stats_hidden', 'true');
    } else {
        btn.innerHTML = '<i class="fas fa-eye"></i>';
        localStorage.setItem('asgate_sales_stats_hidden', 'false');
    }
}

function initStatsVisibility() {
    const container = document.getElementById('statsContainer');
    const btn = document.getElementById('eyeToggleBtn');
    if (!container || !btn) return;
    
    const isHidden = localStorage.getItem('asgate_sales_stats_hidden') === 'true';
    if (isHidden) {
        container.classList.add('blur-active');
        btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    }
}

function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (document.getElementById('salesBody')) {
            autoSave();
        } else if (document.getElementById('visitsBody')) {
            autoSaveVisits();
        }
    }, 500);
}

function toggleGeneralLogHeight() {
    const section = document.getElementById('generalActivityLogSection');
    const btn = document.getElementById('toggleGeneralLogBtn');
    if (!section || !btn) return;
    if (section.classList.contains('expanded')) {
        section.classList.remove('expanded');
        btn.innerHTML = '<i class="fas fa-expand-alt"></i>';
    } else {
        section.classList.add('expanded');
        btn.innerHTML = '<i class="fas fa-compress-alt"></i>';
    }
}

function generateCustomOrderId() {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2); 
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    const prefix = year + month; 
    const saved = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
    let maxSequence = 0;
    saved.forEach(item => {
        const idStr = String(item.id);
        if (idStr.startsWith(prefix) && idStr.length === 8) {
            const seq = parseInt(idStr.slice(4), 10);
            if (seq > maxSequence) maxSequence = seq;
        }
    });
    return prefix + String(maxSequence + 1).padStart(4, '0');
}

function updateHeaderStats() {
    if (!document.getElementById('salesBody')) return;
    const saved = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
    const currentMonthStr = getTodayFormatted().substring(0, 7);
    
    let totalComp = 0, totalPend = 0, monthCount = 0;
    let monthComp = 0, monthPend = 0;
    
    saved.forEach(item => {
        const sums = calculateOrderSums(item.id);
        totalComp += sums.completed; 
        totalPend += sums.pending;
        
        if (item.date && item.date.startsWith(currentMonthStr)) {
            monthCount++;
            monthComp += sums.completed;
            monthPend += sums.pending;
        }
    });
    
    document.getElementById('count-total').innerText = saved.length;
    document.getElementById('month-count').innerText = monthCount;
    
    document.getElementById('sum-completed').innerText = totalComp.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('sum-pending').innerText = totalPend.toLocaleString('en-US', {minimumFractionDigits: 2});
    
    document.getElementById('month-completed').innerText = monthComp.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('month-pending').innerText = monthPend.toLocaleString('en-US', {minimumFractionDigits: 2});
}

function calculateOrderSums(orderId) {
    const productsDb = JSON.parse(localStorage.getItem('asgate_products_db') || '{}');
    const products = productsDb[orderId] || [];
    let completed = 0, pending = 0;
    products.forEach(p => {
        const lineTotal = (parseFloat(p.qty) || 0) * (parseFloat(String(p.sub).replace(/[^\d.]/g, '')) || 0);
        if (p.status === "مكتمل") completed += lineTotal;
        if (p.status === "معلق") pending += lineTotal;
    });
    return { completed, pending };
}

function renderTableRow(obj) {
    const tbody = document.getElementById('salesBody');
    if (!tbody) return;
    const sums = calculateOrderSums(obj.id);
    const row = tbody.insertRow(-1);
    row.className = 'main-row';
    row.id = `row-${obj.id}`;
    
    if (obj.status === "فقدان") row.classList.add('lost-row');
    
    row.innerHTML = `
        <td><input type="checkbox" class="select-check"></td>
        <td><a href="order_details.html?id=${obj.id}" class="order-link" title="فتح التفاصيل">#${obj.id}</a></td>
        <td><input type="text" class="excel-input" value="${obj.type || ''}" data-old="${obj.type || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('اسم الطلب', this, '${obj.comp}', '${obj.id}')"></td>
        <td><input type="text" class="excel-input readonly-input" value="${obj.date}" readonly></td>
        <td><input type="text" class="excel-input" value="${obj.comp || ''}" data-old="${obj.comp || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('الشركة', this, '${obj.comp}', '${obj.id}')"></td>
        <td><input type="text" class="excel-input" value="${obj.cr || ''}" data-old="${obj.cr || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('السجل', this, '${obj.comp}', '${obj.id}')"></td>
        <td>
            <select class="excel-input status-select ${getStatusClass(obj.status)}" data-old="${obj.status || 'معلق'}" onchange="handleStatusChange(this, '${obj.id}', '${obj.comp}')">
                <option value="مكتمل" ${obj.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                <option value="معلق" ${obj.status === 'معلق' ? 'selected' : ''}>معلق</option>
                <option value="فقدان" ${obj.status === 'فقدان' ? 'selected' : ''}>فقدان</option>
            </select>
        </td>
        <td><input type="text" class="excel-input readonly-input stat-success" value="${sums.completed.toFixed(2)}" readonly style="color:var(--success); font-weight:800; background:none;"></td>
        <td><input type="text" class="excel-input readonly-input stat-warning" value="${sums.pending.toFixed(2)}" readonly style="color:var(--danger); font-weight:800; background:none;"></td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${(obj.notes || '[]').replace(/'/g, "&apos;")}' title="عرض الملاحظات">${getLastNoteOnly(obj.notes || "[]")}</div></td>
        <td><input type="text" class="excel-input readonly-input last-mod-field" value="${obj.lastModifiedDate || '---'}" readonly></td>
        <td><input type="text" class="excel-input" value="${obj.owner || 'أحمد'}" data-old="${obj.owner || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('المالك', this, '${obj.comp}', '${obj.id}')"></td>
    `;
}

function getStatusClass(status) {
    if(status === 'مكتمل' || status === 'ناجحة') return 'status-complete';
    if(status === 'فقدان' || status === 'غير ناجحة') return 'status-lost-badge';
    return 'status-pending';
}

function handleStatusChange(el, orderId, company) {
    const val = el.value; const oldVal = el.dataset.old;
    const row = el.closest('tr');
    
    el.className = `excel-input status-select ${getStatusClass(val)}`;
    
    if (val === "فقدان") row.classList.add('lost-row');
    else row.classList.remove('lost-row');
    
    addGeneralLog('الحالة', oldVal, val, company, `تغيير حالة الطلب #${orderId}`);
    updateDateField(el);
    el.dataset.old = val;
    debouncedSave();
}

function updateDateField(inputElement) {
    const row = inputElement.closest('tr');
    if (!row) return;
    const modField = row.querySelector('.last-mod-field');
    if (modField) modField.value = getTodayFormatted();
}

function logEdit(fieldName, el, comp, id) {
    const newVal = el.value; const oldVal = el.dataset.old;
    if(newVal !== oldVal) {
        addGeneralLog(fieldName, oldVal, newVal, comp, `تعديل ${fieldName} للطلب #${id}`);
        el.dataset.old = newVal;
    }
}

function autoSave() {
    const rows = document.querySelectorAll('#salesBody .main-row');
    if (rows.length === 0 && !document.getElementById('salesBody')) return;
    const salesData = Array.from(rows).map(r => ({
        id: r.cells[1].innerText.replace('#', '').trim(),
        type: r.cells[2].querySelector('input').value,
        date: r.cells[3].querySelector('input').value,
        comp: r.cells[4].querySelector('input').value,
        cr: r.cells[5].querySelector('input').value,
        status: r.cells[6].querySelector('select').value,
        notes: r.cells[9].querySelector('.notes-preview').getAttribute('data-full-notes'),
        lastModifiedDate: r.cells[10].querySelector('input').value === '---' ? '' : r.cells[10].querySelector('input').value,
        owner: r.cells[11].querySelector('input').value
    }));
    localStorage.setItem('asgate_sales_db', JSON.stringify(salesData));
    updateHeaderStats();
}

// Modal Orders Functions
function openOrderModal() { document.getElementById('orderModal').style.display = 'flex'; }
function closeOrderModal() { document.getElementById('orderModal').style.display = 'none'; document.getElementById('mSearchField').value = ''; if(document.getElementById('mType')) document.getElementById('mType').value = ''; }

function searchCustomerInModal(el) {
    const query = el.value.toLowerCase().trim();
    const resDiv = document.getElementById('mResults');
    const customers = JSON.parse(localStorage.getItem(CUSTOMERS_STORAGE_KEY) || '[]');
    if (query.length < 1) { resDiv.style.display='none'; return; }
    const filtered = customers.filter(c => (c.comp || "").toLowerCase().includes(query) || (c.mainRecord || "").includes(query));
    resDiv.innerHTML = filtered.map(c => `<div onclick="selectCustomer('${c.comp}', '${c.mainRecord}')"><i class="far fa-building"></i> ${c.comp} - ${c.mainRecord}</div>`).join('');
    resDiv.style.display = filtered.length ? 'block' : 'none';
}

function selectCustomer(comp, cr) {
    document.getElementById('mComp').value = comp;
    document.getElementById('mCr').value = cr;
    document.getElementById('mSearchField').value = comp;
    document.getElementById('mResults').style.display = 'none';
}

function addOrderRow() {
    const comp = document.getElementById('mComp').value;
    if (!comp) { Swal.fire({icon: 'warning', title: 'خطأ', text: 'يرجى اختيار شركة من نتائج البحث', confirmButtonColor: '#3b82f6'}); return; }
    const data = {
        id: generateCustomOrderId(),
        type: document.getElementById('mType').value || '-',
        date: getTodayFormatted(),
        comp: comp, cr: document.getElementById('mCr').value,
        status: "معلق", notes: "[]", lastModifiedDate: getTodayFormatted(), owner: "أحمد"
    };
    let saved = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
    saved.unshift(data);
    localStorage.setItem('asgate_sales_db', JSON.stringify(saved));
    addGeneralLog('إجراء', '', '', comp, `تم إنشاء طلب جديد #${data.id}`);
    loadSalesFromStorage();
    closeOrderModal();
    Swal.fire({icon: 'success', title: 'تم', text: 'تم إنشاء الطلب بنجاح', showConfirmButton: false, timer: 1500});
}

// Notes & Attachments Logic
function getLastNoteOnly(jsonStr) {
    try { const arr = JSON.parse(jsonStr); return arr.length > 0 ? arr[arr.length - 1].text.split('\n')[0] : 'أضف ملاحظة...'; } 
    catch(e) { return 'أضف ملاحظة...'; }
}

function handleFileSelect(input) {
    if (input.files && input.files[0]) {
        currentAttachmentName = input.files[0].name;
        document.getElementById('fileNameDisplay').innerText = currentAttachmentName;
        document.getElementById('filePreviewContainer').style.display = 'block';
    }
}

function removeAttachment() {
    currentAttachmentName = null;
    const fileInput = document.getElementById('modalFileAttachment');
    if(fileInput) fileInput.value = '';
    const previewContainer = document.getElementById('filePreviewContainer');
    if(previewContainer) previewContainer.style.display = 'none';
}

function openNote(el) {
    currentActivePreview = el; 
    const raw = el.getAttribute('data-full-notes') || "[]"; let arr = []; 
    try { arr = JSON.parse(raw); } catch(e) { arr = []; }
    let htmlContent = arr.map(msg => `<div class="chat-msg-block"><span class="chat-msg-header"><span><i class="fas fa-user-circle"></i> ${msg.user}</span> <span style="font-weight: 600; color:#94a3b8; font-size:9px;">${msg.date} ${msg.time}</span></span><span class="chat-msg-text">${msg.text}</span></div>`).join('');
    document.getElementById('historyLog').innerHTML = htmlContent;
    document.getElementById('noteModal').style.display = "flex";
    document.getElementById('modalTextArea').focus();
}

function saveNote() {
    const txt = document.getElementById('modalTextArea').value.trim();
    
    if ((txt || currentAttachmentName) && currentActivePreview) {
        const raw = currentActivePreview.getAttribute('data-full-notes') || "[]"; let arr = []; 
        try { arr = JSON.parse(raw); } catch(e) { arr = []; }
        
        let finalNoteText = txt;
        if (currentAttachmentName) {
            finalNoteText += (txt ? '\n' : '') + `📁 مرفق: ${currentAttachmentName}`;
        }

        // جلب اسم المسؤول بناء على مكانه في الجدول (مبيعات أو زيارات)
        const row = currentActivePreview.closest('tr');
        let ownerName = "النظام";
        const ownerInput = row.querySelector('.owner-field') || row.cells[row.cells.length - 1].querySelector('input');
        if (ownerInput) ownerName = ownerInput.value;

        arr.push({ user: ownerName, date: getTodayFormatted(), time: getTimeFormatted(), text: finalNoteText });
        currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr));
        currentActivePreview.innerText = finalNoteText.split('\n')[0]; 
        updateDateField(currentActivePreview);
        debouncedSave();
    }
    closeNote();
}

function closeNote() { 
    document.getElementById('noteModal').style.display = "none"; 
    document.getElementById('modalTextArea').value = ""; 
    removeAttachment();
}

// Table & Logs Functions
function filterSalesTable() {
    const q = document.getElementById('globalSearch').value.toLowerCase();
    const bodyId = document.getElementById('salesBody') ? '#salesBody .main-row' : '#visitsBody .main-row';
    document.querySelectorAll(bodyId).forEach(row => {
        const rowText = row.innerText.toLowerCase();
        const inputsText = Array.from(row.querySelectorAll('input, select')).map(i => i.value.toLowerCase()).join(' ');
        row.style.display = (rowText.includes(q) || inputsText.includes(q)) ? "table-row" : "none";
    });
}

function toggleAllCheckboxes(master) { document.querySelectorAll('.select-check').forEach(c => c.checked = master.checked); }
function toggleDropdown(e, btn) { e.stopPropagation(); const menu = btn.nextElementSibling; document.querySelectorAll('.dropdown-menu').forEach(m => { if(m !== menu) m.classList.remove('show'); }); menu.classList.toggle('show'); }

async function handleBulkAction(action) {
    const selected = document.querySelectorAll('.select-check:checked');
    if (selected.length === 0) { Swal.fire({icon: 'info', text: 'يرجى تحديد صف واحد على الأقل', confirmButtonColor: '#3b82f6'}); return; }
    
    const isSales = !!document.getElementById('salesBody');
    
    if (action === 'حذف') {
        const result = await Swal.fire({ title: 'تأكيد الحذف؟', text: isSales ? "سيتم حذف الطلبات المحددة نهائياً!" : "سيتم حذف الزيارات المحددة نهائياً!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#94a3b8', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء' });
        if (result.isConfirmed) {
            selected.forEach(chk => { 
                const row = chk.closest('tr'); 
                const compName = row.cells[isSales ? 4 : 1].querySelector('input').value;
                if(isSales) {
                    addGeneralLog('إجراء', '', '', compName, 'تم حذف الطلب'); 
                } else {
                    addVisitsLog('إجراء', '', '', compName, 'تم حذف الزيارة');
                }
                row.remove(); 
            });
            debouncedSave(); Swal.fire({icon: 'success', title: 'تم الحذف', showConfirmButton: false, timer: 1500});
        }
    } else {
        Swal.fire({icon: 'success', title: 'تم', text: `تم تنفيذ إجراء [${action}] على ${selected.length} صف`, showConfirmButton: false, timer: 1500});
    }
}

function addGeneralLog(field, old, newVal, comp, actionText) {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    const d = new Date(); const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const fullLogHTML = `<span style="color: #94a3b8; font-size: 9px;"><i class="fas fa-clock"></i> ${days[d.getDay()]} ${getTodayFormatted()} ${getTimeFormatted()}</span> &nbsp;|&nbsp; <span style="color: #1e293b; font-weight: 700;">${actionText} ( ${comp} )</span>`;
    logs.unshift(fullLogHTML);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
    renderGeneralLogs();
}

function renderGeneralLogs() {
    const container = document.getElementById('activityLogs');
    if (!container) return;
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    container.innerHTML = logs.map(l => `<div class="activity-item">${l}</div>`).join('');
}

function loadSalesFromStorage() {
    const saved = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
    document.getElementById('salesBody').innerHTML = "";
    saved.forEach(item => renderTableRow(item));
    updateHeaderStats();
    renderGeneralLogs();
}

// إغلاق القوائم المنسدلة عند الضغط في أي مكان خارجها
window.onclick = e => { 
    if (!e.target.matches('.btn-bulk-trigger') && !e.target.matches('.fa-chevron-down')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show')); 
    }
};


/* ==========================================================================
   أكواد مخصصة لصفحة الزيارات الجديدة (Visits Dashboard)
   ========================================================================== */

function loadVisitsFromStorage() {
    const saved = JSON.parse(localStorage.getItem('asgate_visits_db') || '[]');
    document.getElementById('visitsBody').innerHTML = "";
    saved.forEach(item => renderVisitRow(item));
    updateVisitsStats();
    renderVisitsLogs();
}

function renderVisitRow(obj) {
    const tbody = document.getElementById('visitsBody');
    if (!tbody) return;
    const row = tbody.insertRow(-1);
    row.className = 'main-row';
    row.id = `visit-${obj.id}`;
    
    if (obj.status === "غير ناجحة") row.classList.add('lost-row');
    
    row.innerHTML = `
        <td><input type="checkbox" class="select-check"></td>
        <td><input type="text" class="excel-input" value="${obj.comp || ''}" data-old="${obj.comp || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logVisitEdit('الشركة', this, '${obj.comp}', '${obj.id}')"></td>
        <td><input type="text" class="excel-input" value="${obj.address || ''}" data-old="${obj.address || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logVisitEdit('العنوان', this, '${obj.comp}', '${obj.id}')"></td>
        <td><input type="text" class="excel-input" value="${obj.manager || ''}" data-old="${obj.manager || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logVisitEdit('المدير', this, '${obj.comp}', '${obj.id}')"></td>
        <td>
            <div class="phone-cell-container">
                <a href="https://wa.me/${obj.phone || ''}" target="_blank" class="whatsapp-icon-btn" title="مراسلة واتساب"><i class="fab fa-whatsapp"></i></a>
                <input type="text" class="excel-input" value="${obj.phone || ''}" data-old="${obj.phone || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logVisitEdit('الجوال', this, '${obj.comp}', '${obj.id}')" style="direction:ltr; text-align:center;">
            </div>
        </td>
        <td><input type="text" class="excel-input" value="${obj.email || ''}" data-old="${obj.email || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logVisitEdit('البريد', this, '${obj.comp}', '${obj.id}')"></td>
        <td><input type="text" class="excel-input" value="${obj.cr || ''}" data-old="${obj.cr || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logVisitEdit('السجل', this, '${obj.comp}', '${obj.id}')"></td>
        <td><input type="text" class="excel-input readonly-input" value="${obj.date || ''}" readonly></td>
        <td><input type="text" class="excel-input" value="${obj.service || ''}" data-old="${obj.service || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logVisitEdit('الخدمة', this, '${obj.comp}', '${obj.id}')"></td>
        <td><input type="number" class="excel-input visit-val-input" value="${obj.val || '0'}" data-old="${obj.val || '0'}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logVisitEdit('القيمة الكترونية', this, '${obj.comp}', '${obj.id}')"></td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${(obj.notes || '[]').replace(/'/g, "&apos;")}' title="عرض الملاحظات">${getLastNoteOnly(obj.notes || "[]")}</div></td>
        <td>
            <select class="excel-input status-select ${getStatusClass(obj.status)}" data-old="${obj.status || 'معلق'}" onchange="handleVisitStatusChange(this, '${obj.id}', '${obj.comp}')">
                <option value="معلق" ${obj.status === 'معلق' ? 'selected' : ''}>معلق</option>
                <option value="ناجحة" ${obj.status === 'ناجحة' ? 'selected' : ''}>ناجحة</option>
                <option value="غير ناجحة" ${obj.status === 'غير ناجحة' ? 'selected' : ''}>غير ناجحة</option>
            </select>
        </td>
        <td><input type="text" class="excel-input readonly-input last-mod-field" value="${obj.lastModifiedDate || '---'}" readonly></td>
        <td><input type="text" class="excel-input owner-field" value="${obj.owner || 'أحمد'}" data-old="${obj.owner || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logVisitEdit('المنفذ', this, '${obj.comp}', '${obj.id}')"></td>
    `;
}

function handleVisitStatusChange(el, visitId, company) {
    const val = el.value; const oldVal = el.dataset.old;
    const row = el.closest('tr');
    el.className = `excel-input status-select ${getStatusClass(val)}`;
    
    if (val === "غير ناجحة") row.classList.add('lost-row');
    else row.classList.remove('lost-row');
    
    addVisitsLog('الحالة', oldVal, val, company, `تغيير حالة الزيارة`);
    updateDateField(el);
    el.dataset.old = val;
    debouncedSave();
}

function logVisitEdit(fieldName, el, comp, id) {
    const newVal = el.value; const oldVal = el.dataset.old;
    if(newVal !== oldVal) {
        addVisitsLog(fieldName, oldVal, newVal, comp, `تعديل ${fieldName}`);
        el.dataset.old = newVal;
    }
}

function autoSaveVisits() {
    const rows = document.querySelectorAll('#visitsBody .main-row');
    if (rows.length === 0 && !document.getElementById('visitsBody')) return;
    const visitsData = Array.from(rows).map((r, index) => ({
        id: r.id.replace('visit-', '').trim() || 'v_' + Date.now() + '_' + index,
        comp: r.cells[1].querySelector('input').value,
        address: r.cells[2].querySelector('input').value,
        manager: r.cells[3].querySelector('input').value,
        phone: r.cells[4].querySelector('input').value,
        email: r.cells[5].querySelector('input').value,
        cr: r.cells[6].querySelector('input').value,
        date: r.cells[7].querySelector('input').value,
        service: r.cells[8].querySelector('input').value,
        val: r.cells[9].querySelector('input').value,
        notes: r.cells[10].querySelector('.notes-preview').getAttribute('data-full-notes'),
        status: r.cells[11].querySelector('select').value,
        lastModifiedDate: r.cells[12].querySelector('input').value === '---' ? '' : r.cells[12].querySelector('input').value,
        owner: r.cells[13].querySelector('input').value
    }));
    localStorage.setItem('asgate_visits_db', JSON.stringify(visitsData));
    updateVisitsStats();
}

function addVisitRowFromModal() {
    const comp = document.getElementById('mComp').value;
    if (!comp) { Swal.fire({icon: 'warning', title: 'خطأ', text: 'يرجى اختيار شركة من نتائج البحث', confirmButtonColor: '#3b82f6'}); return; }
    
    const data = {
        id: 'v_' + Date.now(),
        comp: comp,
        address: '-',
        manager: '-',
        phone: '-',
        email: '-',
        cr: document.getElementById('mCr').value || '-',
        date: getTodayFormatted(),
        service: '-',
        val: '0',
        status: "معلق", notes: "[]", lastModifiedDate: getTodayFormatted(), owner: "أحمد"
    };
    
    let saved = JSON.parse(localStorage.getItem('asgate_visits_db') || '[]');
    saved.unshift(data);
    localStorage.setItem('asgate_visits_db', JSON.stringify(saved));
    addVisitsLog('إجراء', '', '', comp, `تم تسجيل زيارة جديدة لشركة`);
    loadVisitsFromStorage();
    closeOrderModal();
    Swal.fire({icon: 'success', title: 'تم', text: 'تم تسجيل الزيارة بنجاح', showConfirmButton: false, timer: 1500});
}

function updateVisitsStats() {
    if (!document.getElementById('visitsBody')) return;
    const saved = JSON.parse(localStorage.getItem('asgate_visits_db') || '[]');
    const currentMonthStr = getTodayFormatted().substring(0, 7);
    
    let totalVisits = saved.length;
    let monthVisits = 0;
    
    saved.forEach(item => {
        if (item.date && item.date.startsWith(currentMonthStr)) {
            monthVisits++;
        }
    });
    
    const totalCountEl = document.getElementById('visit-count-total');
    const monthCountEl = document.getElementById('visit-month-count');
    
    if(totalCountEl) totalCountEl.innerText = totalVisits;
    if(monthCountEl) monthCountEl.innerText = monthVisits;
}

function addVisitsLog(field, old, newVal, comp, actionText) {
    const logs = JSON.parse(localStorage.getItem(VISITS_LOGS_KEY) || '[]');
    const d = new Date(); const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const fullLogHTML = `<span style="color: #94a3b8; font-size: 9px;"><i class="fas fa-clock"></i> ${days[d.getDay()]} ${getTodayFormatted()} ${getTimeFormatted()}</span> &nbsp;|&nbsp; <span style="color: #1e293b; font-weight: 700;">${actionText} ( ${comp} )</span>`;
    logs.unshift(fullLogHTML);
    localStorage.setItem(VISITS_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
    renderVisitsLogs();
}

function renderVisitsLogs() {
    const container = document.getElementById('activityLogs');
    if (!container || !document.getElementById('visitsBody')) return;
    const logs = JSON.parse(localStorage.getItem(VISITS_LOGS_KEY) || '[]');
    container.innerHTML = logs.map(l => `<div class="activity-item">${l}</div>`).join('');
}
