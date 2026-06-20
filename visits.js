/* 1. المتغيرات (في أعلى الملف دائماً) */
const STORAGE_KEY = 'asgate_visits_final_v31';
const LOGS_KEY = 'asgate_visits_logs_v32';

/* 2. الدالة الأساسية (renderRow) - يجب أن تكون في الأعلى */
function renderRow(v = {}, prepend = false) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    // ... ضع كامل الكود الخاص بـ renderRow هنا
}

/* 3. الدوال الإجرائية التي تستخدم renderRow */
function loadSavedData() {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) return;
    const data = JSON.parse(rawData);
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    // الآن المتصفح يعرف دالة renderRow لأنها أصبحت في الأعلى
    data.forEach(v => renderRow(v, false));
    reorderRows();
    updateStats();
    renderActivityLog();
}

function insertNewRow() {
    renderRow({}, true);
    saveAllDataSilently();
}

/* 4. باقي الدوال (saveAllDataSilently, reorderRows, الخ..) */
// ... ضع باقي الدوال هنا
