// 1. تحديث مفتاح التخزين ليتطابق تماماً مع صفحة العملاء
const CUSTOMERS_STORAGE_KEY = 'asgate_customers_final_v1';

// ... (باقي المتغيرات والدوال السابقة تبقى كما هي) ...

// 2. تحديث دالة البحث لتقرأ البيانات (اسم الشركة والسجل) بشكل صحيح
function searchCustomerInModal(el) {
    const query = el.value.toLowerCase().trim();
    const resDiv = document.getElementById('mResults');
    
    // جلب بيانات العملاء من اللوكال ستورج الصحيح
    const customers = JSON.parse(localStorage.getItem(CUSTOMERS_STORAGE_KEY) || '[]');
    
    if (query.length < 1) { 
        resDiv.style.display = 'none'; 
        return; 
    }
    
    // البحث باستخدام اسم الشركة (comp) أو السجل (record)
    const filtered = customers.filter(c => 
        (c.comp || "").toLowerCase().includes(query) || 
        (c.record || "").includes(query)
    );
    
    // عرض النتائج في القائمة المنسدلة
    resDiv.innerHTML = filtered.map(c => 
        `<div onclick="selectCustomer('${c.comp || ''}', '${c.record || ''}')">
            <i class="far fa-building"></i> ${c.comp || 'بدون اسم'} - ${c.record || 'بدون سجل'}
        </div>`
    ).join('');
    
    resDiv.style.display = filtered.length ? 'block' : 'none';
}

// 3. تحديث دالة الاختيار لتقوم بتعبئة الحقول بشكل صحيح
function selectCustomer(comp, record) {
    document.getElementById('mComp').value = comp;
    document.getElementById('mCr').value = record; // تمرير السجل (record) الصحيح
    document.getElementById('mSearchField').value = comp;
    document.getElementById('mResults').style.display = 'none';
}
