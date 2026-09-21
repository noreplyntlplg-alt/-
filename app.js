/**
 * ARAMS - Frontend Core Logic (Vanilla JS SPA)
 * ผู้เชี่ยวชาญด้าน UX/UI และโปรแกรมมิ่ง
 */

// =========================================================================
// 1. SYSTEM CONFIGURATION & STATE MANAGEMENT
// =========================================================================
const CONFIG = {
    // นำ URL ของ Web App จาก Google Apps Script มาใส่ในเครื่องหมายคำพูดด้านล่างนี้
    SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwgG8bb9gooS7ITQ-K1LLBYr4CoNXHyU3E_bGwQQ4V26mWm44StrAa0yKScM4jmmbCdBQ/exec" 
};

// Global State
const state = {
    currentUser: null,
    currentPage: 'dashboard',
    sidebarOpen: false
};

// เมนูตาม Role (เพื่อทำ Role-Based Access Control - RBAC)
const ROLE_MENUS = {
    "Admin": ["dashboard", "student-reg", "curriculum", "grading", "assessment", "remedial", "attendance", "leave", "documents", "academic-reports", "statistics", "announcements", "users", "settings"],
    "Teacher": ["dashboard", "grading", "attendance", "remedial", "announcements"],
    "Student": ["dashboard", "grading", "attendance", "leave", "announcements"],
    "Parent": ["dashboard", "grading", "attendance", "announcements"]
};

// =========================================================================
// 2. DOM ELEMENTS
// =========================================================================
const DOM = {
    loginSection: document.getElementById('login-section'),
    appSection: document.getElementById('app-section'),
    loginForm: document.getElementById('login-form'),
    globalLoader: document.getElementById('global-loader'),
    
    // Sidebar & Topbar
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
    btnCloseSidebar: document.getElementById('btn-close-sidebar'),
    btnLogout: document.getElementById('btn-logout'),
    
    // User Info Display
    displayFullName: document.getElementById('display-fullname'),
    displayRole: document.getElementById('display-role'),
    
    // Content
    pageTitle: document.getElementById('page-title'),
    contentArea: document.getElementById('content-area')
};

// =========================================================================
// 3. INITIALIZATION & EVENT LISTENERS
// =========================================================================
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    checkSession();
    setupEventListeners();
}

function setupEventListeners() {
    // Login Form Submit
    DOM.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = DOM.loginForm.username.value.trim();
        const password = DOM.loginForm.password.value.trim();
        await handleLogin(username, password);
    });

    // Logout
    DOM.btnLogout.addEventListener('click', handleLogout);

    // Sidebar Toggles (Mobile)
    DOM.btnToggleSidebar.addEventListener('click', toggleSidebar);
    DOM.btnCloseSidebar.addEventListener('click', toggleSidebar);
    DOM.sidebarOverlay.addEventListener('click', toggleSidebar);
}

// =========================================================================
// 4. AUTHENTICATION & SESSION
// =========================================================================
function checkSession() {
    const savedUser = localStorage.getItem('arams_user');
    if (savedUser) {
        state.currentUser = JSON.parse(savedUser);
        showApp();
    } else {
        showLogin();
    }
}

async function handleLogin(username, password) {
    if(!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL === "YOUR_GOOGLE_WEB_APP_URL_HERE") {
        Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาดของระบบ',
            text: 'ยังไม่ได้ตั้งค่า SCRIPT_URL ในไฟล์ app.js',
            confirmButtonColor: '#1a365d'
        });
        return;
    }

    showLoader();
    try {
        const response = await callAPI('login', { username, password });
        
        if (response.status === 'success') {
            state.currentUser = response.user;
            localStorage.setItem('arams_user', JSON.stringify(state.currentUser));
            
            Swal.fire({
                icon: 'success',
                title: 'เข้าสู่ระบบสำเร็จ',
                text: `ยินดีต้อนรับคุณ ${state.currentUser.fullName}`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                DOM.loginForm.reset();
                showApp();
            });
        } else {
            Swal.fire({ icon: 'error', title: 'ไม่สามารถเข้าสู่ระบบได้', text: response.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', text: error.message });
    } finally {
        hideLoader();
    }
}

function handleLogout() {
    Swal.fire({
        title: 'ต้องการออกจากระบบ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e53e3e',
        cancelButtonColor: '#718096',
        confirmButtonText: 'ใช่, ออกจากระบบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('arams_user');
            state.currentUser = null;
            showLogin();
        }
    });
}

function showLogin() {
    DOM.appSection.classList.add('hidden');
    DOM.loginSection.classList.remove('hidden');
    DOM.loginSection.style.display = 'flex';
}

function showApp() {
    DOM.loginSection.classList.add('hidden');
    DOM.loginSection.style.display = 'none';
    DOM.appSection.classList.remove('hidden');
    
    // อัปเดตข้อมูลผู้ใช้บน UI
    DOM.displayFullName.textContent = state.currentUser.fullName;
    DOM.displayRole.textContent = state.currentUser.role;
    
    buildSidebarMenu();
    navigate('dashboard'); // หน้าเริ่มต้น
}

// =========================================================================
// 5. SIDEBAR & ROUTING (SPA MECHANIC)
// =========================================================================
function toggleSidebar() {
    state.sidebarOpen = !state.sidebarOpen;
    if (state.sidebarOpen) {
        DOM.sidebar.classList.add('show');
        DOM.sidebarOverlay.classList.remove('hidden');
    } else {
        DOM.sidebar.classList.remove('show');
        DOM.sidebarOverlay.classList.add('hidden');
    }
}

function buildSidebarMenu() {
    const userRole = state.currentUser.role;
    const allowedMenus = ROLE_MENUS[userRole] || [];
    
    // ซ่อน/แสดงเมนูตามสิทธิ์
    document.querySelectorAll('.nav-item').forEach(item => {
        const pageId = item.getAttribute('data-page');
        if (allowedMenus.includes(pageId)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });

    // ซ่อน Header ของเมนูที่ไม่มีรายการย่อยแสดงอยู่
    document.querySelectorAll('.menu-header').forEach(header => {
        let hasVisibleSibling = false;
        let sibling = header.nextElementSibling;
        while (sibling && !sibling.classList.contains('menu-header')) {
            if (sibling.style.display !== 'none') {
                hasVisibleSibling = true;
                break;
            }
            sibling = sibling.nextElementSibling;
        }
        header.style.display = hasVisibleSibling ? 'block' : 'none';
    });
}

function navigate(pageId) {
    state.currentPage = pageId;
    
    // อัปเดตสถานะ Active ในเมนู
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
            DOM.pageTitle.textContent = item.querySelector('span').textContent;
        }
    });

    // ปิด Sidebar หากเปิดอยู่ในโหมดมือถือ
    if (window.innerWidth <= 768 && state.sidebarOpen) {
        toggleSidebar();
    }

    // เรียกฟังก์ชันเรนเดอร์หน้าเนื้อหา
    renderPage(pageId);
}

