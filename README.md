<!DOCTYPE html>
<html dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>المبيعات | ASGate</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>

<div class="dashboard-container">
    <nav class="navbar">
        <a href="index.html">الرئيسية</a>
        <a href="visits.html">الزيارات</a>
        <a href="opportunities.html">الفرص البيعية</a>
        <a href="customers.html">العملاء</a>
        <a href="sales.html" class="active">المبيعات</a>
    </nav>

    <div class="main-content">
        <div class="action-bar">
            <button class="btn-top btn-add" onclick="openOrderModal()"><i class="fas fa-plus"></i> إنشاء طلب مبيعات جديد</button>
            <div class="search-wrapper">
                <input type="text" id="globalSearch" class="search-input" placeholder="بحث 🔍" onkeyup="filterSalesTable()">
            </div>
            
            <div class="stats-bar-visit" id="statsContainer">
                <div class="stat-item">الطلبات: <span id="count-total" class="stat-val">0</span></div>
                <div class="stat-item">الشهر: <span id="month-count" class="stat-val">0</span></div>
                <div class="stat-divider">|</div>
                <div class="stat-item">مكتمل: <span id="sum-completed" class="stat-val stat-success">0.00</span></div>
                <div class="stat-item">معلق: <span id="sum-pending" class="stat-val stat-warning">0.00</span></div>
                <div class="stat-divider">|</div>
                <div class="stat-item">مكتمل الشهر: <span id="month-completed" class="stat-val stat-success">0.00</span></div>
                <div class="stat-item">معلق الشهر: <span id="month-pending" class="stat-val stat-warning">0.00</span></div>
                
                <button onclick="toggleStatsVisibility()" id="eyeToggleBtn" class="btn-eye-toggle" title="إخفاء / إظهار الأرقام">
                    <i class="fas fa-eye"></i>
                </button>
            </div>

            <div class="bulk-action-wrapper">
                <button class="btn-bulk-trigger" onclick="toggleDropdown(event, this)">إجراءات جماعية <i class="fas fa-chevron-down" style="font-size:10px;"></i></button>
                <div class="dropdown-menu">
                    <button onclick="handleBulkAction('تغيير المالك')"><i class="fas fa-user-edit"></i> تغيير المالك</button>
                    <button onclick="handleBulkAction('تصدير')"><i class="fas fa-file-excel"></i> تصدير للإكسيل</button>
                    <button onclick="handleBulkAction('طباعة')"><i class="fas fa-print"></i> طباعة</button>
                    <hr class="dropdown-divider">
                    <button class="del-btn" onclick="handleBulkAction('حذف')"><i class="fas fa-trash-alt"></i> حذف المحدد</button>
                </div>
            </div>
        </div>
        
        <div class="table-wrapper">
            <table id="salesTable">
                <thead>
                    <tr>
                        <th style="width: 3%;"><input type="checkbox" class="select-check" onclick="toggleAllCheckboxes(this)"></th>
                        <th style="width: 7%;">رقم الطلب</th>
                        <th style="width: 14%;">اسم الطلب</th>
                        <th style="width: 8%;">تاريخ الإنشاء</th>
                        <th style="width: 14%;">الشركة</th>
                        <th style="width: 9%;">السجل الرئيسي</th>
                        <th style="width: 9%;">الحالة</th>
                        <th style="width: 7%;">مكتمل</th>
                        <th style="width: 7%;">معلق</th>
                        <th style="width: 9%;">ملاحظات</th>
                        <th style="width: 7%;">تاريخ التعديل</th>
                        <th style="width: 6%;">المالك</th>
                    </tr>
                </thead>
                <tbody id="salesBody"></tbody>
            </table>
        </div>

        <div id="generalActivityLogSection" class="activity-log-section">
            <div class="activity-log-header-container">
                <div class="activity-log-title"><i class="fas fa-history"></i> سجل نشاط المبيعات</div>
                <button class="btn-toggle-expand" onclick="toggleGeneralLogHeight()" title="توسيع / تقليص" id="toggleGeneralLogBtn"><i class="fas fa-expand-alt"></i></button>
            </div>
            <div id="activityLogs" class="activity-list"></div>
        </div>
    </div>
</div>

<div id="noteModal" class="modal">
    <div class="modal-content-box" id="modalNoteContent">
        <div class="modal-title left-align">
            <i class="fas fa-sticky-note" style="color:var(--accent-blue)"></i> سجل ملاحظات الطلب
        </div>
        <div id="historyLog" class="history-log"></div>
        
        <div id="filePreviewContainer" class="file-preview-container">
            <i class="fas fa-paperclip"></i> <span id="fileNameDisplay"></span> 
            <button onclick="removeAttachment()" class="btn-remove-file" title="حذف المرفق">&times;</button>
        </div>
        
        <textarea id="modalTextArea" class="note-area" placeholder="أدخل تفاصيل الملاحظة هنا..."></textarea>
        <input type="file" id="modalFileAttachment" style="display:none;" onchange="handleFileSelect(this)">
        
        <div class="modal-footer">
            <button onclick="document.getElementById('modalFileAttachment').click()" class="btn-outline" title="إرفاق ملف">
                <i class="fas fa-paperclip"></i> إرفاق
            </button>
            <button onclick="closeNote()" class="btn-secondary">إلغاء</button>
            <button onclick="saveNote()" class="btn-primary">حفظ الملاحظة</button>
        </div>
    </div>
</div>

<div id="orderModal" class="modal">
    <div class="modal-content-box" id="orderModalCard">
        <div class="modal-title center-align">
            <i class="fas fa-file-invoice-dollar" style="color:var(--accent-blue)"></i> إنشاء طلب مبيعات جديد
        </div>
        <div class="form-group">
            <label>البحث بالاسم أو السجل</label>
            <input type="text" id="mSearchField" onkeyup="searchCustomerInModal(this)" placeholder="ابحث عن عميل موجود..." autocomplete="off">
            <div id="mResults" class="modal-results"></div>
        </div>
        <div class="form-group">
            <label>الشركة</label>
            <input type="text" id="mComp" class="input-readonly-modal" readonly>
        </div>
        <div class="form-group">
            <label>السجل الرئيسي</label>
            <input type="text" id="mCr" class="input-readonly-modal" readonly>
        </div>
        <div class="form-group">
            <label>اسم الطلب</label>
            <input type="text" id="mType" placeholder="مثال: توريد وتجهيز سنترال">
        </div>
        <div class="modal-footer form-footer">
            <button onclick="closeOrderModal()" class="btn-secondary flex-1">إلغاء</button>
            <button onclick="addOrderRow()" class="btn-dark flex-1">إضافة الطلب</button>
        </div>
    </div>
</div>

<script src="script.js"></script>
</body>
</html>
