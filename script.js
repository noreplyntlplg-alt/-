/**
 * ARAMS - Frontend Controller (script.js)
 * จัดการการทำงานของ UI, การสลับหน้าจอ, และการเชื่อมต่อ API (Google Apps Script)
 */

// ==========================================
// 1. การตั้งค่าระบบ (Configuration)
// ==========================================
// TODO: นำ URL ที่ได้จากการ Deploy Google Apps Script (Web App) มาวางที่นี่
const API_URL = 'https://script.google.com/macros/s/AKfycbwgG8bb9gooS7ITQ-K1LLBYr4CoNXHyU3E_bGwQQ4V26mWm44StrAa0yKScM4jmmbCdBQ/exec'; 

// ==========================================
// 2. ตัวแปรสถานะและ DOM Elements
// ==========================================
let currentUser = JSON.parse(localStorage.getItem('arams_user')) || null;

// DOM Elements - Login
const loginPage = document.getElementById('login-page');
const loginForm = document.getElementById('login-form');
const inputUsername = document.getElementById('username');
const inputPassword = document.getElementById('password');
const btnLoginSubmit = document.getElementById('btn-login-submit');
const loginError = document.getElementById('login-error');
const loginErrorText = document.getElementById('login-error-text');

// DOM Elements - Main App
const appPage = document.getElementById('app-page');
const sidebar = document.getElementById('sidebar');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const btnLogout = document.getElementById('btn-logout');
const topbarTitle = document.getElementById('topbar-title');
const sidebarUserName = document.getElementById('sidebar-user-name');
const sidebarUserRole = document.getElementById('sidebar-user-role');
const navLinks = document.querySelectorAll('.nav-link');
const viewSections = document.querySelectorAll('.view-section');
const viewComingSoon = document.getElementById('view-coming-soon');
const comingSoonTitle = document.getElementById('coming-soon-title');

// DOM Elements - Dashboard Stats
const statTotalStudents = document.getElementById('stat-total-students');
const statTotalTeachers = document.getElementById('stat-total-teachers');
const statTotalCourses = document.getElementById('stat-total-classes'); // ใน HTML ระบุเป็น classes แต่ไอคอนคือหนังสือ ใช้แสดงข้อมูลรายวิชาแทนได้

// ==========================================
// 3. เริ่มต้นระบบ (Initialization)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupEventListeners();
});

function setupEventListeners() {
    // ฟอร์ม Login
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // ปุ่ม Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }

    // ปุ่มเปิด/ปิด Sidebar
    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            // สลับคลาสเพื่อซ่อน/แสดง sidebar สำหรับหน้าจอเล็ก
            sidebar.classList.toggle('-translate-x-full');
            sidebar.classList.toggle('absolute');
            sidebar.classList.toggle('z-30');
            sidebar.classList.toggle('h-full');
        });
    }

    // เมนูนำทาง (Navigation)
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetViewId = link.getAttribute('data-target');
            const menuTitle = link.getAttribute('data-title') || link.innerText.trim();
            switchView(targetViewId, link, menuTitle);
        });
    });
}

// ==========================================
// 4. ระบบจัดการสถานะผู้ใช้ (Authentication)
// ==========================================
function checkAuthState() {
    if (currentUser && currentUser.userId) {
        // มีข้อมูล Login อยู่แล้ว -> แสดงหน้า App
        showAppPage();
    } else {
        // ยังไม่มีข้อมูล -> แสดงหน้า Login
        showLoginPage();
    }
}

function showLoginPage() {
    loginPage.classList.remove('hidden');
    loginPage.classList.add('flex');
    appPage.classList.add('hidden');
    appPage.classList.remove('flex');
    
    // เคลียร์ค่าฟอร์ม
    inputUsername.value = '';
    inputPassword.value = '';
    loginError.classList.add('hidden');
}

function showAppPage() {
    loginPage.classList.add('hidden');
    loginPage.classList.remove('flex');
    appPage.classList.remove('hidden');
    appPage.classList.add('flex');

    // อัพเดทข้อมูลผู้ใช้ใน Sidebar
    sidebarUserName.innerText = currentUser.fullName;
    
    let roleText = 'ผู้ดูแลระบบ';
    let roleIcon = '<i class="fa-solid fa-shield-halved mr-1 text-sm"></i>';
    if (currentUser.role === 'Teacher') {
        roleText = 'ครูผู้สอน';
        roleIcon = '<i class="fa-solid fa-chalkboard-user mr-1 text-sm"></i>';
    } else if (currentUser.role === 'Student') {
        roleText = 'นักเรียน';
        roleIcon = '<i class="fa-solid fa-user-graduate mr-1 text-sm"></i>';
    }
    sidebarUserRole.innerHTML = `${roleIcon} ${roleText}`;

    // โหลดข้อมูล Dashboard
    loadDashboardData();
    
    // ตั้งค่าหน้าเริ่มต้นเป็น Dashboard
    const dashboardLink = document.querySelector('[data-target="view-dashboard"]');
    if (dashboardLink) {
        switchView('view-dashboard', dashboardLink, 'หน้าหลัก (Dashboard)');
    }
}

