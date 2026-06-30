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

function handleMainSelection(checkbox) {
    if (checkbox.checked) {
        const allChecks = document.querySelectorAll('.main-check');
        allChecks.forEach(cb => {
            if (cb !== checkbox) cb.checked = false;
        });
    }
    saveManagersToLocalStorage();
}

function loadClientData() {
    if(!clientCode) return;
    
    const data = JSON.parse(localStorage.getItem('asgate_customers_final_v2') || '[]');
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
}

function addNewManagerRow() {
    const tbody = document.getElementById('managerTableBody');
    const row = tbody.insertRow();
    const todayStr = getTodayDateFormatted();
    
    row.innerHTML = `
        <td><input type="checkbox" class="main-check" onchange="handleMainSelection(this)"></td>
        <td><input type="text" class="mgr-input" placeholder="اسم المسؤول"></td>
        <td><input type="text" class="mgr-input" placeholder="05xxxxxxxx"></td>
        <td><input type="text" class="mgr-input" placeholder="اختياري"></td>
        <td><input type="email" class="mgr-input" placeholder="email@domain.com"></td>
        <td><input type="text" class="mgr-input" placeholder="المنصب"></td>
        <td><input type="text" class="mgr-input" value="${todayStr}" disabled></td>
        <td><button class="btn-save-row" onclick="lockAndSaveManagerRow(this)">حفظ</button></td>
    `;
    
    // التركيز التلقائي على حقل الاسم عند الإضافة
    row.querySelector('input[type="text"]').focus();
}

function lockAndSaveManagerRow(btn) {
    const row = btn.closest('tr');
    const inputs = row.querySelectorAll('.mgr-input');
    
    if(!inputs[0].value.trim()) {
        alert("يرجى إدخال اسم المسؤول أولاً.");
        inputs[0].focus();
        return;
    }
    
    inputs.forEach(input => input.disabled = true);
    btn.parentElement.innerHTML = `<span class="btn-locked-status">✔ محفوظ</span>`;
    
    saveManagersToLocalStorage();
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
            <td><span class="btn-locked-status">✔ محفوظ</span></td>
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
        content.innerHTML = `<p class="empty-state">لا توجد طلبات سابقة مسجلة لهذا العميل حتى الآن.</p>`;
    } else if(tab === 'attachments') {
        document.getElementById('btn-a').classList.add('active');
        title.innerText = "📁 المرفقات والملفات";
        content.innerHTML = `<p class="empty-state">لا توجد ملفات مرفقة.</p>`;
    } else if(tab === 'v-history') {
        document.getElementById('btn-v').classList.add('active');
        title.innerText = "📅 سجل الزيارات الميدانية";
        
        const visits = JSON.parse(localStorage.getItem('asgate_visits_final_v21') || '[]').filter(v => v.comp === clientName);
        
        if (visits.length > 0) {
            let tableHTML = `
                <div class="table-responsive">
                    <table class="modern-table">
                        <thead><tr><th>التاريخ</th><th>الحالة</th><th>الملاحظات</th></tr></thead>
                        <tbody>
            `;
            tableHTML += visits.map(v => `
                <tr>
                    <td style="font-family: monospace; font-size: 14px;">${v.visitDate}</td>
                    <td><span class="badge status-active">${v.status || 'مكتملة'}</span></td>
                    <td>${v.notes || '-'}</td>
                </tr>
            `).join('');
            tableHTML += `</tbody></table></div>`;
            content.innerHTML = tableHTML;
        } else {
            content.innerHTML = `<p class="empty-state">لا توجد سجلات زيارات مسجلة لهذا العميل حالياً.</p>`;
        }
    }
}
