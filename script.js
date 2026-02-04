import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCvOTkVp8v_DNnZZ_AyNo_fLHXMGBYgco",
  authDomain: "drproteinbolero.firebaseapp.com",
  databaseURL: "https://drproteinbolero-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "drproteinbolero",
  storageBucket: "drproteinbolero.firebasestorage.app",
  messagingSenderId: "934699762184",
  appId: "1:934699762184:web:327491545376f532768f4d",
  measurementId: "G-L1SESNEV4P"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentBranch = 'almanar'; 
let currentAdminBranch = sessionStorage.getItem('adminBranchSelected') || null; 

// --- 1. دوال صفحة الزبون ---
window.setBranch = function(branch) {
    currentBranch = branch;
    document.querySelectorAll('.branch-btn').forEach(btn => btn.classList.remove('active'));
    const btnId = branch === 'almanar' ? 'btn-manar' : 'btn-ajawid';
    const activeBtn = document.getElementById(btnId);
    if (activeBtn) activeBtn.classList.add('active');
    
    const dbRef = ref(db, 'flavors');
    get(dbRef).then((snapshot) => renderCustomerPage(snapshot.val() || {}));
};

window.selectBranchAndClose = function(branch) {
    window.setBranch(branch);
    sessionStorage.setItem('hasSelectedBranch', 'true'); 
    const modal = document.getElementById('branchModal');
    if (modal) modal.style.display = 'none';
};

// --- 2. دالة البحث والفلترة المدمجة (جديد) ---
window.filterFlavors = function() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const showAvailableOnly = document.getElementById('availableOnlyCheckbox')?.checked || false;
    const cards = document.querySelectorAll('.flavor-card');

    cards.forEach(card => {
        const nameElement = card.querySelector('.flavor-label');
        if (!nameElement) return;
        
        const name = nameElement.textContent.toLowerCase();
        const isAvailable = card.classList.contains('available');
        
        // شرط البحث النصي
        const matchesSearch = name.includes(searchText);
        // شرط التوفر (إذا تم تفعيل الزر)
        const matchesFilter = !showAvailableOnly || isAvailable;

        if (matchesSearch && matchesFilter) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }
    });
};

// --- 3. دوال صفحة الإدارة ---
window.selectAdminBranch = function(branch) {
    currentAdminBranch = branch;
    sessionStorage.setItem('adminBranchSelected', branch);
    
    const modal = document.getElementById('adminBranchModal');
    if (modal) modal.style.display = 'none';

    updateAdminNavButtons(branch);

    const dbRef = ref(db, 'flavors');
    get(dbRef).then((snapshot) => renderAdminPage(snapshot.val() || {}));
};

