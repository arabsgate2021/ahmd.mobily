const urlParams = new URLSearchParams(window.location.search);
const clientId = urlParams.get('id'); // التعديل: جلب رقم العميل (id) بدلاً من الاسم
let clientName = ""; // متغير لتخزين اسم الشركة لاستخدامه في السجلات

function goBackAndFocus() {
    if(clientId) sessionStorage.setItem('last_viewed_client', clientId);
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
    const timePart = getFullDateTimePattern();
    const fullLogHTML = `<span class="activity-time-part">${timePart}</span> <span class="activity-text-part">${actionText}</span>`;
    
    let logs = JSON.parse(localStorage.getItem('asgate_activity_logs_v2') || '[]');
    logs.unshift(fullLogHTML);
    if(logs.length > 100) logs.pop();
    localStorage.setItem('asgate_activity_logs_v2', JSON.stringify(logs));
    renderClientActivityLog();
}

function renderClientActivityLog() {
    const list = document.getElementById('activityList');
    if (!list) return;
    const logs = JSON.parse(localStorage.getItem('asgate_activity_logs_v2') || '[]');
    list.innerHTML = logs.map(log => `<div class="activity-item">${log}</div>`).join('');
}

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
    if(!clientId) return; // التأكد من وجود رقم العميل في الرابط

    // التعديل: جلب البيانات من نفس قاعدة بيانات صفحة العملاء
    const data = JSON.parse(localStorage.getItem('asgate_customers_final_v32') || '[]');
    // التعديل: البحث عن العميل بواسطة رقم العميل (clientId)
    const client = data.find(c => String(c.clientId) === String(clientId));

    if(client) {
        clientName = client.comp; // تحديث اسم الشركة لاستخدامه لاحقاً
        document.title = `${clientName} | تفصيل العميل`;
        
        // ربط الحقول بما يقابلها في قاعدة بيانات العملاء
        document.getElementById('c-name').innerText = clientName || 'غير محدد';
        document.getElementById('c-cr').innerText = client.record || '0000000'; // السجل التجاري
        document.getElementById('c-addr').innerText = client.address || 'غير محدد';
        document.getElementById('c-source').innerText = client.category || 'غير محدد'; // تصنيف العميل
        document.getElementById('c-owner').innerText = client.owner || 'غير محدد';
        
        loadManagersData();
        openTab('o-history');
    } else {
        document.getElementById('c-name').innerText = "العميل غير موجود";
    }
    renderClientActivityLog();
}

function addNewManagerRow() {
    const tbody = document.getElementById('managerTableBody');
    const row = tbody.insertRow();
    const todayStr = getTodayDateFormatted();
    row.innerHTML = `
        <td><input type="checkbox" class="main-check" onchange="handleMainSelection(this)"></td>
        <td><input type="text" class="mgr-input" placeholder="الاسم..."></td>
        <td><input type="text" class="mgr-input" placeholder="رقم التواصل..."></td>
        <td><input type="text" class="mgr-input" placeholder="رقم آخر..."></td>
        <td><input type="email" class="mgr-input" placeholder="الايميل..."></td>
        <td><input type="text" class="mgr-input" placeholder="الوظيفة..."></td>
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
    if (!clientId) return;
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
    // التعديل: استخدام رقم العميل (clientId) كمفتاح للحفظ بدلاً من الاسم لضمان عدم التداخل
    allManagersData[clientId] = managersList;
    localStorage.setItem('asgate_client_managers_db', JSON.stringify(allManagersData));
}

function loadManagersData() {
    if (!clientId) return;
    const tbody = document.getElementById('managerTableBody');
    tbody.innerHTML = '';
    
    const allManagersData = JSON.parse(localStorage.getItem('asgate_client_managers_db') || '{}');
    const currentClientManagers = allManagersData[clientId] || []; // الجلب بواسطة رقم العميل
    
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
        // جلب الزيارات الخاصة بالشركة
        const visits = JSON.parse(localStorage.getItem('asgate_visits_final_v21') || '[]').filter(v => v.comp === clientName);
        content.innerHTML = visits.length > 0 ? `
            <table>
                <thead><tr><th>التاريخ</th><th>الحالة</th><th>الملاحظات</th></tr></thead>
                <tbody>${visits.map(v => `<tr><td>${v.visitDate}</td><td>${v.status || 'مكتملة'}</td><td>${v.notes || '-'}</td></tr>`).join('')}</tbody>
            </table>` : `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:20px;">لا توجد سجلات زيارات حالياً.</p>`;
    }
}
