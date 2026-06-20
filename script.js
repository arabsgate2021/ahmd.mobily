function updateLiveStats() {
    const opps = JSON.parse(localStorage.getItem('asgate_opportunities_v21') || '[]');
    const visits = JSON.parse(localStorage.getItem('asgate_visits_data_v21') || '[]');
    
    if(document.getElementById('oppCount')) document.getElementById('oppCount').innerText = opps.length;
    if(document.getElementById('visitCount')) document.getElementById('visitCount').innerText = visits.length;
}

const months = ["يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const tbody = document.getElementById('monthsBody');
months.forEach((m, i) => {
    const row = tbody.insertRow();
    row.innerHTML = `<td>${m}</td><td>15k</td><td>${i===0?'14.2k':'-'}</td><td class="thick-border">${i===0?'790':'-'}</td><td style="color:#3b82f6">${i===0?'45':'-'}</td><td style="color:#22c55e">${i===0?'12':'-'}</td>`;
});

new Chart(document.getElementById('achievedChart'), {
    type: 'doughnut',
    data: { datasets: [{ data: [82, 18], backgroundColor: ['#22c55e', '#f1f5f9'], borderWidth: 0, borderRadius: 10 }] },
    options: { cutout: '85%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
});

const gaugeCtx = document.getElementById('gaugeChart').getContext('2d');
new Chart(gaugeCtx, {
    type: 'doughnut',
    data: { datasets: [{ data: [25, 25, 25, 25], backgroundColor: ['#ef4444', '#fbbf24', '#4ade80', '#15803d'], borderWidth: 0, circumference: 180, rotation: 270 }] },
    options: { cutout: '90%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
});

new Chart(document.getElementById('pendingChart'), {
    type: 'doughnut',
    data: { datasets: [{ data: [18, 82], backgroundColor: ['#facc15', '#f1f5f9'], borderWidth: 0, borderRadius: 10 }] },
    options: { cutout: '85%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
});

const ctxStaff = document.getElementById('staffChart').getContext('2d');
new Chart(ctxStaff, {
    type: 'bar',
    data: {
        labels: Array.from({length: 30}, (_, i) => `م${i + 1}`),
        datasets: [
            { label: 'المحقق', data: Array.from({length: 30}, () => Math.floor(Math.random() * 5000) + 25000), backgroundColor: '#22c55e' },
            { label: 'المعلق', data: Array.from({length: 30}, () => Math.floor(Math.random() * 3000) + 1000), backgroundColor: '#facc15' }
        ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 9 } } } } }
});

window.onload = updateLiveStats;
/* دالة تحميل الزيارات */
function loadVisitsFromStorage() {
    const visits = JSON.parse(localStorage.getItem('asgate_visits_db') || '[]');
    const tbody = document.getElementById('visitsBody');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    visits.forEach((v, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${v.date}</td><td>${v.customer}</td><td>${v.status}</td><td><button onclick="deleteVisit(${index})">حذف</button></td>`;
    });
}

function deleteVisit(index) {
    let visits = JSON.parse(localStorage.getItem('asgate_visits_db') || '[]');
    visits.splice(index, 1);
    localStorage.setItem('asgate_visits_db', JSON.stringify(visits));
    loadVisitsFromStorage();
}