function updateAdminNavButtons(branch) {
    document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${branch}`);
    if (activeBtn) activeBtn.classList.add('active');
}

// --- 4. مزامنة البيانات والعدادات ---
function syncData() {
    const dbRef = ref(db, 'flavors');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val() || {};
        renderCustomerPage(data);
        renderAdminPage(data);

        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    });
}

function renderAdminPage(data) {
    const list = document.getElementById('adminList');
    if (!list || !currentAdminBranch) return; 

    const keys = Object.keys(data);
    
    const available = keys.filter(k => data[k].stock && data[k].stock[currentAdminBranch] === true).length;
    const unavailable = keys.length - available;

    if(document.getElementById('totalCount')) document.getElementById('totalCount').textContent = keys.length;
    if(document.getElementById('availableCount')) document.getElementById('availableCount').textContent = available;
    if(document.getElementById('unavailableCount')) document.getElementById('unavailableCount').textContent = unavailable;

    const adminTitle = document.querySelector('.admin-header h1');
    if (adminTitle) adminTitle.innerText = `إدارة فرع ${currentAdminBranch === 'almanar' ? 'المنار' : 'الأجاويد'}`;

    list.innerHTML = "";
    keys.forEach(key => {
        const f = data[key];
        const stock = f.stock || { almanar: false, alajawid: false };
        const isAvailable = stock[currentAdminBranch]; 
        
        const card = document.createElement('div');
        card.className = "admin-card";
        card.innerHTML = `
            <div class="admin-info">
                <img src="images/${f.image || 'default.png'}" onerror="this.src='images/logo.png'">
                <div>
                    <div class="flavor-name">${f.name}</div>
                    <div style="font-size: 0.8rem; color: ${isAvailable ? '#2ecc71' : '#e74c3c'}">
                        ${isAvailable ? '● متاح حالياً' : '● غير متوفر'}
                    </div>
                </div>
            </div>
            <button class="status-toggle ${isAvailable ? 'btn-off' : 'btn-on'}" 
                    onclick="toggleStock('${key}', '${currentAdminBranch}', ${isAvailable})">
                ${isAvailable ? 'إيقاف' : 'تفعيل'}
            </button>`;
        list.appendChild(card);
    });
}

// --- 5. التحقق عند التحميل ---
function checkModalsOnLoad() {
    const hasSelectedCustomer = sessionStorage.getItem('hasSelectedBranch');
    const customerModal = document.getElementById('branchModal');
    if (!hasSelectedCustomer && customerModal) customerModal.style.display = 'flex';

    const adminModal = document.getElementById('adminBranchModal');
    if (adminModal) {
        if (!currentAdminBranch) {
            adminModal.style.display = 'flex';
        } else {
            adminModal.style.display = 'none';
            updateAdminNavButtons(currentAdminBranch);
        }
    }
}

window.toggleStock = function(id, branch, currentVal) {
    update(ref(db), { [`flavors/${id}/stock/${branch}`]: !currentVal });
};

window.renderCustomerPage = function(data) {
    const grid = document.getElementById('flavorGrid');
    if (!grid) return;
    grid.innerHTML = "";
    Object.keys(data).forEach(key => {
        const f = data[key];
        const isAvailable = f.stock && f.stock[currentBranch] === true;
        grid.innerHTML += `
            <div class="flavor-card ${isAvailable ? 'available' : 'unavailable'}">
                <div class="image-container">
                    <img src="images/${f.image || 'default.png'}" class="flavor-image" onerror="this.src='images/logo.png'">
                </div>
                <h3 class="flavor-label">نكهة ${f.name}</h3>
                <span class="flavor-status">${isAvailable ? 'متوفر' : 'نفد'}</span>
            </div>`;
    });
    // إعادة تطبيق الفلترة بعد الرندر لضمان بقاء النكهات المنتهية مخفية إذا كان الفلتر مفعلاً
    filterFlavors();
};

// دالة الفتح والإغلاق (خارج أي مستمع أحداث لضمان وصول HTML لها)
window.togglePopup = function() {
    const overlay = document.getElementById('popup-overlay');
    const mainContent = document.getElementById('main-content');

    if (!overlay || !mainContent) return; // تأكد من وجود العناصر لمنع الأخطاء

    if (overlay.style.display === 'flex') {
        overlay.style.display = 'none';
        mainContent.classList.remove('blur-effect');
    } else {
        overlay.style.display = 'flex';
        mainContent.classList.add('blur-effect');
    }
};

// مستمع الأحداث للعمليات الإضافية (مثل الضغط خارج المربع)
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('popup-overlay');

    // إغلاق المربع عند الضغط في أي مكان في الخلفية (خارج المحتوى الأبيض)
    window.addEventListener('click', (event) => {
        if (event.target === overlay) {
            window.togglePopup();
        }
    });
});

// دالة المربع الثاني (طريقة الاستخدام)
window.toggleUsagePopup = function() {
    const usageOverlay = document.getElementById('usage-overlay');
    const mainContent = document.getElementById('main-content');

    if (!usageOverlay || !mainContent) return;

    if (usageOverlay.style.display === 'flex') {
        usageOverlay.style.display = 'none';
        mainContent.classList.remove('blur-effect');
    } else {
        usageOverlay.style.display = 'flex';
        mainContent.classList.add('blur-effect');
    }
};

// تحديث مستمع الإغلاق ليشمل المربع الجديد عند الضغط خارج المربع
window.addEventListener('click', (event) => {
    const overlay1 = document.getElementById('popup-overlay');
    const overlay2 = document.getElementById('usage-overlay');
    
    if (event.target === overlay1) window.togglePopup();
    if (event.target === overlay2) window.toggleUsagePopup();
});

checkModalsOnLoad();
syncData();