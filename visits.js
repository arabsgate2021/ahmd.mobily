let currentActivePreview = null;
const STORAGE_KEY = 'asgate_visits_final_v26';

function getTodayFormatted() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

function generateStyledHeader() {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const d = new Date();
    const timeFormatted = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `<span class="activity-header-part">👤 (أحمد)  🗓️ ${days[d.getDay()]}  ${getTodayFormatted()}  <span class="activity-time-part">${timeFormatted}</span>&nbsp;&nbsp;</span>`;
}

function addToActivityLog(fieldName, oldVal, newVal, companyName) {
    const headerHTML = generateStyledHeader();
    const cleanCompany = companyName && companyName.trim() !== "" ? companyName : "شركة جديدة";
    const val1 = oldVal && oldVal.trim() !== "" ? oldVal : "فارغ";
    const val2 = newVal && newVal.trim() !== "" ? newVal : "فارغ";
    
    let actionText = "";
    if (fieldName === "إجراء") {
        actionText = `حذف زيارة شركة ( ${cleanCompany} )`;
    } else {
        actionText = `تعديل ${fieldName} من [${val1}] إلى [${val2}] في ( ${cleanCompany} )`;
    }

    const fullLogHTML = `${headerHTML}<span class="activity-text-part">${actionText}</span>`;
    let logs = JSON.parse(localStorage.getItem('asgate_activity_logs_v26') || '[]');
    logs.unshift(fullLogHTML);
    localStorage.setItem('asgate_activity_logs_v26', JSON.stringify(logs.slice(0, 100)));
    renderActivityLog();
}

function renderActivityLog() {
    const list = document.getElementById('activityList');
    const logs = JSON.parse(localStorage.getItem('asgate_activity_logs_v26') || '[]');
    list.innerHTML = logs.map(log => `<div class="activity-item">${log}</div>`).join('');
}

function updateStats() {
    const rows = document.querySelectorAll('#tableBody tr');
    const today = getTodayFormatted();
    const currentMonth = today.substring(0, 7);
    let total = rows.length, tDay = 0, tMonth = 0, tSuccess = 0;
    rows.forEach(row => {
        const date = row.querySelector('.visit-date-val').value;
        const status = row.querySelector('.status-select').value;
        if (date === today) tDay++;
        if (date.startsWith(currentMonth)) tMonth++;
        if (status === '50%') tSuccess++;
    });
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-today').innerText = tDay;
    document.getElementById('stat-month').innerText = tMonth;
    document.getElementById('stat-success').innerText = tSuccess;
}

function getLastNoteOnly(fullText) {
    if (!fullText || fullText.trim() === "") return 'إضافة ملاحظة...';
    const arr = fullText.split('\n--------------------\n');
    const lastEntry = arr[arr.length - 1];
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = lastEntry;
    const textPart = tempDiv.querySelector('.activity-text-part');
    return textPart ? textPart.innerText : 'إضافة ملاحظة...';
}

function updateEditDateField(row) {
    const today = getTodayFormatted();
    row.querySelector('.edit-date-display').value = today;
    row.querySelector('.edit-date-val').value = today;
}

