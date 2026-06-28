let currentActivePreview = null;
let currentAttachmentName = null; // لتخزين اسم المرفق مؤقتاً
const LOGS_KEY = 'asgate_general_sales_logs';
const CUSTOMERS_STORAGE_KEY = 'asgate_customers_final_v1'; // تم تحديث مفتاح الحفظ ليتطابق مع صفحة العملاء
let saveTimeout;

function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }

function initPage() {
    initStatsVisibility();
    loadSalesFromStorage();
}

function toggleStatsVisibility() {
    const container = document.getElementById('statsContainer');
    const btn = document.getElementById('eyeToggleBtn');
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
    const isHidden = localStorage.getItem('asgate_sales_stats_hidden') === 'true';
    if (isHidden) {
        document.getElementById('statsContainer').classList.add('blur-active');
        document.getElementById('eyeToggleBtn').innerHTML = '<i class="fas fa-eye-slash"></i>';
    }
}

function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        autoSave();
    }, 500);
}

function toggleGeneralLogHeight() {
    const section = document.getElementById('generalActivityLogSection');
    const btn = document.getElementById('toggleGeneralLogBtn');
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
    const sums = calculateOrderSums(obj.id);
    const row = tbody.insertRow(-1);
    row.className = 'main-row';
    row.id = `row-${obj.id}`;
    
    if (obj.status === "فقدان") row.classList.add('lost-row');
    
    row.innerHTML = `
        <td><input type="checkbox" class="select-check"></td>
        <td><a href="order_details.html?id=${obj.id}" class="order-link" title="فتح التفاصيل">#${obj.id}</a></td>
        <td><input type="text" class="excel-input" value="${obj.type || ''}" data-old="${obj.type || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('اسم الطلب', this, '${obj.comp}', '${obj.id}')"></td>
        <td><input type="text" class="excel-input readonly-input" value="${obj.date}" readonly style="color:var(--text-muted); font-weight:700;"></td>
        <td><input type="text" class="excel-input" value="${obj.comp || ''}" data-old="${obj.comp || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('الشركة', this, '${obj.comp}', '${obj.id}')"></td>
        <td><input type="text" class="excel-input" value="${obj.cr || ''}" data-old="${obj.cr || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('السجل', this, '${obj.comp}', '${obj.id}')"></td>
        <td>
            <select class="excel-input status-select ${getStatusClass(obj.status)}" data-old="${obj.status || 'معلق'}" onchange="handleStatusChange(this, '${obj.id}', '${obj.comp}')">
                <option value="مكتمل" ${obj.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                <option value="معلق" ${obj.status === 'معلق' ? 'selected' : ''}>معلق</option>
                <option value="فقدان" ${obj.status === 'فقدان' ? 'selected' : ''}>فقدان</option>
            </select>
        </td>
        <td><input type="text" class="excel-input readonly-input" value="${sums.completed.toFixed(2)}" readonly style="color:var(--success); font-weight:800;"></td>
        <td><input type="text" class="excel-input readonly-input" value="${sums.pending.toFixed(2)}" readonly style="color:var(--danger); font-weight:800;"></td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${(obj.notes || '[]').replace(/'/g, "&apos;")}' title="عرض الملاحظات">${getLastNoteOnly(obj.notes || "[]")}</div></td>
        <td><input type="text" class="excel-input readonly-input last-mod-field" value="${obj.lastModifiedDate || '---'}" readonly style="color:var(--text-muted); font-weight:700;"></td>
        <td><input type="text" class="excel-input" value="${obj.owner || 'أحمد'}" data-old="${obj.owner || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('المالك', this, '${obj.comp}', '${obj.id}')"></td>
    `;
}

function getStatusClass(status) {
    if(status === 'مكتمل') return 'status-complete';
    if(status === 'فقدان') return 'status-lost-badge';
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
function closeOrderModal() { document.getElementById('orderModal').style.display = 'none'; document.getElementById('mSearchField').value = ''; document.getElementById('mType').value = ''; }

function searchCustomerInModal(el) {
    const query = el.value.toLowerCase().trim();
    const resDiv = document.getElementById('mResults');
    const customers = JSON.parse(localStorage.getItem(CUSTOMERS_STORAGE_KEY) || '[]');
    if (query.length < 1) { resDiv.style.display='none'; return; }
    
    // تم التحديث هنا للبحث باستخدام c.record
    const filtered = customers.filter(c => (c.comp || "").toLowerCase().includes(query) || (c.record || "").includes(query));
    
    // تم التحديث هنا لعرض النتائج وتمرير السجل بشكل صحيح
    resDiv.innerHTML = filtered.map(c => `<div onclick="selectCustomer('${c.comp || ''}', '${c.record || ''}')"><i class="far fa-building"></i> ${c.comp || 'بدون اسم'} - ${c.record || 'بدون سجل'}</div>`).join('');
    resDiv.style.display = filtered.length ? 'block' : 'none';
}

function selectCustomer(comp, record) { // تم تغيير اسم المتغير إلى record
    document.getElementById('mComp').value = comp;
    document.getElementById('mCr').value = record; // تمرير قيمة السجل الصحيحة
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
    document.getElementById('modalFileAttachment').value = '';
    document.getElementById('filePreviewContainer').style.display = 'none';
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

        arr.push({ user: currentActivePreview.closest('tr').cells[11].querySelector('input').value || "النظام", date: getTodayFormatted(), time: getTimeFormatted(), text: finalNoteText });
        currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr));
        currentActivePreview.innerText = finalNoteText.split('\n')[0]; // عرض السطر الأول فقط في المعاينة
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
    document.querySelectorAll('#salesBody .main-row').forEach(row => {
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
    
    if (action === 'حذف') {
        const result = await Swal.fire({ title: 'تأكيد الحذف؟', text: "سيتم حذف الطلبات المحددة نهائياً!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#94a3b8', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء' });
        if (result.isConfirmed) {
            selected.forEach(chk => { const row = chk.closest('tr'); addGeneralLog('إجراء', '', '', row.cells[4].querySelector('input').value, 'تم حذف الطلب'); row.remove(); });
            autoSave(); Swal.fire({icon: 'success', title: 'تم الحذف', showConfirmButton: false, timer: 1500});
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
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    document.getElementById('activityLogs').innerHTML = logs.map(l => `<div class="activity-item">${l}</div>`).join('');
}

function loadSalesFromStorage() {
    const saved = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
    document.getElementById('salesBody').innerHTML = "";
    saved.forEach(item => renderTableRow(item));
    updateHeaderStats();
    renderGeneralLogs();
}

window.onclick = e => { if (!e.target.matches('.btn-bulk-trigger') && !e.target.matches('.fa-chevron-down')) document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show')); };

