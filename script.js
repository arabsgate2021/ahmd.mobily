/* ==========================================================================
   ASGate Management System - Core Script (Universal)
   ========================================================================== */

let currentActivePreview = null;
let saveTimeout;

// مفاتيح التخزين الموحدة
const SALES_DB_KEY = 'asgate_sales_db';
const VISITS_DB_KEY = 'asgate_visits_db';
const CUSTOMERS_STORAGE_KEY = 'asgate_customers_v2_final'; 

document.addEventListener('DOMContentLoaded', initPage);

function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }

/* --- دالة التهيئة الموحدة --- */
function initPage() {
    // 1. تفعيل دوال لوحة التحكم إذا كنا في الصفحة الرئيسية
    if (document.getElementById('monthsBody') || document.getElementById('achievedChart')) {
        initIndexDashboard();
    }
    
    // 2. تفعيل دوال الجداول للصفحات الأخرى
    if (document.getElementById('salesBody')) loadSalesFromStorage();
    if (document.getElementById('visitsBody')) loadVisitsFromStorage();
    if (document.getElementById('customersBody')) loadCustomersFromStorage();
}

/* ==========================================================================
   دوال الصفحة الرئيسية (Dashboard)
   ========================================================================== */
function initIndexDashboard() {
    // تعبئة جدول الشهور الافتراضي
    const months = ["يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const tbody = document.getElementById('monthsBody');
    if(tbody) {
        months.forEach((m, i) => {
            const row = tbody.insertRow();
            row.innerHTML = `<td>${m}</td><td>15k</td><td>${i===0?'14.2k':'-'}</td><td class="thick-border">${i===0?'790':'-'}</td><td style="color:#3b82f6">${i===0?'45':'-'}</td><td style="color:#22c55e">${i===0?'12':'-'}</td>`;
        });
    }

    // تفعيل رسومات Chart.js
    if(document.getElementById('achievedChart')) {
        new Chart(document.getElementById('achievedChart'), {
            type: 'doughnut',
            data: { datasets: [{ data: [82, 18], backgroundColor: ['#22c55e', '#f1f5f9'], borderWidth: 0, borderRadius: 10 }] },
            options: { cutout: '85%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    if(document.getElementById('gaugeChart')) {
        new Chart(document.getElementById('gaugeChart'), {
            type: 'doughnut',
            data: { datasets: [{ data: [25, 25, 25, 25], backgroundColor: ['#ef4444', '#fbbf24', '#4ade80', '#15803d'], borderWidth: 0, circumference: 180, rotation: 270 }] },
            options: { cutout: '90%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    if(document.getElementById('staffChart')) {
        const ctxStaff = document.getElementById('staffChart').getContext('2d');
        new Chart(ctxStaff, {
            type: 'bar',
            data: {
                labels: Array.from({length: 30}, (_, i) => `م${i + 1}`),
                datasets: [
                    { label: 'المحقق', data: Array.from({length: 30}, () => Math.floor(Math.random() * 5000) + 25000), backgroundColor: '#22c55e' },
                    { label: 'المعلق', data: Array.from({length: 30}, () => Math.floor(Math.random() * 3000) + 1000), backgroundColor: '#facc15' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } } }
        });
    }
}

/* ==========================================================================
   دوال الجداول (العملاء، المبيعات، الزيارات)
   ========================================================================== */
function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (document.getElementById('customersBody')) autoSaveCustomers();
    }, 500);
}

function autoSaveCustomers() {
    const rows = document.querySelectorAll('#customersBody .main-row');
    const data = Array.from(rows).map(r => ({
        name: r.cells[1].querySelector('input').value,
        phone: r.cells[2].querySelector('input').value,
        notes: r.cells[5].querySelector('.notes-preview').getAttribute('data-full-notes')
    }));
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(data));
}

function openNote(el) {
    currentActivePreview = el;
    const modalEl = document.getElementById('noteModal');
    if(modalEl) modalEl.style.display = "flex";
}

function closeNote() { 
    const modalEl = document.getElementById('noteModal');
    if(modalEl) modalEl.style.display = "none"; 
}

function saveNote() {
    const txtArea = document.getElementById('modalTextArea');
    if (txtArea.value.trim() && currentActivePreview) {
        currentActivePreview.innerText = txtArea.value.substring(0, 15) + "...";
        debouncedSave();
    }
    closeNote();
}
