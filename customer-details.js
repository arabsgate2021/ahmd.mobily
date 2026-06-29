// استخراج الكود الخماسي من الرابط
const urlParams = new URLSearchParams(window.location.search);
const clientCode = urlParams.get('code'); 
let clientName = ''; 

function goBackAndFocus() {
    if(clientCode) sessionStorage.setItem('last_viewed_client_code', clientCode);
    window.location.href = 'customers.html';
}

function getTodayDateFormatted() {
    const d = new Date();
    return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear();
}

/* === دوال سجل النشاط الجديدة (مطابقة لصفحة الزيارات) === */
function toggleLogExpansion() { 
    const logSection = document.getElementById('activityLogSection'); 
    const toggleBtn = document.getElementById('toggleExpandBtn'); 
    if (logSection.classList.contains('expanded')) { 
        logSection.classList.remove('expanded'); 
        toggleBtn.innerHTML = '<i class="fas fa-expand-alt"></i>'; 
    } else { 
        logSection.classList.add('expanded'); 
        toggleBtn.innerHTML = '<i class="fas fa-compress-alt"></i>'; 
    } 
}

function addToClientActivityLog(actionText) {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; 
    const d = new Date(); 
    let dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear(); 
    const dayName = days[d.getDay()];
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = String(hours).padStart(2, '0') + ":" + minutes + " " + ampm;
    
    const fullLogHTML = `
        <div class="log-entry">
            <span class="log-badge-user"><i class="fas fa-user-circle"></i> المستخدم</span>
            <span class="log-divider">|</span>
            <span class="log-timestamp"><i class="fas fa-clock"></i> ${dayName} ${yyyy}-${mm}-${dd} ${timeStr}</span>
            <span class="log-divider">|</span>
            <span class="log-action">${actionText}</span>
        </div>
    `;
    
    // استخدمت مفتاح جديد (v3) لعدم تداخل التنسيق الجديد مع البيانات القديمة المخزنة
    let logs = JSON.parse(localStorage.getItem('asgate_activity_logs_v3') || '[]'); 
    logs.unshift(fullLogHTML); 
    if(logs.length > 100) logs.pop();
    localStorage.setItem('asgate_activity_logs_v3', JSON.stringify(logs)); 
    renderClientActivityLog();
}

function renderClientActivityLog() {
    const list = document.getElementById('activityList');
    if (!list) return;
    const logs = JSON.parse(localStorage.getItem('asgate_activity_logs_v3') || '[]');
    list.innerHTML = logs.join('');
}
/* ====================================================== */

function handleMainSelection(checkbox) {
    if (checkbox.checked) {
        const allChecks = document.querySelectorAll('.main-check');
        allChecks.forEach(cb => {
            if (cb !== checkbox) cb.checked = false;
        });
        const selectedRow = checkbox.closest('tr');
        const mgrInput = selectedRow.querySelector('.mgr-input');
        const mgrName = mgrInput ? mgrInput.value.trim() : "غير محدد";
        addToClientActivityLog(`تحديد المسؤول (${mgrName}) كمسؤول رئيسي للمنشأة  ( ${clientName || 'شركة غير محددة'} )`);
    }
    saveManagersToLocalStorage();
}

function loadClientData() {
    if(!clientCode) return;
    // قراءة البيانات من قاعدة بيانات صفحة العملاء الجديدة
    const data = JSON.parse(localStorage.getItem('asgate_customers_final_v2') || '[]');
    
    // البحث في الجدول عن العميل بواسطة رقم الكود الخاص به
    const client = data.find(c => c.code === clientCode);
    
    if(client) {
        clientName = client.comp; 
        document.title = `${client.comp} | تفاصيل العميل`;
        
        document.getElementById('c-name').innerText = client.comp || 'غير محدد';
        document.getElementById('c-cr1').innerText = client.cr1 || client.cr || client.record || '0000000';
        document.getElementById('c-cr2').innerText = client.cr2 || 'غير محدد';
        document.getElementById('c-city').innerText = client.city || client.address || 'غير محدد';
        document.getElementById('c-district').innerText = client.district || 'غير محدد';
        document.getElementById('c-source').innerText = client.classification || client.source || 'نظام داخلي';
        document.getElementById('c-owner').innerText = client.owner || 'غير محدد';
        
        loadManagersData();
        openTab('o-history');
    }
    renderClientActivityLog();
}

