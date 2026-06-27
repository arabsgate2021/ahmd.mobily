// دالة التنقل بين التبويبات (المرفقات / سجل الطلبات / سجل الزيارات)
function switchTab(tabName) {
    // 1. إزالة التفعيل من جميع الأزرار
    const buttons = document.querySelectorAll('.compact-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // 2. إخفاء جميع محتويات التبويبات
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.style.display = 'none');
    
    // 3. تفعيل الزر المختار وإظهار المحتوى الخاص به
    if (tabName === 'attachments') {
        document.getElementById('attachmentsTab').style.display = 'block';
        buttons[0].classList.add('active');
    } else if (tabName === 'orders') {
        document.getElementById('ordersTab').style.display = 'block';
        buttons[1].classList.add('active');
    } else if (tabName === 'visits') {
        document.getElementById('visitsTab').style.display = 'block';
        buttons[2].classList.add('active');
    }
}

// تشغيل ميزة النقر المباشر على اختيار الملف المخفي
function triggerFileUpload() {
    document.getElementById('hiddenFileInput').click();
}

// معالجة الملف المرفوع وتوليد البيانات الثابتة
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // طلب اسم المرفق من المستخدم عبر نافذة منبثقة
    const customFileName = prompt("الرجاء إدخال اسم المرفق لتوثيقه في النظام:", file.name);
    
    // التحقق من أن المستخدم لم يضغط إلغاء أو يترك الحقل فارغاً
    if (!customFileName || customFileName.trim() === "") {
        alert("تم إلغاء الإرفاق لأنك لم تقم بكتابة اسم للمرفق.");
        event.target.value = ''; // تفريغ الحقل
        return;
    }

    // توليد البيانات الثابتة اللحظية (تاريخ وساعة الرفع الحالية)
    const currentOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    const uploadDate = new Date().toLocaleString('ar-SA', currentOptions);
    
    // اسم المستخدم الحالي (سيتم ربطه بـ Firebase Authentication لاحقاً)
    const currentSystemUser = "المستخدم الحالي"; 

    // إرسال البيانات لعرضها في حاوية المرفقات
    addNewAttachmentToDOM(customFileName.trim(), uploadDate, currentSystemUser);

    // تفريغ المدخلات لكي يقبل رفع ملفات أخرى متتالية دون مشاكل
    event.target.value = '';
}

// دالة طباعة وبناء بطاقة المرفق في واجهة المستخدم
function addNewAttachmentToDOM(name, date, user) {
    const container = document.getElementById('attachmentsContainer');
    
    // إزالة رسالة "لا توجد مرفقات حالياً" إذا كانت موجودة عند أول رفع
    const emptyMsg = container.querySelector('.empty-message');
    if (emptyMsg) {
        emptyMsg.remove();
    }
    
    // بناء عنصر بطاقة المرفق الجديد
    const card = document.createElement('div');
    card.className = 'attachment-card';
    
    card.innerHTML = `
        <div class="attachment-title">📄 ${name}</div>
        <div class="attachment-meta">
            <span>📅 تاريخ الإرفاق: ${date}</span>
            <span>👤 بواسطة: ${user}</span>
        </div>
    `;
    
    // وضع المرفق الأحدث في الأعلى دائماً
    container.prepend(card);
}
