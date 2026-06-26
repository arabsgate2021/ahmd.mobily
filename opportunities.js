let currentActivePreview = null;
    
    const STORAGE_KEY = 'asgate_opportunities_final_v33'; 
    const LOGS_KEY = 'asgate_opportunities_logs_v33';
    const INCOMING_KEY = 'asgate_opportunities_final_v31'; 

    let saveTimeout;
    function debouncedSaveAllData() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveAllDataSilently();
            updateStats();
        }, 600);
    }

    function updateStatusStyle(selectEl) {
        if (!selectEl) return;
        const td = selectEl.parentElement;
        const tr = selectEl.closest('tr');
        
        td.classList.remove('status-cell-interested', 'status-cell-completed', 'status-cell-lost');
        tr.classList.remove('row-small-text'); 
        tr.style.height = '';
        tr.querySelectorAll('td').forEach(cell => cell.style.height = '');

        const val = selectEl.value;
        if (val === 'مهتم') {
            td.classList.add('status-cell-interested');
        } else if (val === 'مغلق رابح') {
            td.classList.add('status-cell-completed');
            tr.classList.add('row-small-text'); 
            tr.style.height = '27px';
            tr.querySelectorAll('td').forEach(cell => cell.style.height = '27px');
        } else if (val === 'مغلق خاسر') {
            td.classList.add('status-cell-lost');
            tr.classList.add('row-small-text'); 
            tr.style.height = '27px';
            tr.querySelectorAll('td').forEach(cell => cell.style.height = '27px');
        }
    }

    function getTodayFormatted() {
        const d = new Date();
        return d.toISOString().split('T')[0];
    }

    function standardizeDate(d) {
        if (!d) return getTodayFormatted();
        return d.replace(/\//g, '-');
    }

    function getTimeFormatted() {
        const d = new Date();
        return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0');
    }

    function openWhatsAppChat(el) {
        const inputEl = el.closest('.phone-cell-container').querySelector('input');
        let rawPhone = inputEl.value.trim();

        if (!rawPhone) {
            Swal.fire({icon: 'warning', title: 'تنبيه', text: 'يرجى إدخال رقم الجوال أولاً', confirmButtonText: 'حسناً', confirmButtonColor: '#3b82f6'});
            return;
        }

        let cleanNumber = rawPhone.replace(/\D/g, '');
        if (cleanNumber.startsWith('00966')) cleanNumber = cleanNumber.substring(2);
        else if (cleanNumber.startsWith('05')) cleanNumber = '966' + cleanNumber.substring(1);
        else if (cleanNumber.startsWith('5') && cleanNumber.length === 9) cleanNumber = '966' + cleanNumber;

        window.open("https://wa.me/" + cleanNumber, '_blank');
    }

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

    function addToActivityLog(fieldName, oldVal, newVal, companyName) {
        if (oldVal === newVal) return; 
        
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const d = new Date();
        let dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear();
        const cleanCompany = (companyName && companyName.toString().trim() !== "") ? companyName : "شركة غير مسماة";
        const v1 = (oldVal && oldVal.toString().trim() !== "") ? oldVal : "فارغ";
        const v2 = (newVal && newVal.toString().trim() !== "") ? newVal : "فارغ";
        
        let actionText = (fieldName === "إجراء") ? `${oldVal} لفرصة شركة ( ${cleanCompany} )` : `تغيير ${fieldName} من [${v1}] إلى [${v2}] للفرصة ( ${cleanCompany} )`;
        const fullLogHTML = `<span style="color: #64748b; font-size: 9px;"><i class="fas fa-clock"></i> ${days[d.getDay()]} ${yyyy}-${mm}-${dd} ${getTimeFormatted()}</span> &nbsp;|&nbsp; <span style="color: #0f172a; font-weight: 700;">${actionText}</span>`;
        
        let logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
        logs.unshift(fullLogHTML);
        localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
        renderActivityLog();
    }

    function renderActivityLog() {
        const list = document.getElementById('activityList');
        const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
        list.innerHTML = logs.map(log => {
            if(log.includes('||')) { 
                const parts = log.split('||');
                return `<div class="activity-item"><span style="color: #94a3b8; font-size: 9px;">${parts[0]}</span> &nbsp;|&nbsp; <span>${parts[2]}</span></div>`;
            }
            return `<div class="activity-item">${log}</div>`;
        }).join('');
    }

    function updateStats() {
        const rows = document.querySelectorAll('#tableBody .main-row');
        const today = getTodayFormatted(), currentMonth = today.substring(0, 7);
        let total = rows.length, tDay = 0, tMonth = 0, valTotal = 0, valMonth = 0;
        rows.forEach(row => {
            const visitDateInput = row.querySelector('.visit-date-val');
            const expDateInput = row.querySelector('.expected-date-input');
            const oppValInput = row.querySelector('.opp-value-input');
            const oppVal = oppValInput ? parseFloat(oppValInput.value) || 0 : 0;
            valTotal += oppVal;
            
            if (visitDateInput && visitDateInput.value === today) {
                tDay++;
            }
            if (expDateInput) {
                const expDate = expDateInput.value;
                if (expDate && expDate.startsWith(currentMonth)) {
                    tMonth++;
                    valMonth += oppVal;
                }
            }
        });
        document.getElementById('stat-total').innerText = total;
        document.getElementById('stat-today').innerText = tDay;
        document.getElementById('stat-month').innerText = tMonth;
        document.getElementById('stat-value-total').innerText = valTotal.toLocaleString() + ' ر.س';
        document.getElementById('stat-value-month').innerText = valMonth.toLocaleString() + ' ر.س';
    }

    function applyDateAlerts() {
        const todayStr = getTodayFormatted();
        const t1 = new Date(todayStr + "T00:00:00").getTime();

        document.querySelectorAll('.main-row').forEach(row => {
            const dateInput = row.querySelector('.expected-date-input');
            const statusSelect = row.querySelector('.status-select');
            if (!dateInput || !statusSelect) return;

            const targetDateStr = dateInput.value;
            const currentStatus = statusSelect.value;

            // تنظيف الكلاسات القديمة والجديدة بالكامل لمنع التضارب والتراكم
            dateInput.classList.remove('text-warning-yellow', 'text-danger-red', 'date-alert-yellow', 'date-alert-orange', 'date-alert-red');

            // الاستثناء التقني: إذا كانت الفرصة مقفلة رابحة أو خاسرة، لا ينطبق عليها أي تنبيه
            if (currentStatus === 'مغلق رابح' || currentStatus === 'مغلق خاسر' || !targetDateStr) return;

            const t2 = new Date(targetDateStr + "T00:00:00").getTime();
            const diffDays = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                // إذا فات وتخطى تاريخ الاستحقاق
                dateInput.classList.add('date-alert-red');
            } else if (diffDays === 0) {
                // في نفس اليوم الحالي للاستحقاق تماماً
                dateInput.classList.add('date-alert-orange');
            } else if (diffDays === 1 || diffDays === 2 || diffDays === 3) {
                // متبقي 3 أيام أو يومين أو يوم واحد قبل الاستحقاق
                dateInput.classList.add('date-alert-yellow');
            }
        });
    }

    function reorderRows() {
        const tbody = document.getElementById('tableBody');
        const rows = Array.from(tbody.querySelectorAll('.main-row'));
        const today = getTodayFormatted(), currentMonth = today.substring(0, 7);
        
        const rowsData = rows.map(row => ({
            row: row, subRow: document.getElementById('sub-' + row.id),
            date: row.querySelector('.expected-date-input').value || '9999-12-31'
        }));

        // فرز تنازلي حسب التاريخ لضمان الترتيب الزمني الصحيح
        rowsData.sort((a, b) => b.date.localeCompare(a.date));

        const groups = {};
        rowsData.forEach(item => {
            const month = item.date.substring(0, 7); 
            if (!groups[month]) groups[month] = [];
            groups[month].push(item);
        });

        tbody.innerHTML = '';
        const fragment = document.createDocumentFragment();

        // سحب وتأمين الأشهر المتاحة وفرزها
        const sortedMonths = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        
        // إجبار الشهر الاستهدافي الحالي على القفز والصعود في القمة والبداية دائماً
        const currentMonthIndex = sortedMonths.indexOf(currentMonth);
        if (currentMonthIndex > -1) {
            sortedMonths.splice(currentMonthIndex, 1);
            sortedMonths.unshift(currentMonth);
        }

        sortedMonths.forEach(month => {
            const sepRow = document.createElement('tr'); sepRow.className = 'month-separator';
            const isCurrentMonth = (month === currentMonth);
            
            if (isCurrentMonth) sepRow.id = 'current-month-separator'; 

            // دمج الكلاس المخصص المشرق والمنظم للشهر الاستهدافي بدقة بدون المساس بتناسق اللوحة
            sepRow.innerHTML = `<td colspan="14"><div class="sep-text ${isCurrentMonth ? 'current-month-sep' : ''}"><i class="far fa-calendar-alt"></i> الاستهداف لشهر ${month}</div></td>`;
            fragment.appendChild(sepRow);

            groups[month].forEach(item => { fragment.appendChild(item.row); if(item.subRow) fragment.appendChild(item.subRow); });
        });
        
        tbody.appendChild(fragment);
        applyDateAlerts();
    }

    function calculateOpportunityTotal(rowId) {
        const subRow = document.getElementById('sub-' + rowId); if (!subRow) return;
        let grandTotal = 0;
        subRow.querySelectorAll('.product-body tr').forEach(pRow => {
            const qtyInput = pRow.querySelector('.prod-qty'), subInput = pRow.querySelector('.prod-sub'), totalInput = pRow.querySelector('.prod-total');
            let qty = parseFloat(qtyInput.value) || 0, sub = parseFloat(subInput.value) || 0;
            const rowTotal = qty * sub; totalInput.value = rowTotal > 0 ? rowTotal : ''; grandTotal += rowTotal;
        });
        const mainRow = document.getElementById(rowId);
        if (mainRow) { const oppValueInput = mainRow.querySelector('.opp-value-input'); if (oppValueInput) oppValueInput.value = grandTotal > 0 ? grandTotal : ''; }
        debouncedSaveAllData();
    }

    function renderRow(v = {}, prepend = false) {
        const tbody = document.getElementById('tableBody');
        const rowId = 'row-' + Date.now() + Math.random().toString(36).substr(2, 5);
        const mainRow = document.createElement('tr'); mainRow.className = 'main-row'; mainRow.id = rowId;
        const subRow = document.createElement('tr'); subRow.className = 'sub-table-row'; subRow.id = 'sub-' + rowId;

        const today = getTodayFormatted();
        const oppDate = standardizeDate(v.oppDate || today);
        const notesJson = v.notes || "[]";
        const lastNoteText = getLastNoteOnlyFromJSON(notesJson);

        mainRow.innerHTML = `
            <td class="col-select"><input type="checkbox" class="select-check"><span class="toggle-arrow" onclick="toggleSubTable('${rowId}')"><i class="fas fa-caret-left"></i></span></td>
            <td><input type="text" class="excel-input" value="${v.comp || ''}" data-old="${v.comp || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('الشركة', this.dataset.old, this.value, this.value); this.dataset.old=this.value;"></td>
            <td><input type="text" class="excel-input" value="${v.address || ''}" data-old="${v.address || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('العنوان', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
            <td><input type="text" class="excel-input" value="${v.mgr || ''}" data-old="${v.mgr || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('المسؤول', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
            <td><div class="phone-cell-container"><a class="whatsapp-icon-btn" onclick="openWhatsAppChat(this)" title="مراسلة عبر واتساب"><i class="fa-brands fa-whatsapp"></i></a><input type="text" class="excel-input" value="${v.mob || ''}" data-old="${v.mob || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, ''); debouncedSaveAllData();" onfocus="this.dataset.old=this.value" onblur="addToActivityLog('رقم التواصل', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></div></td>
            <td><input type="text" class="excel-input" value="${v.email || ''}" data-old="${v.email || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('الإيميل', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
            <td><input type="text" class="excel-input" value="${v.record || ''}" data-old="${v.record || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, ''); debouncedSaveAllData();" onfocus="this.dataset.old=this.value" onblur="addToActivityLog('السجل', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
            <td><input type="text" class="excel-input readonly-input" dir="ltr" value="${oppDate}" readonly style="color:var(--text-muted); font-weight:700;"><input type="hidden" class="visit-date-val" value="${oppDate}"></td>
            <td><input type="text" class="excel-input cur-serv-val" value="${v.curServ || ''}" data-old="${v.curServ || ''}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('الخدمة المقترحة', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;" onmouseenter="showStatusTooltip(this)" onmouseleave="hideStatusTooltip()"></td>
            <td><input type="number" class="excel-input opp-value-input readonly-input" value="${v.oppValue || ''}" readonly style="color:var(--accent-blue); font-weight:800; cursor:not-allowed; background: transparent;"></td>
            <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${notesJson.replace(/'/g, "&apos;")}' id="preview-${Date.now()}">${lastNoteText}</div></td>
            <td>
                <select class="status-select" data-old="${v.status || 'مهتم'}" onfocus="this.dataset.old=this.value" onchange="handleStatusChange(this, '${rowId}')">
                    <option value="مهتم" ${v.status === 'مهتم' || !v.status ? 'selected' : ''}>مهتم</option>
                    <option value="مغلق رابح" ${v.status === 'مغلق رابح' ? 'selected' : ''}>مغلق رابح</option>
                    <option value="مغلق خاسر" ${v.status === 'مغلق خاسر' ? 'selected' : ''}>مغلق خاسر</option>
                </select>
            </td>
            <td><input type="date" class="excel-input expected-date-input" value="${v.expectedDate || today}" data-old="${v.expectedDate || today}" onfocus="this.dataset.old=this.value" onchange="handleDateChange(this)"></td>
            <td><input type="text" class="excel-input" value="${v.owner || 'أحمد'}" data-old="${v.owner || 'أحمد'}" onfocus="this.dataset.old=this.value" onkeyup="debouncedSaveAllData();" onblur="addToActivityLog('المالك', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
        `;

        subRow.innerHTML = `<td colspan="14"><div class="sub-table-container"><table class="inner-table"><thead><tr><th>نوع المنتج</th><th>التفاصيل</th><th>العدد</th><th>الاشتراك</th><th>الإجمالي</th><th style="width:75px">إجراء <button class="header-plus-btn" onclick="addProductRow('${rowId}')" title="إضافة منتج"><i class="fas fa-plus"></i></button></th></tr></thead><tbody class="product-body"></tbody></table></div></td>`;
        
        if (prepend) { tbody.insertBefore(subRow, tbody.firstChild); tbody.insertBefore(mainRow, subRow); } 
        else { tbody.appendChild(mainRow); tbody.appendChild(subRow); }

        updateStatusStyle(mainRow.querySelector('.status-select'));
        
        if (v.products && v.products.length > 0) v.products.forEach(p => addProductRow(rowId, p)); 
        else addProductRow(rowId);
        
        calculateOpportunityTotal(rowId);
    }

    async function handleStatusChange(selectEl, rowId) {
        const newVal = selectEl.value; const oldVal = selectEl.dataset.old;
        const companyName = selectEl.closest('tr').cells[1].querySelector('input').value;

        updateStatusStyle(selectEl);
        addToActivityLog('الحالة', oldVal, newVal, companyName);
        saveAllDataSilently(); updateStats(); reorderRows();
        selectEl.dataset.old = newVal;
    }

    function handleDateChange(dateEl) {
        const newVal = dateEl.value; const oldVal = dateEl.dataset.old;
        const companyName = dateEl.closest('tr').cells[1].querySelector('input').value;
        addToActivityLog('التاريخ المتوقع', oldVal, newVal, companyName);
        saveAllDataSilently(); reorderRows();
        dateEl.dataset.old = newVal;
    }

    function toggleSubTable(rowId) {
        const subRow = document.getElementById('sub-' + rowId);
        const arrow = document.querySelector(`#${rowId} .toggle-arrow`);
        const isOpen = subRow.style.display === 'table-row';
        subRow.style.display = isOpen ? 'none' : 'table-row';
        if(isOpen) { arrow.classList.remove('arrow-open'); arrow.innerHTML = '<i class="fas fa-caret-left"></i>'; }
        else { arrow.classList.add('arrow-open'); arrow.innerHTML = '<i class="fas fa-caret-down"></i>'; }
    }

    function addProductRow(rowId, data = {}) {
        const tbody = document.querySelector(`#sub-${rowId} .product-body`); const row = tbody.insertRow();
        row.innerHTML = `<td><select onchange="debouncedSaveAllData()"><option value="">-</option><option value="جوال" ${data.type === 'جوال' ? 'selected' : ''}>جوال</option><option value="بيانات" ${data.type === 'بيانات' ? 'selected' : ''}>بيانات</option><option value="هاتف" ${data.type === 'هاتف' ? 'selected' : ''}>هاتف</option><option value="فايبر نت" ${data.type === 'فايبر نت' ? 'selected' : ''}>فايبر نت</option><option value="DIA" ${data.type === 'DIA' ? 'selected' : ''}>DIA</option><option value="IPVPN" ${data.type === 'IPVPN' ? 'selected' : ''}>IPVPN</option><option value="SIP" ${data.type === 'SIP' ? 'selected' : ''}>SIP</option></select></td><td><input type="text" value="${data.desc || ''}" onkeyup="debouncedSaveAllData()"></td><td><input type="number" class="prod-qty" min="0" value="${data.qty || ''}" onkeyup="calculateOpportunityTotal('${rowId}')" oninput="calculateOpportunityTotal('${rowId}')"></td><td><input type="number" class="prod-sub" min="0" value="${data.sub || ''}" onkeyup="calculateOpportunityTotal('${rowId}')" oninput="calculateOpportunityTotal('${rowId}')"></td><td><input type="number" class="prod-total readonly-input" value="${data.total || ''}" readonly style="color:var(--text-muted); font-weight:700; cursor:not-allowed;"></td><td><div style="display:flex; justify-content:center; gap:5px;"><button class="sub-action-btn" title="حذف" onclick="if(this.closest('tbody').rows.length > 1) { this.closest('tr').remove(); calculateOpportunityTotal('${rowId}'); }"><i class="fas fa-trash-alt" style="font-size:10px;"></i></button></div></td>`;
    }

    function toggleAllCheckboxes(source) { document.querySelectorAll('.select-check').forEach(chk => chk.checked = source.checked); }
    function toggleDropdown(e, btn) { e.stopPropagation(); const menu = btn.nextElementSibling; document.querySelectorAll('.dropdown-menu').forEach(m => { if(m !== menu) m.classList.remove('show'); }); menu.classList.toggle('show'); }

    async function handleBulkAction(action) {
        const selected = document.querySelectorAll('.select-check:checked');
        if (selected.length === 0) { 
            Swal.fire({icon: 'info', text: 'يرجى تحديد صف واحد على الأقل', confirmButtonText: 'حسناً', confirmButtonColor: '#3b82f6'}); 
            return; 
        }
        
        if (action === 'حذف') {
            const result = await Swal.fire({ title: 'تأكيد الحذف؟', text: "سيتم حذف الفرص المحددة نهائياً من النظام!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#94a3b8', confirmButtonText: 'نعم، احذف', cancelButtonText: 'إلغاء' });
            if (result.isConfirmed) {
                selected.forEach(chk => { const row = chk.closest('tr'); const id = row.id; addToActivityLog('إجراء', 'حذف الفرصة البيعية', '', row.cells[1].querySelector('input').value); row.remove(); if(document.getElementById('sub-' + id)) document.getElementById('sub-' + id).remove(); });
                saveAllDataSilently(); updateStats(); reorderRows(); Swal.fire({icon: 'success', title: 'تم الحذف', showConfirmButton: false, timer: 1500});
            }
        } else if (action === 'تصدير') {
            exportToExcel(selected);
            addToActivityLog('إجراء', 'تصدير بيانات الفرص للإكسيل', '', 'مجموعة محددة');
        } else if (action === 'طباعة') {
            printSelected(selected);
            addToActivityLog('إجراء', 'طباعة تقرير الفرص', '', 'مجموعة محددة');
        } else { 
            selected.forEach(chk => { const row = chk.closest('tr'); addToActivityLog('إجراء', action, '', row.cells[1].querySelector('input').value); });
            Swal.fire({icon: 'success', title: 'تم', text: 'تم تنفيذ الإجراء على ' + selected.length + ' صف', showConfirmButton: false, timer: 1500});
        }
    }

    function exportToExcel(selectedRows) {
        let csvContent = "\uFEFF"; 
        csvContent += "الشركة,العنوان,المسؤول,رقم التواصل,الإيميل,السجل,تاريخ الزيارة الأصلية,الخدمة المقترحة,قيمة الفرصة,الحالة,التاريخ المتوقع,المالك\n";
        
        selectedRows.forEach(chk => {
            const row = chk.closest('tr');
            const getVal = (index) => {
                const input = row.cells[index].querySelector('input, select');
                let val = input ? input.value.replace(/"/g, '""') : '';
                return `"${val}"`; 
            };
            
            const rowData = [
                getVal(1), getVal(2), getVal(3), getVal(4), getVal(5), 
                getVal(6), getVal(7), getVal(8), getVal(9), getVal(11), getVal(12), getVal(13)
            ];
            csvContent += rowData.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "تقرير_الفرص_البيعية_" + getTodayFormatted() + ".csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function printSelected(selectedRows) {
        let printWindow = window.open('', '_blank');
        let html = `
            <html dir="rtl">
            <head>
                <title>تقرير الفرص البيعية المحددة</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; padding: 20px; color: #0f172a; }
                    h2 { text-align: center; color: #4c1d95; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { background-color: #f1f5f9; color: #1e293b; padding: 10px; border: 1px solid #cbd5e1; font-weight: 700; }
                    td { padding: 8px; border: 1px solid #cbd5e1; text-align: center; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    .footer { margin-top: 30px; text-align: left; font-size: 10px; color: #64748b; }
                </style>
            </head>
            <body>
                <h2>تقرير الفرص البيعية (ASGate CRM)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>الشركة</th><th>المسؤول</th><th>رقم التواصل</th>
                            <th>الخدمة المقترحة</th><th>التاريخ المتوقع</th><th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        selectedRows.forEach(chk => {
            const row = chk.closest('tr');
            const getVal = (index) => row.cells[index].querySelector('input, select')?.value || '';
            html += `<tr>
                <td><strong>${getVal(1)}</strong></td>
                <td>${getVal(3)}</td>
                <td dir="ltr">${getVal(4)}</td>
                <td>${getVal(8)}</td>
                <td>${getVal(12)}</td>
                <td>${getVal(11)}</td>
            </tr>`;
        });

        html += `
                    </tbody>
                </table>
                <div class="footer">تاريخ الطباعة: ${getTodayFormatted()} - تم الإنشاء بواسطة نظام ASGate CRM</div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }

    function saveAllDataSilently() {
        const data = [];
        document.querySelectorAll('.main-row').forEach(row => {
            const id = row.id; const products = []; const subRow = document.getElementById('sub-' + id);
            if(subRow) { subRow.querySelectorAll('.product-body tr').forEach(pRow => { const inputs = pRow.querySelectorAll('input, select'); products.push({ type: inputs[0].value, desc: inputs[1].value, qty: inputs[2].value, sub: inputs[3].value, total: inputs[4].value }); }); }
            data.push({ 
                comp: row.cells[1].querySelector('input').value, address: row.cells[2].querySelector('input').value, 
                mgr: row.cells[3].querySelector('input').value, mob: row.cells[4].querySelector('input').value, 
                email: row.cells[5].querySelector('input').value, record: row.cells[6].querySelector('input').value, 
                oppDate: row.querySelector('.visit-date-val').value, curServ: row.querySelector('.cur-serv-val').value, 
                oppValue: row.querySelector('.opp-value-input').value, notes: row.querySelector('.notes-preview').getAttribute('data-full-notes') || '[]', 
                status: row.querySelector('.status-select').value, expectedDate: row.querySelector('.expected-date-input').value, 
                owner: row.cells[13].querySelector('input').value, products: products 
            });
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function checkIncomingOpportunities() {
        try {
            const incomingData = localStorage.getItem(INCOMING_KEY);
            if (incomingData) {
                const newOpps = JSON.parse(incomingData);
                if (Array.isArray(newOpps) && newOpps.length > 0) {
                    newOpps.forEach(opp => { 
                        if (!opp.expectedDate) opp.expectedDate = getTodayFormatted();
                        renderRow(opp); 
                        addToActivityLog("إجراء", "تأهيل وتصدير الفرصة البيعية من شاشة الزيارات", "", opp.comp); 
                    });
                    saveAllDataSilently();
                }
                localStorage.removeItem(INCOMING_KEY);
            }
        } catch (e) { localStorage.removeItem(INCOMING_KEY); }
    }

    function loadSavedData() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) { 
            document.getElementById('tableBody').innerHTML = ''; 
            JSON.parse(saved).forEach(v => renderRow(v)); 
        }
        checkIncomingOpportunities();
        renderActivityLog(); updateStats(); reorderRows();
        
        // خاصية القفز التلقائي والانزلاق الذكي لشهر الاستهداف الحالي
        setTimeout(() => {
            const currentMonthSep = document.getElementById('current-month-separator');
            const tableWrapper = document.querySelector('.table-wrapper');
            if (currentMonthSep && tableWrapper) {
                tableWrapper.scrollTo({
                    top: currentMonthSep.offsetTop,
                    behavior: 'smooth'
                });
            }
        }, 400);
    }

    let searchTimeout;
    function debouncedFilterTable() { clearTimeout(searchTimeout); searchTimeout = setTimeout(filterTable, 300); }

    function filterTable() {
        const q = document.getElementById('searchInput').value.toLowerCase().trim();
        const statusQ = document.getElementById('statusFilter').value;
        
        document.querySelectorAll('.main-row').forEach(row => {
            const comp = row.cells[1].querySelector('input').value.toLowerCase();
            const mgr = row.cells[3].querySelector('input').value.toLowerCase();
            const mob = row.cells[4].querySelector('input').value.toLowerCase();
            const email = row.cells[5].querySelector('input').value.toLowerCase();
            const record = row.cells[6].querySelector('input').value.toLowerCase();
            const subRow = document.getElementById('sub-' + row.id);
            
            const matchesText = comp.includes(q) || mgr.includes(q) || mob.includes(q) || email.includes(q) || record.includes(q);
            const rowStatus = row.querySelector('.status-select').value;
            const matchesStatus = statusQ === "" || rowStatus === statusQ;

            if (matchesText && matchesStatus) { 
                row.style.display = 'table-row'; 
            } else { 
                row.style.display = 'none'; 
                if(subRow) subRow.style.display = 'none'; 
            }
        });
    }

    function showStatusTooltip(el) {
        const val = el.value || "فارغ";
        let tooltip = document.getElementById('status-custom-tooltip');
        if(!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'status-custom-tooltip';
            tooltip.style.position = 'absolute';
            tooltip.style.background = '#1e293b';
            tooltip.style.color = '#fff';
            tooltip.style.padding = '5px 10px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '11px';
            tooltip.style.fontFamily = 'Cairo';
            tooltip.style.zIndex = '3000';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
        }
        tooltip.innerText = val;
        tooltip.style.display = 'block';
        
        const rect = el.getBoundingClientRect();
        tooltip.style.top = (rect.top + window.scrollY - tooltip.offsetHeight - 6) + 'px';
        tooltip.style.left = (rect.left + window.scrollX + (rect.width/2) - (tooltip.offsetWidth/2)) + 'px';
    }

    function hideStatusTooltip() {
        const tooltip = document.getElementById('status-custom-tooltip');
        if(tooltip) tooltip.style.display = 'none';
    }

    function getLastNoteOnlyFromJSON(jsonStr) {
        try { const arr = JSON.parse(jsonStr); return arr.length > 0 ? arr[arr.length - 1].text : 'تحديث المتابعة...'; } 
        catch(e) { 
            if(jsonStr && typeof jsonStr === 'string' && jsonStr.trim() !== "") { const parts = jsonStr.split('\n--------------------\n'); const last = parts[parts.length - 1]; if(last.includes('||')) return last.split('||')[1] || ""; return last; }
            return 'تحديث المتابعة...'; 
        }
    }

    function openNote(el) {
        currentActivePreview = el; const raw = el.getAttribute('data-full-notes') || "[]"; let arr = []; 
        try { arr = JSON.parse(raw); } 
        catch(e) { 
            arr = [];
            if(raw.trim() !== "") { raw.split('\n--------------------\n').forEach(entry => { if(entry.includes('||')) { const parts = entry.split('||'); arr.push({user: "النظام", date: "", time: "", text: parts[1]}); } else { arr.push({user: "النظام", date: "", time: "", text: entry}); } }); }
        }
        let htmlContent = arr.map(msg => `<div class="chat-msg-block"><span class="chat-msg-header"><span><i class="fas fa-user-circle"></i> ${msg.user}</span> <span style="font-weight: 600; color:#94a3b8; font-size:9px;">${msg.date} ${msg.time}</span></span><span class="chat-msg-text">${msg.text}</span></div>`).join('');
        document.getElementById('historyLog').innerHTML = htmlContent;
        document.getElementById('noteModal').style.display = "flex";
        document.getElementById('modalTextArea').focus();
    }

    function saveNote() {
        const txt = document.getElementById('modalTextArea').value.trim();
        if (txt && currentActivePreview) {
            const raw = currentActivePreview.getAttribute('data-full-notes') || "[]"; let arr = []; 
            try { arr = JSON.parse(raw); } catch(e) { arr = []; }
            const d = new Date();
            arr.push({ user: document.querySelector('.main-row').cells[13].querySelector('input').value || "المستخدم", date: getTodayFormatted(), time: getTimeFormatted(), text: txt });
            currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr));
            currentActivePreview.innerText = txt;
            saveAllDataSilently();
        }
        closeNote();
    }

    function closeNote() { document.getElementById('noteModal').style.display = "none"; document.getElementById('modalTextArea').value = ""; }

    window.onclick = (e) => { if (!e.target.matches('.btn-bulk-trigger') && !e.target.matches('.fa-chevron-down')) document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show')); };
