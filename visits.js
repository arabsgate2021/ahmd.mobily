/* =========================
   الدوال الأساسية المفقودة
   ========================= */

// هذه الدالة هي التي تسبب خطأ loadSavedData is not defined
function loadSavedData() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    data.forEach(v => renderRow(v, false));
    reorderRows();
    updateStats();
    renderActivityLog();
}

function saveAllDataSilently() {
    const rows = document.querySelectorAll('#tableBody .main-row');
    const data = Array.from(rows).map(row => ({
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
        editDate: row.querySelector('.edit-date-val') ? row.querySelector('.edit-date-val').value : ''
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// دالة جلب الملاحظة الأخيرة
function getLastNoteOnlyFromJSON(jsonStr) {
    try {
        const arr = JSON.parse(jsonStr);
        return arr.length > 0 ? arr[arr.length - 1].text : "لا توجد ملاحظات";
    } catch(e) { return "لا توجد ملاحظات"; }
}

// دالة التبديل (مهمة جداً لعمل الزيارات)
function toggleSubTable(rowId) {
    const sub = document.getElementById('sub-' + rowId);
    if(sub) sub.style.display = sub.style.display === 'table-row' ? 'none' : 'table-row';
}

/* =========================
   باقي الدوال (من الكود الأصلي)
   ========================= */
// (قم بوضع الدوال الأخرى التي أرسلتها أنت في الأعلى هنا، 
// وتأكد أن جميع الأقواس مغلقة بإحكام } )

// تأكد دائماً أن الملف ينتهي بإغلاق القوس الأخير لكل الدوال
