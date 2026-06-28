/* ==========================================================
   1. تعريف المتغيرات واستخراج المعاملات من الرابط
   ========================================================== */
const urlParams = new URLSearchParams(window.location.search);
// قراءة كود العميل الخماسي الفريد بدلاً من قراءة الاسم لمنع أي تداخل
const clientCode = urlParams.get('code'); 
let clientName = ''; 

function goBackAndFocus() {
    if (clientCode) sessionStorage.setItem('last_viewed_client_code', clientCode);
    window.location.href = 'customers.html';
}

function getTodayDateFormatted() {
    const d = new Date();
    return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear();
}

function getFullDateTimePattern() {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const d = new Date();
    const dayName = days[d.getDay()];
    const dateStr = getTodayDateFormatted();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `👤 (أحمد)  🗓️ ${dayName}  ${dateStr}  ${hours.toString().padStart(2, '0')}:${minutes} ${ampm} ➡️ :`;
}

function addToClientActivityLog(actionText) {
    if (!clientName) return;
    const timePart = getFullDateTimePattern();
    const fullLogHTML = `<div class="log-item" style="padding: 4px 0; border-bottom: 1px dashed #eee; font-size:11px;"><span class="activity-time-part" style="color:#64748b; font-weight:700;">${timePart}</span> <span class="activity-text-part" style="color:#0f172a; font-weight:600;">${actionText}</span></div>`;
    let logs = JSON.parse(localStorage.getItem('asgate_customer_details_logs_' + clientName) || '[]');
    logs.unshift(fullLogHTML);
    localStorage.setItem('asgate_customer_details_logs_' + clientName, JSON.stringify(logs));
    renderClientActivityLog();
}

function renderClientActivityLog() {
    const container = document.getElementById('clientActivityLog');
    if (!container || !clientName) return;
    let logs = JSON.parse(localStorage.getItem('asgate_customer_details_logs_' + clientName) || '[]');
    container.innerHTML = logs.join('');
    if(logs.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:10px;">لا توجد سجلات أنشطة سابقة</p>`;
    }
}

/* ==========================================================
   2. دالة جلب العميل من خلال الكود الخماسي الفريد
   ========================================================== */
function loadClientData() {
    const rawData = localStorage.getItem('asgate_customers_final_v2');
    if (!rawData || !clientCode) return;
    
    try {
        const customers = JSON.parse(rawData);
        // البحث المطابق بواسطة كود العميل الفريد المتسلسل
        const client = customers.find(c => c.code === clientCode);
        
        if (client) {
            clientName = client.comp; // تهيئة الاسم للمفاتيح التابعة
            
            // حقن البيانات في واجهة المستخدم تلقائياً
            if(document.getElementById('c-name')) document.getElementById('c-name').innerText = client.comp || '-';
            if(document.getElementById('c-addr')) document.getElementById('c-addr').innerText = client.address || '-';
            if(document.getElementById('c-mgr')) document.getElementById('c-mgr').innerText = client.mgr || '-';
            if(document.getElementById('c-mob')) document.getElementById('c-mob').innerText = client.mob || '-';
            if(document.getElementById('c-email')) document.getElementById('c-email').innerText = client.email || '-';
            if(document.getElementById('c-date')) document.getElementById('c-date').innerText = client.creationDate || '-';
            if(document.getElementById('c-class')) document.getElementById('c-class').innerText = client.classification || '-';
            if(document.getElementById('c-status')) {
                const statusEl = document.getElementById('c-status');
                statusEl.innerText = client.status || '-';
                // تطبيق تلوين أحمر داكن هنا أيضاً إذا كانت الحالة غير نشط بالتفاصيل
                if(client.status === 'غير نشط') {
                    statusEl.style.backgroundColor = '#991b1b';
                    statusEl.style.color = '#ffffff';
                    statusEl.style.padding = '2px 8px';
                    statusEl.style.borderRadius = '4px';
                    statusEl.style.fontWeight = '800';
                }
            }
            if(document.getElementById('c-owner')) document.getElementById('c-owner').innerText = client.owner || '-';
            
            // تشغيل الوظائف المعتمدة على الاسم الفرعي للشركات والزيارات
            loadManagerTable();
            openTab('o-history');
            renderClientActivityLog();
        }
    } catch(e) { 
        console.error("Error loading client data:", e); 
    }
}

function loadManagerTable() {
    const tbody = document.getElementById('managerTableBody');
    if (!tbody || !clientName) return;
    let managers = JSON.parse(localStorage.getItem('asgate_managers_' + clientName) || '[]');
    tbody.innerHTML = managers.map((m, idx) => `
        <tr>
            <td>${m.name || '-'}</td>
            <td>${m.phone || '-'}</td>
            <td>${m.phone2 || '-'}</td>
            <td>${m.email || '-'}</td>
            <td>${m.role || '-'}</td>
            <td>${m.date || '-'}</td>
            <td><button onclick="deleteManager(${idx})" style="background:none; border:none; color:var(--danger-red); cursor:pointer;"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
    if (managers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">لا يوجد مسؤولين مضافين حالياً</td></tr>`;
    }
}

function openTab(tab) {
    const title = document.getElementById('frame-title');
    const content = document.getElementById('table-content');
    if (!title || !content) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    if (tab === 'o-history') {
        if (document.getElementById('btn-o')) document.getElementById('btn-o').classList.add('active');
        title.innerText = "🛒 سجل طلبات العميل";
        content.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:20px;">لا توجد طلبات سابقة مسجلة.</p>`;
    } else if (tab === 'attachments') {
        if (document.getElementById('btn-a')) document.getElementById('btn-a').classList.add('active');
        title.innerText = "📁 المرفقات والملفات";
        content.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:20px;">لا توجد ملفات مرفقة.</p>`;
    } else if (tab === 'v-history') {
        if (document.getElementById('btn-v')) document.getElementById('btn-v').classList.add('active');
        title.innerText = "📅 سجل الزيارات الميدانية";
        const visits = JSON.parse(localStorage.getItem('asgate_visits_final_v21') || '[]').filter(v => v.comp === clientName);
        content.innerHTML = visits.length > 0 ? `
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <thead><tr style="background:#f1f5f9;"><th style="padding:8px; text-align:right;">التاريخ</th><th style="padding:8px; text-align:right;">الحالة</th><th style="padding:8px; text-align:right;">الملاحظات</th></tr></thead>
                <tbody>${visits.map(v => `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px;">${v.visitDate}</td><td style="padding:8px;">${v.status || '-'}</td><td style="padding:8px;">${v.notes || '-'}</td></tr>`).join('')}</tbody>
            </table>
        ` : `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:20px;">لا توجد زيارات سابقة مسجلة.</p>`;
    }
}
