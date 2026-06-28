let currentOrderId = new URLSearchParams(window.location.search).get('id');
const statusOptions = ["جديد", "مكتمل", "تم التوثيق", "معلق", "جاهز", "مرتجع", "فقدان"];

let currentActivePreview = null;
let currentActiveOriginalIndex = null;
const LOGS_KEY = 'asgate_order_logs_' + currentOrderId;

let currentStatusFilterValue = "all";

function formatNumberWithOneDecimal(num) {
    return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
}

function toggleLogHeight() {
    const section = document.getElementById('activityLogSection');
    const btn = document.getElementById('toggleExpandBtn');
    if (section.classList.contains('expanded')) {
        section.classList.remove('expanded');
        btn.innerText = '⤢';
    } else {
        section.classList.add('expanded');
        btn.innerText = '⤡';
    }
}

function getTodayFormatted() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function generateStyledHeaderForNotes() {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const d = new Date();
    const timeFormatted = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `<span class="activity-header-part">👤 أحمد  🗓️ ${days[d.getDay()]}  ${getTodayFormatted()}  <span class="activity-time-part">${timeFormatted}</span></span>`;
}

function generateInlineHeaderHTML() {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const d = new Date();
    const timeFormatted = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `<span class="activity-header-part">👤 أحمد &nbsp;🗓️ ${days[d.getDay()]} &nbsp;${getTodayFormatted()} &nbsp;<span class="activity-time-part">${timeFormatted}</span></span>`;
}

function addToActivityLog(fieldName, oldVal, newVal, productIdentifier) {
    const allowedFields = ["تفاصيل المنتج", "العدد", "الاشتراك", "رقم السريال", "رقم الخدمة", "هوية المستخدم", "الحالة", "إضافة منتج جديد", "زر إجراء"];
    if (!allowedFields.includes(fieldName)) return; 

    if (oldVal === newVal && fieldName !== "إضافة منتج جديد" && fieldName !== "زر إجراء") return;
    const headerHTML = generateInlineHeaderHTML();
    
    let actionText = "";
    if (fieldName === "إضافة منتج جديد") {
        const cleanId = (productIdentifier && String(productIdentifier).trim() !== "") ? productIdentifier : "بدون رقم";
        actionText = `إضافة منتج جديد: ${newVal} للمنتج (${cleanId})`;
    } else if (fieldName === "زر إجراء") {
        actionText = `تم تنفيذ إجراء: [${newVal}] على الطلب الحالي`;
    } else {
        const cleanId = (productIdentifier && String(productIdentifier).trim() !== "") ? productIdentifier : "بدون رقم";
        const val1 = (oldVal && String(oldVal).trim() !== "") ? oldVal : "فارغ";
        const val2 = (newVal && String(newVal).trim() !== "") ? newVal : "فارغ";
        actionText = `تغيير ${fieldName} من [${val1}] إلى [${val2}] للمنتج (${cleanId})`;
    }
    
    const fullLogHTML = `<div class="activity-row-inline">${headerHTML} &nbsp; <span class="activity-text-part">${actionText}</span></div>`;
    
    let logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    logs.unshift(fullLogHTML);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
    renderActivityLog();
}

function triggerActionLog(actionType) {
    if (actionType === 'تعديل البيانات الأساسية للطلب') {
        alert('تعديل البيانات الأساسية للطلب');
        addToActivityLog('زر إجراء', '', 'تعديل البيانات الأساسية للطلب', '');
    } else if (actionType === 'تصدير Excel') {
        exportToExcel();
        addToActivityLog('زر إجراء', '', 'تصدير لملف Excel', '');
    } else if (actionType === 'طباعة') {
        addToActivityLog('زر إجراء', '', 'طباعة الصفحة', '');
        window.print();
    } else if (actionType === 'حذف المختار') {
        deleteSelected();
    }
}

function renderActivityLog() {
    const list = document.getElementById('activityList');
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    list.innerHTML = logs.map(log => `<div class="activity-item">${log}</div>`).join('');
}

function loadOrderDetails() {
    if (!currentOrderId) return;
    const sales = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
    const order = sales.find(o => String(o.id) === String(currentOrderId));
    if (order) {
        document.getElementById('orderId').innerText = '#' + order.id;
        document.getElementById('orderComp').innerText = order.comp;
        document.getElementById('orderCr').innerText = order.cr;
        document.getElementById('orderType').innerText = order.type;
        document.getElementById('orderStatus').innerText = order.status;
        renderProducts();
        renderActivityLog();
    }
}