// ==========================================
// 5. ระบบ Login และ API Call (Backend Communication)
// ==========================================
async function handleLogin(e) {
    e.preventDefault();
    
    const username = inputUsername.value.trim();
    const password = inputPassword.value.trim();

    if (!username || !password) {
        showLoginError('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
        return;
    }

    // เปลี่ยนสถานะปุ่มเป็น Loading
    const originalBtnHTML = btnLoginSubmit.innerHTML;
    btnLoginSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> กำลังเข้าสู่ระบบ...';
    btnLoginSubmit.disabled = true;
    btnLoginSubmit.classList.add('opacity-75', 'cursor-not-allowed');
    loginError.classList.add('hidden');

    try {
        const response = await fetchAPI('POST', {
            action: 'LOGIN',
            payload: {
                username: username,
                password: password
            }
        });

        if (response.status === 'success') {
            // บันทึกข้อมูลลง LocalStorage
            currentUser = response.data;
            localStorage.setItem('arams_user', JSON.stringify(currentUser));
            
            // เปลี่ยนหน้า
            showAppPage();
        } else {
            showLoginError(response.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    } catch (error) {
        showLoginError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบ URL หรืออินเทอร์เน็ต');
        console.error('Login Error:', error);
    } finally {
        // คืนค่าปุ่มกลับมา
        btnLoginSubmit.innerHTML = originalBtnHTML;
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.classList.remove('opacity-75', 'cursor-not-allowed');
    }
}

function showLoginError(msg) {
    loginErrorText.innerText = msg;
    loginError.classList.remove('hidden');
    loginError.classList.add('animate-pulse');
    setTimeout(() => loginError.classList.remove('animate-pulse'), 500);
}

function handleLogout() {
    SwalConfirm('ยืนยันการออกจากระบบ', 'คุณต้องการออกจากระบบใช่หรือไม่?', 'warning', () => {
        currentUser = null;
        localStorage.removeItem('arams_user');
        showLoginPage();
    });
}

// ==========================================
// 6. ระบบสลับหน้าจอ (View Routing)
// ==========================================
function switchView(targetId, activeLink, titleText) {
    // 1. ซ่อนทุกหน้า
    viewSections.forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('active');
    });

    // 2. จัดการสถานะ Active ของเมนู
    navLinks.forEach(link => {
        link.classList.remove('bg-slate-700', 'text-white');
        link.classList.add('text-slate-300');
    });
    
    if (activeLink) {
        activeLink.classList.remove('text-slate-300');
        activeLink.classList.add('bg-slate-700', 'text-white');
    }

    // 3. เปลี่ยนหัวข้อ Topbar
    topbarTitle.innerText = titleText;

    // 4. แสดงหน้าที่เลือก หรือหน้า Coming Soon
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
        targetElement.classList.remove('hidden');
        targetElement.classList.add('active');
    } else {
        // ถ้าไม่พบหน้าที่สร้างไว้ ให้แสดงหน้า Coming Soon
        viewComingSoon.classList.remove('hidden');
        viewComingSoon.classList.add('active');
        comingSoonTitle.innerText = `ระบบ${titleText}`;
    }

    // ปิด Sidebar อัตโนมัติบนหน้าจอมือถือเมื่อกดเมนู
    if (window.innerWidth < 1024) { // Tailwind 'lg' breakpoint is 1024px
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('absolute', 'z-30', 'h-full');
    }
}

// ==========================================
// 7. ระบบดึงข้อมูลสำหรับ Dashboard
// ==========================================
async function loadDashboardData() {
    try {
        const response = await fetchAPI('GET', { action: 'GET_DASHBOARD_STATS' });
        
        if (response.status === 'success' && response.data) {
            animateValue(statTotalStudents, 0, response.data.totalStudents, 1000);
            animateValue(statTotalTeachers, 0, response.data.totalTeachers, 1000);
            animateValue(statTotalCourses, 0, response.data.totalCourses, 1000);
        }
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        statTotalStudents.innerText = 'N/A';
        statTotalTeachers.innerText = 'N/A';
        statTotalCourses.innerText = 'N/A';
    }
}

// ==========================================
// 8. ฟังก์ชันช่วยเหลือ (Helper Functions)
// ==========================================

/**
 * ฟังก์ชันหลักสำหรับเรียก API ไปยัง Google Apps Script
 */
async function fetchAPI(method, params) {
    if (API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        console.warn('⚠️ กรุณาตั้งค่า API_URL ใน script.js ให้ถูกต้อง');
        // จำลองข้อมูลจำลองหากยังไม่ได้ใส่ URL จริง เพื่อไม่ให้ระบบค้าง
        if(params.action === 'LOGIN') return { status: 'success', data: { userId: '1', username: 'mock', role: 'Admin', fullName: 'ผู้ดูแลระบบ (Demo)' } };
        if(params.action === 'GET_DASHBOARD_STATS') return { status: 'success', data: { totalStudents: 1250, totalTeachers: 85, totalCourses: 120 } };
        throw new Error('API_URL is not set.');
    }

    let url = API_URL;
    let options = {
        method: method,
        mode: 'cors'
    };

    if (method === 'GET') {
        const queryParams = new URLSearchParams(params).toString();
        url = `${API_URL}?${queryParams}`;
    } else if (method === 'POST') {
        options.headers = { 'Content-Type': 'text/plain;charset=utf-8' }; // เลี่ยง CORS Preflight ที่เข้มงวดของ GAS
        options.body = JSON.stringify(params);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * แอนิเมชั่นนับตัวเลข
 */
function animateValue(obj, start, end, duration) {
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end; // แน่ใจว่าตัวเลขสุดท้ายตรงเป๊ะ
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * Alert แบบกำหนดเอง (ใช้แบบง่ายๆ ก่อน หากต้องการสวยงามสามารถลงไลบรารี SweetAlert2 เพิ่มได้)
 */
function SwalConfirm(title, text, icon, onConfirm) {
    if (confirm(`${title}\n\n${text}`)) {
        onConfirm();
    }
}
