document.addEventListener('DOMContentLoaded', function() {
    // الاحتفاظ بنسخ المخططات لتحديثها ديناميكياً دون إعادة إنشائها
    let achievedChart, gaugeChart, pendingChart, staffChart;

    // المراجع لعناصر الواجهة (مربعات الأرقام والجدول)
    const oppCountEl = document.getElementById('oppCount');
    const visitCountEl = document.getElementById('visitCount');
    const salesValueEl = document.getElementById('salesValue');
    const tbody = document.getElementById('monthsBody');

    // أسماء الأشهر للجدول
    const monthsNames = ["يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    // 1. جلب البيانات الأساسية من التخزين المحلي مع الحماية
    function getRawData() {
        try {
            const oppsData = localStorage.getItem('asgate_opportunities_v21');
            const visitsData = localStorage.getItem('asgate_visits_data_v21');
            return {
                opportunities: oppsData ? JSON.parse(oppsData) : [],
                visits: visitsData ? JSON.parse(visitsData) : []
            };
        } catch (e) {
            console.error("خطأ في قراءة LocalStorage:", e);
            return { opportunities: [], visits: [] };
        }
    }

    // 2. تعبئة خيارات الفلاتر ديناميكياً بناءً على البيانات الفعليّة المخزنة
    function populateFilterOptions() {
        const data = getRawData();
        
        const regions = new Set();
        const supervisors = new Set();
        const salesmen = new Set();
        const years = new Set(["2026"]); // سنة افتراضية أساسية للمشروع

        // جمع البيانات الفريدة من الفرص البيعية
        data.opportunities.forEach(item => {
            if (item.region) regions.add(item.region);
            if (item.supervisor) supervisors.add(item.supervisor);
            if (item.salesman) salesmen.add(item.salesman);
            if (item.date) {
                const year = item.date.split('-')[0];
                if(year) years.add(year);
            }
        });

        // جمع البيانات الفريدة من الزيارات
        data.visits.forEach(item => {
            if (item.region) regions.add(item.region);
            if (item.supervisor) supervisors.add(item.supervisor);
            if (item.salesman) salesmen.add(item.salesman);
            if (item.date) {
                const year = item.date.split('-')[0];
                if(year) years.add(year);
            }
        });

        // تعبئة عناصر الـ Select في الـ HTML بالترتيب الصحيح
        fillSelect(document.querySelector('.filters-grid .filter-card:nth-child(1) select'), years, "2026");
        fillSelect(document.querySelector('.filters-grid .filter-card:nth-child(2) select'), monthsNames, "الكل", true);
        fillSelect(document.querySelector('.filters-grid .filter-card:nth-child(3) select'), regions, "الكل");
        fillSelect(document.querySelector('.filters-grid .filter-card:nth-child(4) select'), supervisors, "الكل");
        fillSelect(document.querySelector('.filters-grid .filter-card:nth-child(5) select'), salesmen, "الكل");
    }

    function fillSelect(selectElement, setOrArray, defaultVal, isMonth = false) {
        if (!selectElement) return;
        selectElement.innerHTML = '';
        
        // خيار الكل أو الافتراضي
        const defaultOpt = document.createElement('option');
        defaultOpt.text = defaultVal;
        defaultOpt.value = defaultVal === "الكل" ? "all" : defaultVal;
        selectElement.appendChild(defaultOpt);

        setOrArray.forEach((val, index) => {
            if(isMonth && val === defaultVal) return;
            const opt = document.createElement('option');
            opt.text = val;
            opt.value = isMonth ? (index + 1).toString().padStart(2, '0') : val; // تحويل الشهر لترميز رقمي مثل 01، 02
            if(val !== defaultVal) selectElement.appendChild(opt);
        });
    }

    // 3. معالجة وتصفية البيانات وتحديث الشاشة كاملاً
    function updateDashboard() {
        const data = getRawData();

        // جلب القيم الحالية المحددة في الفلاتر
        const selectedYear = document.querySelector('.filters-grid .filter-card:nth-child(1) select')?.value || "2026";
        const selectedMonth = document.querySelector('.filters-grid .filter-card:nth-child(2) select')?.value || "all";
        const selectedRegion = document.querySelector('.filters-grid .filter-card:nth-child(3) select')?.value || "all";
        const selectedSupervisor = document.querySelector('.filters-grid .filter-card:nth-child(4) select')?.value || "all";
        const selectedSalesman = document.querySelector('.filters-grid .filter-card:nth-child(5) select')?.value || "all";

        // دالة فلترة مخصصة لمطابقة البيانات المحددة
        const filterCallback = (item) => {
            const itemYear = item.date ? item.date.split('-')[0] : "";
            const itemMonth = item.date ? item.date.split('-')[1] : "";

            if (selectedYear !== "all" && itemYear !== selectedYear) return false;
            if (selectedMonth !== "all" && itemMonth !== selectedMonth) return false;
            if (selectedRegion !== "all" && item.region !== selectedRegion) return false;
            if (selectedSupervisor !== "all" && item.supervisor !== selectedSupervisor) return false;
            if (selectedSalesman !== "all" && item.salesman !== selectedSalesman) return false;
            return true;
        };

        const filteredOpps = data.opportunities.filter(filterCallback);
        const filteredVisits = data.visits.filter(filterCallback);

        // حساب الإحصائيات الحيوية للبطاقات
        let totalSales = 0;
        let totalPending = 0;
        let successfulVisits = filteredVisits.filter(v => v.status === "ناجحة" || v.status === "نجاح").length;

        filteredOpps.forEach(opp => {
            const val = parseFloat(opp.value) || 0;
            if (opp.status === "محقق" || opp.status === "ناجح") {
                totalSales += val;
            } else if (opp.status === "معلق") {
                totalPending += val;
            }
        });

        // تحديث مربعات الأرقام العلوية في الواجهة
        if(oppCountEl) oppCountEl.innerText = filteredOpps.length;
        if(visitCountEl) visitCountEl.innerText = filteredVisits.length;
        if(salesValueEl) salesValueEl.innerText = totalSales.toLocaleString('en-US');
        const pendingValueEl = document.querySelector('.bg-yellow .value-text');
        if(pendingValueEl) pendingValueEl.innerText = totalPending.toLocaleString('en-US');

        // تحديث جدول الأشهر السنوي بناءً على التصفية الحالية
        updateYearlyTable(filteredOpps, filteredVisits, selectedYear);

        // تحديث الرسوم البيانية بالبيانات الحقيقية والمحاكاة
        updateChartsLogic(totalSales, totalPending, filteredVisits.length, successfulVisits);
    }

    // 4. بناء وتحديث جدول الأهداف والزيارات السنوي ديناميكياً
    function updateYearlyTable(opps, visits, year) {
        if (!tbody) return;
        tbody.innerHTML = '';

        monthsNames.forEach((monthName, index) => {
            const monthCode = (index + 1).toString().padStart(2, '0');
            
            // فلترة بيانات الشهر المحدد في الحلقة
            const mOpps = opps.filter(o => o.date && o.date.split('-')[1] === monthCode);
            const mVisits = visits.filter(v => v.date && v.date.split('-')[1] === monthCode);

            let mSales = 0;
            let mPending = 0;
            let mSuccessVisits = mVisits.filter(v => v.status === "ناجحة" || v.status === "نجاح").length;

            mOpps.forEach(o => {
                const val = parseFloat(o.value) || 0;
                if (o.status === "محقق" || o.status === "ناجح") mSales += val;
                else if (o.status === "معلق") mPending += val;
            });

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${monthName}</td>
                <td>15k</td>
                <td>${mSales > 0 ? (mSales/1000).toFixed(1) + 'k' : '-'}</td>
                <td class="thick-border">${mPending > 0 ? (mPending/1000).toFixed(1) + 'k' : '-'}</td>
                <td style="color:#3b82f6">${mVisits.length > 0 ? mVisits.length : '-'}</td>
                <td style="color:#22c55e">${mSuccessVisits > 0 ? mSuccessVisits : '-'}</td>
            `;
        });
    }

    // 5. تهيئة المخططات البيانية (Chart.js)
    function initCharts() {
        const achievedEl = document.getElementById('achievedChart');
        if (achievedEl) {
            achievedChart = new Chart(achievedEl, {
                type: 'doughnut',
                data: { datasets: [{ data: [0, 100], backgroundColor: ['#22c55e', '#f1f5f9'], borderWidth: 0, borderRadius: 10 }] },
                options: { cutout: '85%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        const gaugeEl = document.getElementById('gaugeChart');
        if (gaugeEl) {
            gaugeChart = new Chart(gaugeEl.getContext('2d'), {
                type: 'doughnut',
                data: { datasets: [{ data: [25, 25, 25, 25], backgroundColor: ['#ef4444', '#fbbf24', '#4ade80', '#15803d'], borderWidth: 0 }] },
                options: { rotation: 270, circumference: 180, cutout: '90%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        const pendingEl = document.getElementById('pendingChart');
        if (pendingEl) {
            pendingChart = new Chart(pendingEl, {
                type: 'doughnut',
                data: { datasets: [{ data: [0, 100], backgroundColor: ['#facc15', '#f1f5f9'], borderWidth: 0, borderRadius: 10 }] },
                options: { cutout: '85%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        const staffEl = document.getElementById('staffChart');
        if (staffEl) {
            staffChart = new Chart(staffEl.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: Array.from({length: 30}, (_, i) => `موظف مبيعات متميز ${i + 1}`), // العودة لـ 30 موظفاً كما في التصميم الأصلي
                    datasets: [
                        { label: 'المحقق', data: Array.from({length: 30}, () => 0), backgroundColor: '#22c55e' },
                        { label: 'المعلق', data: Array.from({length: 30}, () => 0), backgroundColor: '#facc15' }
                    ]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        x: { 
                            grid: { display: false }, 
                            ticks: { 
                                font: { family: 'Cairo', size: 9 },
                                maxRotation: 45,  // تدوير النص مائل بزاوية 45 لحماية الأسماء الكبيرة من التداخل
                                minRotation: 45
                            } 
                        } 
                    } 
                }
            });
        }
    }

    function updateChartsLogic(sales, pending, totalVisits, successVisits) {
        const grandTotal = sales + pending || 1; 
        const salesPercent = Math.round((sales / grandTotal) * 100) || 0;
        const pendingPercent = Math.round((pending / grandTotal) * 100) || 0;

        const achievedText = document.querySelector('.chart-container-reduced:has(#achievedChart) .chart-percentage');
        if(achievedText) achievedText.innerText = `${salesPercent}%`;

        const pendingText = document.querySelector('.chart-container-reduced:has(#pendingChart) .chart-percentage');
        if(pendingText) pendingText.innerText = `${pendingPercent}%`;

        const targetYearly = 180000;
        const gaugePercent = Math.min(Math.round((sales / targetYearly) * 100), 200);
        const gaugeValueText = document.querySelector('.gauge-container-reduced .gauge-value');
        if(gaugeValueText) gaugeValueText.innerText = `${gaugePercent}%`;

        if (achievedChart) {
            achievedChart.data.datasets[0].data = [salesPercent, 100 - salesPercent];
            achievedChart.update();
        }
        if (pendingChart) {
            pendingChart.data.datasets[0].data = [pendingPercent, 100 - pendingPercent];
            pendingChart.update();
        }

        if (gaugeChart) {
            const part = gaugePercent / 4;
            gaugeChart.data.datasets[0].data = [part, part, part, part];
            gaugeChart.update();
        }

        // ضخ بيانات عشوائية محاكية لـ 30 موظفاً بشكل متناسق مع الفلاتر والأرقام الحقيقية
        if (staffChart) {
            staffChart.data.datasets[0].data = Array.from({length: 30}, () => Math.floor(sales * (Math.random() * 0.15)));
            staffChart.data.datasets[1].data = Array.from({length: 30}, () => Math.floor(pending * (Math.random() * 0.10)));
            staffChart.update();
        }
    }

    // تشغيل وإطلاق النظام التفاعلي
    initCharts();
    populateFilterOptions();
    updateDashboard();

    // ربط مستمعي الأحداث بالفلاتر لتحديث الإحصائيات فوراً بمجرد تغيير الاختيار
    document.querySelectorAll('.filters-grid select').forEach(select => {
        select.addEventListener('change', updateDashboard);
    });
});