function validateNumberInput(el, isFloat = false) {
    let originalText = el.innerText;
    let cleanedText = originalText;
    if (isFloat) {
        cleanedText = originalText.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
    } else {
        cleanedText = originalText.replace(/[^0-9]/g, '');
    }
    if (originalText !== cleanedText) {
        el.innerText = cleanedText;
        let range = document.createRange();
        let sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

function renderProducts(filtered = null) {
    const db = JSON.parse(localStorage.getItem('asgate_products_db') || '{}');
    let baseItems = db[currentOrderId] || [];
    
    if (currentStatusFilterValue !== "all") {
        baseItems = baseItems.filter(p => p.status === currentStatusFilterValue);
    }
    
    let items = (filtered || baseItems).map((p, i) => ({...p, originalIndex: i}));
    
    items.sort((a, b) => {
        if (a.status === "فقدان" && b.status !== "فقدان") return 1;
        if (a.status !== "فقدان" && b.status === "فقدان") return -1;
        let timeA = a.updatedAt || a.id || 0;
        let timeB = b.updatedAt || b.id || 0;
        return timeB - timeA;
    });
    
    updateTableHeaders(items.length > 0 ? items[0].type : "جوال");
    const tbody = document.getElementById('productsBody');
    tbody.innerHTML = '';
    
    items.forEach((p) => {
        const subVal = parseFloat(p.sub) || 0;
        let sClass = p.status === "مكتمل" ? "status-mektamel" : (p.status === "تم التوثيق" ? "status-tawtheeq" : (p.status === "معلق" ? "status-moallaq" : (p.status === "مرتجع" ? "status-mortaja" : (p.status === "فقدان" ? "status-faqd" : ""))));
        const isLocked = ["مكتمل", "تم التوثيق", "معلق"].includes(p.status);
        const isLost = p.status === "فقدان";

        const notes = p.note || '';
        const lastNoteText = getLastNoteOnly(notes);
        const pIden = p.mobile || p.serial || p.name;

        let dynamic = (p.type === "جوال" || p.type === "بيانات") ? `
            <td contenteditable="${!isLocked && !isLost}" data-old="${p.serial||''}" onfocus="this.setAttribute('data-old', this.innerText)" oninput="validateNumberInput(this, false)" onblur="if(this.getAttribute('data-old')!=this.innerText){ addToActivityLog('رقم السريال', this.getAttribute('data-old'), this.innerText, '${pIden}'); updateField(${p.originalIndex},'serial',this.innerText); }">${p.serial||''}</td>
            <td contenteditable="${!isLocked && !isLost}" data-old="${p.mobile||''}" onfocus="this.setAttribute('data-old', this.innerText)" oninput="validateNumberInput(this, false)" onblur="if(this.getAttribute('data-old')!=this.innerText){ addToActivityLog('رقم الخدمة', this.getAttribute('data-old'), this.innerText, '${pIden}'); updateField(${p.originalIndex},'mobile',this.innerText); }">${p.mobile||''}</td>
            <td contenteditable="${!isLocked && !isLost}" data-old="${p.user||''}" onfocus="this.setAttribute('data-old', this.innerText)" oninput="validateNumberInput(this, false)" onblur="if(this.getAttribute('data-old')!=this.innerText){ addToActivityLog('هوية المستخدم', this.getAttribute('data-old'), this.innerText, '${pIden}'); updateField(${p.originalIndex},'user',this.innerText); }">${p.user||''}</td>` : `
            <td contenteditable="${!isLocked && !isLost}" data-old="${p.sai||''}" onfocus="this.setAttribute('data-old', this.innerText)" onblur="if(this.getAttribute('data-old')!=this.innerText){ updateField(${p.originalIndex},'sai',this.innerText); }">${p.sai||''}</td>
            <td contenteditable="${!isLocked && !isLost}" data-old="${p.coords||''}" onfocus="this.setAttribute('data-old', this.innerText)" onblur="if(this.getAttribute('data-old')!=this.innerText){ updateField(${p.originalIndex},'coords',this.innerText); }">${p.coords||''}</td>
            <td contenteditable="${!isLocked && !isLost}" data-old="${p.city||''}" onfocus="this.setAttribute('data-old', this.innerText)" onblur="if(this.getAttribute('data-old')!=this.innerText){ updateField(${p.originalIndex},'city',this.innerText); }">${p.city||''}</td>`;

        tbody.innerHTML += `<tr class="${isLocked ? 'row-locked' : ''} ${isLost ? 'row-is-lost' : ''}">
            <td class="not-locked"><input type="checkbox" class="row-checkbox" data-index="${p.originalIndex}" data-locked="${isLocked || isLost}" onchange=\"calculateTotals()\"></td>
            <td>${p.type}</td>
            <td contenteditable="${!isLocked && !isLost}" data-old="${p.name}" onfocus="this.setAttribute('data-old', this.innerText)" onblur="if(this.getAttribute('data-old')!=this.innerText){ addToActivityLog('تفاصيل المنتج', this.getAttribute('data-old'), this.innerText, '${pIden}'); updateField(${p.originalIndex},'name',this.innerText); }">${p.name}</td>
            <td contenteditable="${!isLocked && !isLost}" data-old="${p.qty}" onfocus="this.setAttribute('data-old', this.innerText)" oninput="validateNumberInput(this, false)" onblur="if(this.getAttribute('data-old')!=this.innerText){ addToActivityLog('العدد', this.getAttribute('data-old'), this.innerText, '${pIden}'); updateField(${p.originalIndex},'qty',this.innerText); }">${p.qty}</td>
            <td contenteditable="${!isLocked && !isLost}" data-old="${subVal.toFixed(1)}" onfocus="this.setAttribute('data-old', this.innerText)" oninput="validateNumberInput(this, true)" onblur="if(this.getAttribute('data-old')!=this.innerText){ addToActivityLog('الاشتراك', this.getAttribute('data-old'), this.innerText, '${pIden}'); updateField(${p.originalIndex},'sub',this.innerText); }">${formatNumberWithOneDecimal(subVal)}</td>
            <td style="color:var(--header-green);font-weight:800;">${formatNumberWithOneDecimal(p.qty * subVal)}</td>
            ${dynamic}
            <td><select class="status-select ${sClass}" data-old="${p.status}" onfocus="this.setAttribute('data-old', this.value)" onchange="changeStatus(${p.originalIndex},this.value)">
                ${statusOptions.map(s=>`<option value="${s}" ${p.status===s?'selected':''}>${s}</option>`).join('')}</select></td>
            <td style="font-size:10px">${p.date}</td>
            <td class="not-locked"><div class="notes-preview" onclick="openNote(this, ${p.originalIndex})" data-full-notes='${notes.replace(/'/g, "&apos;")}' id="preview-${Date.now()}-${p.originalIndex}">${lastNoteText}</div></td></tr>`;
    });
    calculateTotals();
    updateStatsBox();
}

function updateTableHeaders(type) {
    const header = document.getElementById('dynamicHeader');
    let dynamic = (type === "جوال" || type === "بيانات") ? `<th>رقم السريال</th><th>رقم الخدمة</th><th>هوية المستخدم</th>` : `<th>رقم الكبينة</th><th>الإحداثيات</th><th>المدينة</th>`;
    header.innerHTML = `<th style="width: 30px;"><input type="checkbox" id="checkAllBox" onclick="toggleAll(this)"></th><th style="width:100px;">نوع المنتج</th><th>تفاصيل المنتج</th><th style="width:50px;">العدد</th><th style="width:80px;">الاشتراك</th><th style="width:80px;">الإجمالي</th>${dynamic}<th style="width:110px;">الحالة <select id="colStatusFilter" class="status-header-filter" onchange="triggerStatusColumnFilter(this.value)"><option value="all" ${currentStatusFilterValue==='all'?'selected':''}>الكل</option>${statusOptions.map(opt=>`<option value="${opt}" ${currentStatusFilterValue===opt?'selected':''}>${opt}</option>`).join('')}</select></th><th style="width:80px;">تاريخ الحالة</th><th>سجل المتابعة</th>`;
}

function triggerStatusColumnFilter(val) { currentStatusFilterValue = val; applyFilters(); }

function updateStatsBox() {
    const db = JSON.parse(localStorage.getItem('asgate_products_db') || '{}')[currentOrderId] || [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let totalOkAmount = 0, totalWaitAmount = 0, monthOkAmount = 0, monthWaitAmount = 0;
    db.forEach(p => {
        const productTotal = (parseInt(p.qty) || 0) * (parseFloat(p.sub) || 0);
        if (p.status === "مكتمل") totalOkAmount += productTotal;
        if (p.status === "معلق") totalWaitAmount += productTotal;
        const parts = (p.date || "").split('/');
        if (parts.length === 3 && parseInt(parts[1]) === currentMonth && parseInt(parts[2]) === currentYear) {
            if (p.status === "مكتمل") monthOkAmount += productTotal;
            if (p.status === "معلق") monthWaitAmount += productTotal;
        }
    });
    document.getElementById('stat_total_ok').innerText = formatNumberWithOneDecimal(totalOkAmount);
    document.getElementById('stat_total_wait').innerText = formatNumberWithOneDecimal(totalWaitAmount);
    document.getElementById('stat_month_ok').innerText = formatNumberWithOneDecimal(monthOkAmount);
    document.getElementById('stat_month_wait').innerText = formatNumberWithOneDecimal(monthWaitAmount);
}

function updateField(idx, f, v) {
    let db = JSON.parse(localStorage.getItem('asgate_products_db') || '{}');
    let item = db[currentOrderId][idx];
    item[f] = v.trim(); 
    item.updatedAt = Date.now(); 
    item.date = new Date().toLocaleDateString('en-GB');
    localStorage.setItem('asgate_products_db', JSON.stringify(db));
    if(['qty','sub'].includes(f)) syncSumsToSales();
    renderProducts();
}

function changeStatus(idx, s) {
    let db = JSON.parse(localStorage.getItem('asgate_products_db') || '{}');
    let item = db[currentOrderId][idx];
    const oldS = item.status;
    if (["مكتمل", "تم التوثيق", "معلق"].includes(s) && !confirm("تنبيه: سيتم قفل هذا صف. هل أنت متأكد؟")) { renderProducts(); return; }
    
    const pIden = item.mobile || item.serial || item.name;
    addToActivityLog('الحالة', oldS, s, pIden);
    item.status = s; 
    item.updatedAt = Date.now(); 
    item.date = new Date().toLocaleDateString('en-GB');
    localStorage.setItem('asgate_products_db', JSON.stringify(db));
    syncSumsToSales(); 
    renderProducts();
}

function deleteSelected() {
    const chks = document.querySelectorAll('.row-checkbox:checked');
    if(chks.length===0) return;
    const validIdxs = Array.from(chks).filter(c => c.dataset.locked === "false").map(c => parseInt(c.dataset.index));
    if (validIdxs.length === 0) { alert("لا يمكن حذف الصفوف المغلقة"); return; }
    if(!confirm(`حذف (${validIdxs.length}) منتجات؟`)) return;
    let db = JSON.parse(localStorage.getItem('asgate_products_db') || '{}');
    
    validIdxs.forEach(originalIdx => {
        const item = db[currentOrderId][originalIdx];
        const pIden = item.mobile || item.serial || item.name;
        addToActivityLog('زر إجراء', '', `حذف المنتج: ${item.name} (${pIden})`, pIden);
    });

    db[currentOrderId] = db[currentOrderId].filter((_, i) => !validIdxs.includes(i));
    localStorage.setItem('asgate_products_db', JSON.stringify(db));
    syncSumsToSales(); renderProducts();
}

function openNote(el, originalIdx) {
    currentActivePreview = el;
    currentActiveOriginalIndex = originalIdx;
    const raw = el.getAttribute('data-full-notes') || "";
    document.getElementById('historyLog').innerHTML = raw.split('\n--------------------\n').map(e => `<div class="activity-item">${e}</div>`).join('');
    document.getElementById('noteModal').style.display = "flex";
    document.getElementById('modalTextArea').focus();
}

function saveNote() {
    const newText = document.getElementById('modalTextArea').value.trim();
    if (newText && currentActivePreview && currentActiveOriginalIndex !== null) {
        let oldNotes = currentActivePreview.getAttribute('data-full-notes') || "";
        let newEntry = `${generateStyledHeaderForNotes()}<span class="activity-text-part">${newText}</span>`;
        let updatedFullNotes = oldNotes === "" ? newEntry : oldNotes + "\n--------------------\n" + newEntry;
        currentActivePreview.setAttribute('data-full-notes', updatedFullNotes);
        currentActivePreview.innerText = newText;
        let db = JSON.parse(localStorage.getItem('asgate_products_db') || '{}');
        const item = db[currentOrderId][currentActiveOriginalIndex];
        item.note = updatedFullNotes;
        item.updatedAt = Date.now();
        localStorage.setItem('asgate_products_db', JSON.stringify(db));
        renderProducts();
    }
    closeNote();
}

function closeNote() { 
    document.getElementById('noteModal').style.display = "none"; 
    document.getElementById('modalTextArea').value = ""; 
}

function getLastNoteOnly(fullNotes) {
    if (!fullNotes) return "أضف ملاحظة...";
    const parts = fullNotes.split('\n--------------------\n');
    const lastPart = parts[parts.length - 1];
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = lastPart;
    return tempDiv.querySelector('.activity-text-part')?.innerText || "أضف ملاحظة...";
}

function syncSumsToSales() {
    const items = JSON.parse(localStorage.getItem('asgate_products_db') || '{}')[currentOrderId] || [];
    let tot = items.reduce((acc, p) => acc + (p.qty * p.sub), 0);
    document.getElementById('orderTotalSum').innerText = formatNumberWithOneDecimal(tot) + " ر.س";
}

function calculateTotals() {
    const db = JSON.parse(localStorage.getItem('asgate_products_db') || '{}')[currentOrderId] || [];
    let q=0, s=0, t=0; db.forEach(p=>{ q+=parseInt(p.qty)||0; s+=parseFloat(p.sub)||0; t+=(p.qty*p.sub); });
    document.getElementById('f_selection').innerText = document.querySelectorAll('.row-checkbox:checked').length;
    document.getElementById('f_count').innerText = db.length; 
    document.getElementById('f_qty').innerText = q; 
    document.getElementById('f_sub').innerText = formatNumberWithOneDecimal(s); 
    document.getElementById('f_total').innerText = formatNumberWithOneDecimal(t);
}

function saveProduct() {
    const type = document.getElementById('p_type').value, name = document.getElementById('p_name').value || "بدون تفاصيل", qty = parseInt(document.getElementById('p_qty').value) || 1, sub = parseFloat(document.getElementById('p_sub').value) || 0;
    let serial = document.getElementById('p_serial').value || "", isAuto = document.getElementById('auto_serial').checked;
    let db = JSON.parse(localStorage.getItem('asgate_products_db') || '{}');
    if(!db[currentOrderId]) db[currentOrderId] = [];
    
    const baseTime = Date.now();
    
    if(isAuto && ["جوال", "بيانات"].includes(type) && serial !== "") {
        for(let i=0; i<qty; i++){ 
            db[currentOrderId].push({ id: baseTime + i, type, name, qty:1, sub, serial, status:"جديد", date:new Date().toLocaleDateString('en-GB'), updatedAt: baseTime - i, note: "" });
            addToActivityLog('إضافة منتج جديد', '', `${name} (باقة: ${type})`, serial);
            serial = serial.replace(/(\d+)(?!.*\d)/, n => (BigInt(n)+1n).toString().padStart(n.length, '0')); 
        }
    } else { 
        const newItem = { id: baseTime, type, name, qty, sub, serial:(["جوال", "بيانات"].includes(type)?serial:""), status:"جديد", date:new Date().toLocaleDateString('en-GB'), updatedAt: baseTime, note: "" };
        db[currentOrderId].push(newItem); 
        addToActivityLog('إضافة منتج جديد', '', `${name} (باقة: ${type})`, newItem.serial || newItem.name);
    }
    localStorage.setItem('asgate_products_db', JSON.stringify(db));
    syncSumsToSales(); renderProducts(); closeModal();
}

function applyFilters() {
    const q = document.getElementById('liveSearch').value.toLowerCase().trim();
    const db = JSON.parse(localStorage.getItem('asgate_products_db') || '{}')[currentOrderId] || [];
    
    const searchFiltered = db.filter(p => {
        const matchesSearch = 
            (p.serial || '').toLowerCase().includes(q) || 
            (p.mobile || '').toLowerCase().includes(q) || 
            (p.user || '').toLowerCase().includes(q);
            
        const matchesColumnStatus = (currentStatusFilterValue === "all" || p.status === currentStatusFilterValue);
        return matchesSearch && matchesColumnStatus;
    });
    renderProducts(searchFiltered);
}

function toggleAll(s) { document.querySelectorAll('.row-checkbox').forEach(c => c.checked = s.checked); calculateTotals(); }
function openModal() { 
    document.getElementById('productModal').style.display = 'flex'; 
    document.getElementById('p_qty').value = "1";
    document.getElementById('p_sub').value = "";
    document.getElementById('p_serial').value = "";
    handleTypeChange(); 
}
function closeModal() { document.getElementById('productModal').style.display = 'none'; }
function handleTypeChange() {
    const type = document.getElementById('p_type').value;
    const isMobile = (type === "جوال" || type === "بيانات");
    document.getElementById('p_serial').disabled = !isMobile;
    document.getElementById('auto_serial').disabled = !isMobile;
}

function exportToExcel() {
    const db = JSON.parse(localStorage.getItem('asgate_products_db') || '{}')[currentOrderId] || [];
    const ws = XLSX.utils.json_to_sheet(db);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Details");
    XLSX.writeFile(wb, `Order_${currentOrderId}.xlsx`);
}
