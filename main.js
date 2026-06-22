document.addEventListener('DOMContentLoaded', function() {
    
    // 1. تحديث البيانات من التخزين المحلي لربط الصفحات
    function updateLiveStats() {
        try {
            const oppsData = localStorage.getItem('asgate_opportunities_v21');
            const visitsData = localStorage.getItem('asgate_visits_data_v21');
            
            // التأكد من وجود بيانات صحيحة قبل التحويل
            const opps = oppsData ? JSON.parse(oppsData) : [];
            const visits = visitsData ? JSON.parse(visitsData) : [];
            
            document.getElementById('oppCount').innerText = Array.isArray(opps) ? opps.length : 0;
            document.getElementById('visitCount').innerText = Array.isArray(visits) ? visits.length : 0;
        } catch (error) {
            console.error("خطأ في قراءة البيانات من التخزين المحلي:", error);
            document.getElementById('oppCount').innerText = 0;
            document.getElementById('visitCount').innerText = 0;
        }
    }

    // 2. بناء جدول الأهداف والزيارات السنوي
    const months = ["يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const tbody = document.getElementById('monthsBody');
    if (tbody) {
        months.forEach((m, i) => {
            const row = tbody.insertRow();
            row.innerHTML = `<td>${m}</td><td>15k</td><td>${i===0?'14.2k':'-'}</td><td class="thick-border">${i===0?'790':'-'}</td><td style="color:#3b82f6">${i===0?'45':'-'}</td><td style="color:#22c55e">${i===0?'12':'-'}</td>`;
        });
    }

    // 3. المخطط الدائري للمحقق
    const achievedEl = document.getElementById('achievedChart');
    if (achievedEl) {
        new Chart(achievedEl, {
            type: 'doughnut',
            data: { datasets: [{ data: [82, 18], backgroundColor: ['#22c55e', '#f1f5f9'], borderWidth: 0, borderRadius: 10 }] },
            options: { cutout: '85%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // 4. مخطط مؤشر الإنجاز (Gauge Chart)
    const gaugeEl = document.getElementById('gaugeChart');
    if (gaugeEl) {
        new Chart(gaugeEl.getContext('2d'), {
            type: 'doughnut',
            data: { 
                datasets: [{ 
                    data: [25, 25, 25, 25], 
                    backgroundColor: ['#ef4444', '#fbbf24', '#4ade80', '#15803d'], 
                    borderWidth: 0 
                }] 
            },
            options: { 
                rotation: 270, // تم نقلها هنا لضمان رسم نصف دائرة بدقة
                circumference: 180, // تم نقلها هنا لدعم إصدارات Chart.js الحديثة
                cutout: '90%', 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } } 
            }
        });
    }

    // 5. مخطط المعلق
    const pendingEl = document.getElementById('pendingChart');
    if (pendingEl) {
        new Chart(pendingEl, {
            type: 'doughnut',
            data: { datasets: [{ data: [18, 82], backgroundColor: ['#facc15', '#f1f5f9'], borderWidth: 0, borderRadius: 10 }] },
            options: { cutout: '85%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // 6. مخطط أداء فريق المبيعات
    const staffEl = document.getElementById('staffChart');
    if (staffEl) {
        new Chart(staffEl.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Array.from({length: 30}, (_, i) => `م${i + 1}`),
                datasets: [
                    { label: 'المحقق', data: Array.from({length: 30}, () => Math.floor(Math.random() * 5000) + 25000), backgroundColor: '#22c55e' },
                    { label: 'المعلق', data: Array.from({length: 30}, () => Math.floor(Math.random() * 3000) + 1000), backgroundColor: '#facc15' }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { x: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 9 } } } } 
            }
        });
    }

    // جلب الإحصائيات فور اكتمال بناء الصفحة
    updateLiveStats();
});