// =========================================================================
// 6. CONTENT RENDERER ENGINE
// =========================================================================
async function renderPage(pageId) {
    // โชว์ Loading ภายในกล่องเนื้อหา
    DOM.contentArea.innerHTML = `
        <div class="loading-screen">
            <i class="fa-solid fa-spinner fa-spin fa-3x text-primary"></i>
            <p>กำลังโหลดข้อมูล...</p>
        </div>
    `;

    try {
        switch(pageId) {
            case 'dashboard':
                await renderDashboard();
                break;
            case 'student-reg':
                await renderStudentModule();
                break;
            // โครงสร้างสำหรับเมนูอื่นๆ จะขยายต่อยอดที่นี่
            default:
                DOM.contentArea.innerHTML = `
                    <div class="panel" style="text-align:center; padding: 50px;">
                        <i class="fa-solid fa-person-digging fa-4x text-warning" style="margin-bottom:20px;"></i>
                        <h2>กำลังพัฒนาระบบในส่วนนี้</h2>
                        <p class="text-muted">หน้านี้กำลังอยู่ระหว่างการออกแบบและเขียนโค้ดโดยผู้เชี่ยวชาญ</p>
                    </div>
                `;
        }
    } catch (error) {
        DOM.contentArea.innerHTML = `
            <div class="panel" style="text-align:center; padding: 50px; color: red;">
                <i class="fa-solid fa-triangle-exclamation fa-4x" style="margin-bottom:20px;"></i>
                <h2>เกิดข้อผิดพลาดในการโหลดข้อมูล</h2>
                <p>${error.message}</p>
                <button class="btn-primary" onclick="renderPage('${pageId}')" style="width:auto; margin: 20px auto;">ลองใหม่อีกครั้ง</button>
            </div>
        `;
    }
}

// =========================================================================
// 7. SPECIFIC PAGE RENDERING MODULES
// =========================================================================