function renderRow(v = {}, prepend = false) {
    const tbody = document.getElementById('tableBody');
    const row = prepend ? tbody.insertRow(0) : tbody.insertRow();
    const today = getTodayFormatted();
    const visitDate = v.visitDate || today;
    const notes = v.notes || '';
    const lastNoteText = getLastNoteOnly(notes);

    row.innerHTML = `
        <td><input type="checkbox" class="select-check"></td>
        <td><input type="text" class="excel-input" value="${v.comp || ''}" data-old="${v.comp || ''}" onfocus="this.setAttribute('data-old', this.value)" onchange="addToActivityLog('الشركة', this.getAttribute('data-old'), this.value, this.value); updateEditDateField(this.closest('tr')); saveAllDataSilently();"></td>
        <td><input type="text" class="excel-input" value="${v.mgr || ''}" data-old="${v.mgr || ''}" onfocus="this.setAttribute('data-old', this.value)" onchange="addToActivityLog('المسؤول', this.getAttribute('data-old'), this.value, this.closest('tr').cells[1].querySelector('input').value); updateEditDateField(this.closest('tr')); saveAllDataSilently();"></td>
        <td><input type="text" class="excel-input" value="${v.mob || ''}" data-old="${v.mob || ''}" onfocus="this.setAttribute('data-old', this.value)" onchange="addToActivityLog('الموبايل', this.getAttribute('data-old'), this.value, this.closest('tr').cells[1].querySelector('input').value); updateEditDateField(this.closest('tr')); saveAllDataSilently();"></td>
        <td><input type="text" class="excel-input" value="${v.email || ''}" data-old="${v.email || ''}" onfocus="this.setAttribute('data-old', this.value)" onchange="addToActivityLog('الإيميل', this.getAttribute('data-old'), this.value, this.closest('tr').cells[1].querySelector('input').value); updateEditDateField(this.closest('tr')); saveAllDataSilently();"></td>
        <td><input type="text" class="excel-input" value="${v.record || ''}" data-old="${v.record || ''}" onfocus="this.setAttribute('data-old', this.value)" onchange="addToActivityLog('السجل', this.getAttribute('data-old'), this.value, this.closest('tr').cells[1].querySelector('input').value); updateEditDateField(this.closest('tr')); saveAllDataSilently();"></td>
        <td>
            <input type="text" class="excel-input readonly-input" value="${visitDate}" readonly>
            <input type="hidden" class="visit-date-val" value="${visitDate}">
        </td>
        <td><input type="text" class="excel-input" value="${v.curServ || ''}" data-old="${v.curServ || ''}" onfocus="this.setAttribute('data-old', this.value)" onchange="addToActivityLog('الخدمة الحالية', this.getAttribute('data-old'), this.value, this.closest('tr').cells[1].querySelector('input').value); updateEditDateField(this.closest('tr')); saveAllDataSilently();"></td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${notes.replace(/'/g, "&apos;")}' id="preview-${Date.now()}-${Math.random()}">${lastNoteText}</div></td>
        <td>
            <select class="excel-input status-select" data-old="${v.status || ''}" onfocus="this.setAttribute('data-old', this.value)" onchange="addToActivityLog('الحالة', this.getAttribute('data-old'), this.value, this.closest('tr').cells[1].querySelector('input').value); updateEditDateField(this.closest('tr')); saveAllDataSilently(); updateStats();">
                <option value="" ${v.status === '' ? 'selected' : ''}></option>
                <option value="مهتم" ${v.status === 'مهتم' ? 'selected' : ''}>مهتم</option>
                <option value="50%" ${v.status === '50%' ? 'selected' : ''}>50%</option>
                <option value="فقدان" ${v.status === 'فقدان' ? 'selected' : ''}>فقدان</option>
            </select>
        </td>
        <td>
            <input type="text" class="excel-input readonly-input edit-date-display" value="${v.editDate || ''}" readonly>
            <input type="hidden" class="edit-date-val" value="${v.editDate || ''}">
        </td>
        <td class="action-cell">
            <button class="dots-btn" onclick="toggleDropdown(event, this)">الإجراء ▾</button>
            <div class="dropdown-menu">
                <button onclick="alert('تعديل فردي')">تعديل</button>
                <button onclick="alert('تحويل فردي')">تحويل</button>
                <button class="del-btn" onclick="deleteRow(this)">حذف</button>
            </div>
        </td>
    `;
    updateStats();
}

function toggleAllCheckboxes(source) {
    document.querySelectorAll('.select-check').forEach(chk => chk.checked = source.checked);
}

function toggleDropdown(e, btn) {
    e.stopPropagation();
    const menu = btn.nextElementSibling;
    const isOpen = menu.classList.contains('show');
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    if (!isOpen) menu.classList.add('show');
}