function addNewManagerRow() {
    const tbody = document.getElementById('managerTableBody');
    const row = tbody.insertRow();
    const todayStr = getTodayDateFormatted();
    row.innerHTML = `
        <td><input type="checkbox" class="main-check" onchange="handleMainSelection(this)"></td>
        <td><input type="text" class="mgr-input"></td>
        <td><input type="text" class="mgr-input"></td>
        <td><input type="text" class="mgr-input"></td>
        <td><input type="email" class="mgr-input"></td>
        <td><input type="text" class="mgr-input"></td>
        <td><input type="text" class="mgr-input" value="${todayStr}" disabled style="color: #64748b;"></td>
        <td><button class="btn-save-row" onclick="lockAndSaveManagerRow(this)">حفظ</button></td>
    `;
}

function lockAndSaveManagerRow(btn) {
    const row = btn.closest('tr');
    const inputs = row.querySelectorAll('.mgr-input');
    
    if(!inputs[0].value.trim()) {
        alert("يرجى إدخال اسم المسؤول أولاً.");
        inputs[0].focus();
        return;
    }

    alert("لن تتمكن من الحذف أو التعديل بعد ذلك (باستثناء تحديد المسؤول الرئيسي)");
    
    const savedName = inputs[0].value.trim();
    inputs.forEach(input => input.disabled = true);
    btn.parentElement.innerHTML = `<span class="btn-locked-status">🔒 محفوظ ومقفل</span>`;
    
    saveManagersToLocalStorage();
    addToClientActivityLog(`إضافة وقفل بيانات المسؤول الجديد: ${savedName}  ( ${clientName || 'شركة غير محددة'} )`);
}

function saveManagersToLocalStorage() {
    if (!clientName) return;
    const tbody = document.getElementById('managerTableBody');
    const managersList = [];
    tbody.querySelectorAll('tr').forEach(row => {
        const inputs = row.querySelectorAll('.mgr-input');
        const mainCheckbox = row.querySelector('.main-check');
        if (inputs.length > 0 && inputs[0].disabled) {
            managersList.push({
                isMain: mainCheckbox.checked,
                name: inputs[0].value.trim(),
                phone1: inputs[1].value.trim(),
                phone2: inputs[2].value.trim(),
                email: inputs[3].value.trim(),
                job: inputs[4].value.trim(),
                date: inputs[5].value.trim()
            });
        }
    });
    const allManagersData = JSON.parse(localStorage.getItem('asgate_client_managers_db') || '{}');
    allManagersData[clientName] = managersList;
    localStorage.setItem('asgate_client_managers_db', JSON.stringify(allManagersData));
}

function loadManagersData() {
    if (!clientName) return;
    const tbody = document.getElementById('managerTableBody');
    tbody.innerHTML = '';
    const allManagersData = JSON.parse(localStorage.getItem('asgate_client_managers_db') || '{}');
    const currentClientManagers = allManagersData[clientName] || [];
    currentClientManagers.forEach(mgr => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="checkbox" class="main-check" ${mgr.isMain ? 'checked' : ''} onchange="handleMainSelection(this)"></td>
            <td><input type="text" class="mgr-input" value="${mgr.name || ''}" disabled></td>
            <td><input type="text" class="mgr-input" value="${mgr.phone1 || ''}" disabled></td>
            <td><input type="text" class="mgr-input" value="${mgr.phone2 || ''}" disabled></td>
            <td><input type="email" class="mgr-input" value="${mgr.email || ''}" disabled></td>
            <td><input type="text" class="mgr-input" value="${mgr.job || ''}" disabled></td>
            <td><input type="text" class="mgr-input" value="${mgr.date || ''}" disabled></td>
            <td><span class="btn-locked-status">🔒 محفوظ ومقفل</span></td>
        `;
    });
}

function openTab(tab) {
    const title = document.getElementById('frame-title');
    const content = document.getElementById('table-content');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if(tab === 'o-history') {
        document.getElementById('btn-o').classList.add('active');
        title.innerText = "🛒 سجل طلبات العميل";
        content.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:20px;">لا توجد طلبات سابقة مسجلة.</p>`;
    } else if(tab === 'attachments') {
        document.getElementById('btn-a').classList.add('active');
        title.innerText = "📁 المرفقات والملفات";
        content.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:20px;">لا توجد ملفات مرفقة.</p>`;
    } else if(tab === 'v-history') {
        document.getElementById('btn-v').classList.add('active');
        title.innerText = "📅 سجل الزيارات الميدانية";
        const visits = JSON.parse(localStorage.getItem('asgate_visits_final_v21') || '[]').filter(v => v.comp === clientName);
        content.innerHTML = visits.length > 0 ? `
            <table>
                <thead><tr><th>التاريخ</th><th>الحالة</th><th>الملاحظات</th></tr></thead>
                <tbody>${visits.map(v => `<tr><td>${v.visitDate}</td><td>${v.status || 'مكتملة'}</td><td>${v.notes || '-'}</td></tr>`).join('')}</tbody>
            </table>` : `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:20px;">لا توجد سجلات زيارات حالياً.</p>`;
    }
}
