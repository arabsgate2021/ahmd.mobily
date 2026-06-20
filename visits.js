/* --- 1. المتغيرات --- */
const STORAGE_KEY = 'asgate_visits_final_v31';
const LOGS_KEY = 'asgate_visits_logs_v32';

/* --- 2. الدالة الأساسية (ضعها هنا في الأعلى) --- */
function renderRow(v = {}, prepend = false) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    // ... باقي الكود الخاص بـ renderRow
}

/* --- 3. الدوال التي تنادي renderRow --- */
function loadSavedData() {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) return;
    const data = JSON.parse(rawData);
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // الآن لن تظهر رسالة الخطأ لأن renderRow معرفة بالأعلى
    data.forEach(v => renderRow(v, false));
    reorderRows();
    updateStats();
}

function insertNewRow() {
    renderRow({}, true); // لن تظهر رسالة الخطأ هنا أيضاً
    saveAllDataSilently();
}

/* --- 4. باقي الدوال (ترتيبها لا يهم كثيراً) --- */
// ... saveAllDataSilently, reorderRows, etc.