function handleBulkAction(action) {
    const selected = document.querySelectorAll('.select-check:checked');
    if (selected.length === 0) {
        alert('يرجى تحديد صف واحد على الأقل.');
        return;
    }
    if (action === 'حذف المحدد') {
        if (confirm(`هل أنت متأكد من حذف ${selected.length} صفوف؟`)) {
            selected.forEach(chk => {
                const row = chk.closest('tr');
                const companyName = row.cells[1].querySelector('input').value;
                addToActivityLog('إجراء', '', '', companyName);
                row.remove();
            });
            saveAllDataSilently();
            updateStats();
        }
    } else {
        alert(`تم تنفيذ: ${action} لـ ${selected.length} صف.`);
    }
}

function deleteRow(btn) {
    const row = btn.closest('tr');
    const companyName = row.cells[1].querySelector('input').value;
    if (confirm('هل أنت متأكد؟')) {
        addToActivityLog('إجراء', '', '', companyName);
        row.remove();
        saveAllDataSilently();
        updateStats();
    }
}

function insertNewRow() {
    renderRow({}, true);
    saveAllDataSilently();
}

function saveAllDataSilently() {
    const data = [];
    document.querySelectorAll('#tableBody tr').forEach(row => {
        const preview = row.querySelector('.notes-preview');
        data.push({
            comp: row.cells[1].querySelector('input').value,
            mgr: row.cells[2].querySelector('input').value,
            mob: row.cells[3].querySelector('input').value,
            email: row.cells[4].querySelector('input').value,
            record: row.cells[5].querySelector('input').value,
            visitDate: row.querySelector('.visit-date-val').value,
            curServ: row.cells[7].querySelector('input').value,
            notes: preview.getAttribute('data-full-notes') || '',
            status: row.querySelector('.status-select').value,
            editDate: row.querySelector('.edit-date-val').value
        });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadSavedData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) JSON.parse(saved).forEach(item => renderRow(item));
    renderActivityLog();
    updateStats();
}

function filterTable() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('#tableBody tr').forEach(r => {
        const match = [1,2,3,4,5].some(idx => r.cells[idx].querySelector('input').value.toLowerCase().includes(q));
        r.style.display = match ? "" : "none";
    });
}

function openNote(el) {
    currentActivePreview = el;
    const rawNotes = el.getAttribute('data-full-notes') || "";
    const historyLog = document.getElementById('historyLog');
    if (rawNotes.trim() !== "") {
        historyLog.innerHTML = rawNotes.split('\n--------------------\n').map(entry => `<div class="activity-item" style="border-bottom:1px solid #e2e8f0; padding:5px 0;">${entry}</div>`).join('');
    } else {
        historyLog.innerHTML = '<div style="text-align:center; color:#94a3b8; margin-top:20px;">لا توجد ملاحظات سابقة</div>';
    }
    document.getElementById('noteModal').style.display = "flex";
    document.getElementById('modalTextArea').focus();
}

function saveNote() {
    const newText = document.getElementById('modalTextArea').value.trim();
    if (newText && currentActivePreview) {
        let oldNotes = currentActivePreview.getAttribute('data-full-notes') || "";
        let newEntry = `${generateStyledHeader()}<span class="activity-text-part">${newText}</span>`;
        let updatedFullNotes = oldNotes === "" ? newEntry : oldNotes + "\n--------------------\n" + newEntry;
        currentActivePreview.setAttribute('data-full-notes', updatedFullNotes);
        currentActivePreview.innerText = newText;
        const companyName = currentActivePreview.closest('tr').cells[1].querySelector('input').value;
        addToActivityLog('ملاحظات الزيارة', '...', newText, companyName);
        updateEditDateField(currentActivePreview.closest('tr'));
        saveAllDataSilently();
    }
    closeNote();
}

function closeNote() {
    document.getElementById('noteModal').style.display = "none";
    document.getElementById('modalTextArea').value = "";
}

window.onclick = (e) => {
    if (!e.target.matches('.dots-btn') && !e.target.matches('.header-dots-btn')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    }
};
