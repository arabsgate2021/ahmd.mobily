const CUSTOMERS_STORAGE_KEY = 'asgate_customers_v2_final'; 

// 1. توليد رقم الطلب (سنة-شهر-5 أرقام)
function generateCustomOrderId() {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2); 
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    const prefix = year + month; 
    const saved = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
    let maxSequence = 0;
    saved.forEach(item => {
        if (String(item.id).startsWith(prefix)) {
            const seq = parseInt(String(item.id).slice(4), 10);
            if (!isNaN(seq) && seq > maxSequence) maxSequence = seq;
        }
    });
    return prefix + String(maxSequence + 1).padStart(5, '0');
}

// 2. البحث الشامل في المودال (الشركة، السجل، الكود)
function searchCustomerInModal(el) {
    const query = el.value.toLowerCase().trim();
    const resDiv = document.getElementById('mResults');
    const customers = JSON.parse(localStorage.getItem(CUSTOMERS_STORAGE_KEY) || '[]');
    if (query.length < 1) { resDiv.style.display='none'; return; }
    
    const filtered = customers.filter(c => 
        (c.comp || "").toLowerCase().includes(query) || 
        (c.mainRecord || "").includes(query) || 
        (c.customerCode || "").toLowerCase().includes(query)
    );
    
    resDiv.innerHTML = filtered.map(c => 
        `<div onclick="selectCustomer('${c.comp}', '${c.mainRecord}')">
            ${c.comp} | ${c.mainRecord} | كود: ${c.customerCode || '---'}
        </div>`
    ).join('');
    resDiv.style.display = filtered.length ? 'block' : 'none';
}

// 3. بناء الصف مع رابط لرقم الطلب
function renderTableRow(obj) {
    const tbody = document.getElementById('salesBody');
    const row = tbody.insertRow(-1);
    row.className = 'main-row';
    row.innerHTML = `
        <td><input type="checkbox" class="select-check"></td>
        <td><a href="order_details.html?id=${obj.id}" class="order-link">#${obj.id}</a></td>
        <td>${obj.type}</td>
        <td>${obj.comp}</td>
        <td>${obj.status}</td>
    `;
}

// دالة إضافة الطلب
function addOrderRow() {
    const comp = document.getElementById('mComp').value;
    if (!comp) { Swal.fire({icon: 'warning', text: 'يرجى اختيار شركة'}); return; }
    const data = {
        id: generateCustomOrderId(),
        type: document.getElementById('mType').value || '-',
        comp: comp,
        cr: document.getElementById('mCr').value,
        status: "معلق"
    };
    let saved = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
    saved.unshift(data);
    localStorage.setItem('asgate_sales_db', JSON.stringify(saved));
    location.reload();
}
