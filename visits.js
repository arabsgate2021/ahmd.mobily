// نسخ كافة محتويات وسوم <script> هنا
const STORAGE_KEY = 'asgate_visits_final_v31';
// ... (قم بنسخ كافة الدوال: loadSavedData, insertNewRow, etc...)

function loadSavedData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { document.getElementById('tableBody').innerHTML = ''; JSON.parse(saved).forEach(v => renderRow(v)); }
    renderActivityLog(); updateStats(); reorderRows();
}
// [يتم وضع كامل كود الـ JS هنا]