// --- หน้า 1: Dashboard ---
async function renderDashboard() {
    // ดึงสถิติจาก API
    const response = await callAPI('getDashboardStats');
    if (response.status !== 'success') throw new Error(response.message);
    
    const stats = response.data;

    let html = `
        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
                <div class="stat-details">
                    <h4>นักเรียนทั้งหมด</h4>
                    <p>${stats.totalStudents.toLocaleString()} <span style="font-size:14px; color:#718096; font-weight:normal;">คน</span></p>
                </div>
            </div>
            
            <div class="stat-card green">
                <div class="stat-icon green"><i class="fa-solid fa-mars-and-venus"></i></div>
                <div class="stat-details">
                    <h4>ชาย / หญิง</h4>
                    <p>${stats.maleStudents} <span style="font-size:16px;">/</span> ${stats.femaleStudents}</p>
                </div>
            </div>

            <div class="stat-card yellow">
                <div class="stat-icon yellow"><i class="fa-solid fa-chalkboard-user"></i></div>
                <div class="stat-details">
                    <h4>ครูบุคลากร</h4>
                    <p>${stats.totalTeachers.toLocaleString()}</p>
                </div>
            </div>

            <div class="stat-card red">
                <div class="stat-icon red"><i class="fa-solid fa-book-open"></i></div>
                <div class="stat-details">
                    <h4>รายวิชาที่เปิดสอน</h4>
                    <p>${stats.totalSubjects.toLocaleString()}</p>
                </div>
            </div>
        </div>

        <div class="dashboard-grid" style="grid-template-columns: 2fr 1fr;">
            <div class="panel">
                <div class="panel-header">
                    <h3 class="panel-title"><i class="fa-solid fa-bullhorn"></i> ประกาศล่าสุด</h3>
                </div>
                <ul style="list-style: none; padding: 0;">
                    <li style="padding: 10px 0; border-bottom: 1px solid #eee;">
                        <span class="status-badge success">ระบบ</span> เริ่มต้นใช้งานระบบ ARAMS ปีการศึกษาใหม่
                    </li>
                    <li style="padding: 10px 0; border-bottom: 1px solid #eee;">
                        <span class="status-badge warning">วิชาการ</span> กำหนดส่งคะแนนปลายภาคเรียนที่ 1/2569
                    </li>
                </ul>
            </div>
            
            <div class="panel">
                <div class="panel-header">
                    <h3 class="panel-title"><i class="fa-solid fa-list-check"></i> งานด่วนของคุณ</h3>
                </div>
                <div style="text-align:center; padding: 20px; color:#718096;">
                    <i class="fa-regular fa-face-smile fa-3x" style="margin-bottom:10px;"></i>
                    <p>เยี่ยมมาก! ไม่มีงานที่ค้างดำเนินการ</p>
                </div>
            </div>
        </div>
    `;

    DOM.contentArea.innerHTML = html;
}

// --- หน้า 2: งานทะเบียนนักเรียน (ระบบตัวอย่าง CRUD พื้นฐาน) ---
async function renderStudentModule() {
    DOM.contentArea.innerHTML = `
        <div class="panel">
            <div class="panel-header">
                <h3 class="panel-title"><i class="fa-solid fa-users-viewfinder"></i> ค้นหาและจัดการข้อมูลนักเรียน</h3>
                <button class="btn-primary" style="width:auto; padding: 8px 15px; font-size:16px;" onclick="alert('ฟังก์ชันเพิ่มนักเรียนใหม่')">
                    <i class="fa-solid fa-plus"></i> เพิ่มนักเรียนใหม่
                </button>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>ค้นหาตามรหัสนักเรียน / ชื่อ</label>
                    <input type="text" class="form-control" placeholder="พิมพ์ข้อความค้นหา...">
                </div>
                <div class="form-group">
                    <label>ระดับชั้น</label>
                    <select class="form-control">
                        <option value="">-- ทุกระดับชั้น --</option>
                        <option value="ม.1">ม.1</option>
                        <option value="ม.2">ม.2</option>
                        <option value="ม.3">ม.3</option>
                    </select>
                </div>
                <div class="form-group" style="justify-content: flex-end;">
                    <button class="btn-submit"><i class="fa-solid fa-magnifying-glass"></i> ค้นหา</button>
                </div>
            </div>

            <div class="table-responsive" style="margin-top:20px;">
                <table class="table-arams">
                    <thead>
                        <tr>
                            <th>รหัสนักเรียน</th>
                            <th>ชื่อ - นามสกุล</th>
                            <th>ชั้น/ห้อง</th>
                            <th>สถานะ</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody id="student-table-body">
                        <tr><td colspan="5" style="text-align:center;">กำลังโหลดข้อมูล...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // โหลดข้อมูลนักเรียนจาก API
    const response = await callAPI('readData', { sheetName: 'Students' });
    const tbody = document.getElementById('student-table-body');
    
    if (response.status === 'success' && response.data.length > 0) {
        tbody.innerHTML = '';
        response.data.forEach(std => {
            tbody.innerHTML += `
                <tr>
                    <td>${std.StudentID}</td>
                    <td>${std.Prefix}${std.FirstName} ${std.LastName}</td>
                    <td>${std.Level}/${std.Room}</td>
                    <td><span class="status-badge ${std.Status === 'ปกติ' ? 'success' : 'warning'}">${std.Status || 'ปกติ'}</span></td>
                    <td>
                        <button class="btn-sm btn-view" title="ดูประวัติ"><i class="fa-solid fa-eye"></i></button>
                        <button class="btn-sm btn-edit" title="แก้ไข"><i class="fa-solid fa-pen"></i></button>
                    </td>
                </tr>
            `;
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#718096;">ไม่พบข้อมูลนักเรียนในฐานข้อมูล</td></tr>`;
    }
}

// =========================================================================
// 8. API & HELPER FUNCTIONS
// =========================================================================

// ฟังก์ชันศูนย์กลางในการเรียก Google Apps Script API
async function callAPI(action, payload = {}) {
    const url = `${CONFIG.SCRIPT_URL}?action=${action}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // แก้ไขเรื่อง CORS ด้วย text/plain
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// ตัวโหลด Global
function showLoader() {
    DOM.globalLoader.classList.remove('hidden');
}

function hideLoader() {
    DOM.globalLoader.classList.add('hidden');
}
