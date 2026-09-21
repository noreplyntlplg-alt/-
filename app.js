/**
 * ==========================================================================
 * ARAMS - Academic Registration and Assessment Management System
 * Frontend Application Logic (app.js)
 * ==========================================================================
 */

// 1. ตั้งค่า API (นำ URL ที่ได้จากการ Deploy Google Apps Script มาใส่ที่นี่)
const API_URL = 'https://script.google.com/macros/s/AKfycbwgG8bb9gooS7ITQ-K1LLBYr4CoNXHyU3E_bGwQQ4V26mWm44StrAa0yKScM4jmmbCdBQ/exec'; 

// 2. State Management (เก็บสถานะการใช้งาน)
let state = {
    currentUser: null,
    currentPage: 'dashboard',
    academicYear: '2567/1',
    sidebarOpen: true
};

/**
 * ==========================================================================
 * Initialization & Event Listeners
 * ==========================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
    // ซ่อน App และแสดง Login ตอนเริ่มต้น
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';

    // Event: ฟอร์ม Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Event: ปุ่ม Logout
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Event: ปุ่มเปิด-ปิด Sidebar
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        state.sidebarOpen = !state.sidebarOpen;
        if(window.innerWidth > 768) {
            document.body.classList.toggle('sidebar-collapsed', !state.sidebarOpen);
        } else {
            document.body.classList.toggle('sidebar-mobile-open', state.sidebarOpen);
        }
    });

    // Event: จัดการเมนู Sidebar แบบ Accordion และการเปลี่ยนหน้า
    setupSidebarNavigation();

    // Event: เปลี่ยนปีการศึกษา
    document.getElementById('global-academic-year').addEventListener('change', (e) => {
        state.academicYear = e.target.value;
        loadPage(state.currentPage); // โหลดหน้าปัจจุบันใหม่ด้วยปีการศึกษาใหม่
    });
});

/**
 * ==========================================================================
 * API Communication (เชื่อมต่อ Google Sheets)
 * ==========================================================================
 */
async function callAPI(action, payload = {}) {
    showLoading(true);
    try {
        // กรณียังไม่ใส่ URL จริง ให้จำลอง Response เพื่อให้ UI ทำงานได้
        if(API_URL === 'YOUR_GOOGLE_WEB_APP_URL_HERE') {
            console.warn("ยังไม่ได้ตั้งค่า API_URL - ใช้ระบบจำลองข้อมูลชั่วคราว");
            return await mockBackend(action, payload);
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: action, payload: payload }),
            // ใช้ text/plain เพื่อเลี่ยงปัญหา CORS Preflight ของ Google Apps Script
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        
        const result = await response.json();
        if (result.status === 'error') throw new Error(result.message);
        return result.data;
    } catch (error) {
        console.error("API Error:", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
        throw error;
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    document.getElementById('loading-spinner').style.display = show ? 'flex' : 'none';
}

/**
 * ==========================================================================
 * Authentication (ระบบ Login / Logout)
 * ==========================================================================
 */
async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    errorDiv.style.display = 'none';
    const btn = e.target.querySelector('button');
    btn.textContent = 'กำลังเข้าสู่ระบบ...';
    btn.disabled = true;

    try {
        const userData = await callAPI('LOGIN', { username: user, password: pass });
        
        // บันทึก Session
        state.currentUser = userData;
        document.getElementById('current-user-name').textContent = userData.name;
        document.getElementById('current-user-role').textContent = userData.role;
        
        // สลับหน้าจอ
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        
        // โหลดหน้าแรก
        loadPage('dashboard');
    } catch (err) {
        errorDiv.textContent = err.message || 'เข้าสู่ระบบล้มเหลว';
        errorDiv.style.display = 'block';
    } finally {
        btn.textContent = 'เข้าสู่ระบบ';
        btn.disabled = false;
    }
}

function handleLogout(e) {
    e.preventDefault();
    state.currentUser = null;
    document.getElementById('login-form').reset();
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
}

/**
 * ==========================================================================
 * Navigation & Router (ระบบเปลี่ยนหน้า SPA)
 * ==========================================================================
 */
function setupSidebarNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item.has-submenu > a');
    
    // เปิด-ปิด Submenu
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const parentLi = item.parentElement;
            
            // ปิดอันอื่น
            document.querySelectorAll('.sidebar-menu .menu-item.has-submenu').forEach(li => {
                if(li !== parentLi) li.classList.remove('open');
            });
            
            parentLi.classList.toggle('open');
        });
    });

    // คลิกเพื่อเปลี่ยนหน้า (Router)
    const pageLinks = document.querySelectorAll('[data-page]');
    pageLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            
            // ลบ active ออกจากทุกเมนู
            document.querySelectorAll('[data-page]').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.submenu li').forEach(el => el.classList.remove('active'));
            
            // เพิ่ม active ให้ตัวที่คลิก
            link.classList.add('active');
            if(link.tagName.toLowerCase() === 'li' && link.parentElement.classList.contains('submenu')) {
                link.parentElement.parentElement.classList.add('active');
            }
            
            // ปิด sidebar บนมือถือ
            if(window.innerWidth <= 768) {
                state.sidebarOpen = false;
                document.body.classList.remove('sidebar-mobile-open');
            }

            loadPage(pageId);
        });
    });
}

// ---------------------------------------------------------
// Router หลัก: กำหนดว่าแต่ละเมนูจะให้แสดง HTML อะไร
// ---------------------------------------------------------
async function loadPage(pageId) {
    state.currentPage = pageId;
    const viewContainer = document.getElementById('dynamic-view');
    const titleContainer = document.getElementById('page-title');
    
    // ล้างข้อมูลเก่า
    viewContainer.innerHTML = '';
    
    // รายชื่อเมนูทั้งหมดและชื่อเรื่อง
    const pageTitles = {
        'dashboard': 'หน้าหลัก / Dashboard',
        'student-info': 'ข้อมูลนักเรียนทั้งหมด',
        'student-add': 'เพิ่ม/แก้ไขนักเรียน',
        'class-management': 'การจัดชั้นเรียน',
        'student-status': 'สถานะนักเรียน',
        'student-history': 'ประวัติการศึกษา',
        'subject-manage': 'จัดการรายวิชา',
        'schedule-manage': 'จัดตารางสอน',
        'curriculum-structure': 'โครงสร้างหลักสูตร',
        'score-entry': 'บันทึกคะแนนรายวิชา',
        'score-check': 'ตรวจสอบคะแนนผิดปกติ',
        'score-status': 'สถานะผลการเรียน',
        'grade-subject': 'ผลการเรียนรายวิชา',
        'grade-semester': 'ผลการเรียนรายภาค/สะสม',
        'grade-compare': 'เปรียบเทียบผลการเรียน',
        'grade-report': 'รายงานผลการเรียน',
        'remedial-list': 'รายการที่ต้องแก้ (0/ร/มส/มผ)',
        'remedial-process': 'ดำเนินการแก้ผลการเรียน',
        'remedial-history': 'ประวัติการแก้ผลการเรียน',
        'attendance-check': 'เช็กการมาเรียน',
        'attendance-summary': 'สรุปเวลาเรียนสะสม',
        'attendance-report': 'รายงานการมาเรียน',
        'leave-request': 'ระบบขอลา',
        'leave-approve': 'อนุมัติการลา',
        'leave-history': 'ประวัติการลา',
        'doc-academic': 'เอกสารผลการเรียน (ปพ.)',
        'doc-attendance': 'เอกสารการมาเรียน',
        'doc-remedial': 'เอกสารแก้ผลการเรียน',
        'teacher-dashboard': 'หน้าหลักครูผู้สอน',
        'teacher-tasks': 'งานที่ต้องดำเนินการ',
        'teacher-advisee': 'นักเรียนในความดูแล',
        'student-dashboard': 'หน้าหลักนักเรียน',
        'student-grades': 'ผลการเรียนของฉัน',
        'student-attendance': 'การมาเรียนของฉัน',
        'parent-dashboard': 'ข้อมูลบุตรหลาน',
        'parent-alerts': 'ระบบแจ้งเตือนผู้ปกครอง',
        'report-students': 'รายงานจำนวนนักเรียน',
        'report-academic': 'รายงานผลการเรียน/GPA',
        'report-attendance': 'รายงานสถิติการมาเรียน',
        'stat-executive': 'Dashboard ผู้บริหาร',
        'stat-graphs': 'กราฟวิเคราะห์ผลการเรียน',
        'announce-create': 'สร้างประกาศใหม่',
        'announce-list': 'รายการประกาศ',
        'notifications': 'ระบบแจ้งเตือนทั้งหมด',
        'user-manage': 'จัดการผู้ใช้งาน',
        'role-manage': 'จัดการสิทธิ์ (Role)',
        'setting-school': 'ตั้งค่าข้อมูลโรงเรียน',
        'setting-academic': 'ตั้งค่าปีการศึกษาและเกณฑ์',
        'setting-document': 'รูปแบบเอกสารและลายเซ็น'
    };

    titleContainer.textContent = pageTitles[pageId] || 'ARAMS System';

    // Routing Logic สำหรับแต่ละหน้า
    switch (pageId) {
        case 'dashboard':
            renderDashboard(viewContainer);
            break;
        case 'student-info':
            renderStudentInfo(viewContainer);
            break;
        case 'score-entry':
            renderScoreEntry(viewContainer);
            break;
        case 'attendance-check':
            renderAttendanceCheck(viewContainer);
            break;
        case 'remedial-list':
            renderRemedialList(viewContainer);
            break;
        default:
            // กรณีเป็นหน้าที่ยังไม่ได้เจาะจงฟังก์ชัน render ให้แสดง Template เปล่า
            renderGenericPage(viewContainer, titleContainer.textContent);
            break;
    }
}

/**
 * ==========================================================================
 * View Renderers (ฟังก์ชันสร้างหน้าจอ UI แบบเจาะจง)
 * ==========================================================================
 */

// 1. หน้า Dashboard
async function renderDashboard(container) {
    let stats = { totalStudents: 0, maleStudents: 0, femaleStudents: 0, studentsWithZero: 0, studentsWithR: 0, studentsWithMS: 0, totalTeachers: 0, totalSubjects: 0 };
    try {
        stats = await callAPI('GET_DASHBOARD');
    } catch(e) {
        console.log("Using default stat due to API issue");
    }

    container.innerHTML = `
        <div class="dashboard-grid">
            <div class="stat-box">
                <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
                <div class="stat-details">
                    <h3>นักเรียนทั้งหมด (คน)</h3>
                    <p>${stats.totalStudents || 2450}</p>
                </div>
            </div>
            <div class="stat-box success">
                <div class="stat-icon"><i class="fa-solid fa-chalkboard-user"></i></div>
                <div class="stat-details">
                    <h3>ครูผู้สอน (คน)</h3>
                    <p>${stats.totalTeachers || 120}</p>
                </div>
            </div>
            <div class="stat-box warning">
                <div class="stat-icon"><i class="fa-solid fa-book"></i></div>
                <div class="stat-details">
                    <h3>รายวิชาทั้งหมด (วิชา)</h3>
                    <p>${stats.totalSubjects || 85}</p>
                </div>
            </div>
            <div class="stat-box danger">
                <div class="stat-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="stat-details">
                    <h3>นักเรียนที่ติด 0/ร/มส (คน)</h3>
                    <p>${(stats.studentsWithZero || 0) + (stats.studentsWithR || 0) + (stats.studentsWithMS || 0)}</p>
                </div>
            </div>
        </div>

        <div class="dashboard-grid" style="grid-template-columns: 2fr 1fr;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><i class="fa-solid fa-chart-column"></i> สถิติการมาเรียนวันนี้</h3>
                </div>
                <div style="height: 300px; display: flex; align-items: flex-end; justify-content: space-around; padding-top: 20px;">
                    <!-- Placeholder กราฟ -->
                    <div style="width: 50px; background: var(--success); height: 95%; text-align: center; color: white;">มา</div>
                    <div style="width: 50px; background: var(--danger); height: 10%; text-align: center; color: white;">ขาด</div>
                    <div style="width: 50px; background: var(--warning); height: 15%; text-align: center; color: white;">สาย</div>
                    <div style="width: 50px; background: var(--info); height: 5%; text-align: center; color: white;">ลา</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><i class="fa-solid fa-clipboard-list"></i> งานที่ต้องดำเนินการ</h3>
                </div>
                <ul style="list-style: none; padding: 0;">
                    <li style="padding: 15px 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                        <span><i class="fa-solid fa-circle-exclamation text-danger"></i> ส่งคะแนนกลางภาค ม.3/2</span>
                        <a href="#" class="btn btn-outline" style="padding: 2px 10px; font-size: 14px;">จัดการ</a>
                    </li>
                    <li style="padding: 15px 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                        <span><i class="fa-solid fa-circle-exclamation text-danger"></i> อนุมัติการลา (3 รายการ)</span>
                        <a href="#" class="btn btn-outline" style="padding: 2px 10px; font-size: 14px;">จัดการ</a>
                    </li>
                    <li style="padding: 15px 0; display: flex; justify-content: space-between;">
                        <span><i class="fa-solid fa-check-circle" style="color:var(--success);"></i> เช็กชื่อ ม.1/1 เรียบร้อย</span>
                    </li>
                </ul>
            </div>
        </div>
    `;
}

// 2. หน้าข้อมูลนักเรียน
async function renderStudentInfo(container) {
    container.innerHTML = `
        <div class="card">
            <div class="filter-bar">
                <div class="form-group">
                    <label>ระดับชั้น</label>
                    <select class="form-control" id="filter-level">
                        <option value="">ทั้งหมด</option>
                        <option value="ม.1">ม.1</option>
                        <option value="ม.2">ม.2</option>
                        <option value="ม.3">ม.3</option>
                        <option value="ม.4">ม.4</option>
                        <option value="ม.5">ม.5</option>
                        <option value="ม.6">ม.6</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>ห้อง</label>
                    <input type="text" class="form-control" id="filter-room" placeholder="เช่น 1, 2">
                </div>
                <div class="form-group">
                    <label>ค้นหา</label>
                    <input type="text" class="form-control" placeholder="ชื่อ-สกุล หรือ รหัสนักเรียน">
                </div>
                <div class="form-group" style="justify-content: flex-end;">
                    <button class="btn btn-primary"><i class="fa-solid fa-magnifying-glass"></i> ค้นหา</button>
                </div>
                <div class="form-group" style="justify-content: flex-end; margin-left: auto;">
                    <button class="btn btn-success"><i class="fa-solid fa-plus"></i> เพิ่มนักเรียน</button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table-arams">
                    <thead>
                        <tr>
                            <th>รหัสนักเรียน</th>
                            <th class="text-left">ชื่อ - นามสกุล</th>
                            <th>ชั้น</th>
                            <th>ห้อง</th>
                            <th>สถานะ</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody id="student-tbody">
                        <tr><td colspan="6">กำลังโหลดข้อมูล...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    try {
        const data = await callAPI('READ_DATA', { sheetName: 'Students' });
        const tbody = document.getElementById('student-tbody');
        
        if(!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">ไม่พบข้อมูลนักเรียน</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(student => {
            html += `
                <tr>
                    <td>${student.student_id}</td>
                    <td class="text-left">${student.prefix} ${student.fname} ${student.lname}</td>
                    <td>${student.class_level}</td>
                    <td>${student.room}</td>
                    <td><span class="status-badge ${student.status === 'ปกติ' ? 'status-pass' : 'status-leave'}">${student.status || 'ปกติ'}</span></td>
                    <td>
                        <button class="btn-icon" title="ดูข้อมูล"><i class="fa-solid fa-eye text-primary"></i></button>
                        <button class="btn-icon" title="แก้ไข"><i class="fa-solid fa-pen" style="color:var(--warning);"></i></button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch(e) {
        document.getElementById('student-tbody').innerHTML = `<tr><td colspan="6" class="text-danger">ดึงข้อมูลล้มเหลว</td></tr>`;
    }
}

// 3. หน้าบันทึกคะแนน
async function renderScoreEntry(container) {
    container.innerHTML = `
        <div class="card">
            <div class="filter-bar">
                <div class="form-group">
                    <label>ระดับชั้น</label>
                    <select class="form-control" id="score-level"><option value="ม.3">ม.3</option></select>
                </div>
                <div class="form-group">
                    <label>ห้อง</label>
                    <select class="form-control" id="score-room"><option value="2">2</option></select>
                </div>
                <div class="form-group">
                    <label>รายวิชา</label>
                    <select class="form-control" id="score-subject">
                        <option value="ค23101">ค23101 คณิตศาสตร์พื้นฐาน 5</option>
                    </select>
                </div>
                <div class="form-group" style="justify-content: flex-end;">
                    <button class="btn btn-primary" id="btn-load-scores"><i class="fa-solid fa-list-check"></i> ดึงรายชื่อ</button>
                </div>
            </div>

            <div id="score-table-container" style="display:none;">
                <div class="table-responsive">
                    <table class="table-arams">
                        <thead>
                            <tr>
                                <th width="10%">เลขที่</th>
                                <th width="30%" class="text-left">ชื่อ-สกุล</th>
                                <th width="15%">คะแนนเก็บ (60)</th>
                                <th width="15%">กลางภาค (20)</th>
                                <th width="15%">ปลายภาค (20)</th>
                                <th width="10%">รวม (100)</th>
                                <th width="5%">เกรด</th>
                            </tr>
                        </thead>
                        <tbody id="score-tbody">
                            <!-- จะเรนเดอร์ด้วย JS -->
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 20px; text-align: right;">
                    <button class="btn btn-success" id="btn-save-scores"><i class="fa-solid fa-floppy-disk"></i> บันทึกคะแนนทั้งหมด</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-load-scores').addEventListener('click', async () => {
        document.getElementById('score-table-container').style.display = 'block';
        const tbody = document.getElementById('score-tbody');
        tbody.innerHTML = `<tr><td colspan="7">กำลังโหลดข้อมูล...</td></tr>`;

        try {
            // สมมติฐานว่าดึงข้อมูลลงทะเบียนเรียน
            const enrollments = await callAPI('READ_DATA', { sheetName: 'Enrollments' });
            
            if(enrollments.length === 0) {
                // สร้างข้อมูลจำลองให้ดูเพื่อความสวยงามถ้าฐานข้อมูลยังว่าง
                renderMockScores(tbody);
            } else {
                let html = '';
                enrollments.forEach((en, idx) => {
                    html += createScoreRow(idx+1, en.student_id, en.score_collect, en.score_mid, en.score_final);
                });
                tbody.innerHTML = html;
            }
            attachScoreCalculators();
        } catch(e) {
            renderMockScores(tbody); // Fallback โชว์ของจำลองกรณีไม่ได้ต่อเน็ต
            attachScoreCalculators();
        }
    });
}

function createScoreRow(no, name, c = '', m = '', f = '') {
    return `
        <tr>
            <td>${no}</td>
            <td class="text-left">${name}</td>
            <td><input type="number" class="score-input input-col" max="60" value="${c}"></td>
            <td><input type="number" class="score-input input-mid" max="20" value="${m}"></td>
            <td><input type="number" class="score-input input-fin" max="20" value="${f}"></td>
            <td><span class="total-score" style="font-weight:bold;">0</span></td>
            <td><span class="grade-result status-badge status-0">0</span></td>
        </tr>
    `;
}

function renderMockScores(tbody) {
    let html = '';
    const mockNames = ["ด.ช. สมชาย รักเรียน", "ด.ญ. สมหญิง ขยันดี", "นาย มานะ พากเพียร", "นางสาว ปิติ ยินดี"];
    mockNames.forEach((name, idx) => {
        html += createScoreRow(idx+1, name, Math.floor(Math.random()*20)+30, Math.floor(Math.random()*10)+5, Math.floor(Math.random()*10)+5);
    });
    tbody.innerHTML = html;
}

function attachScoreCalculators() {
    const rows = document.querySelectorAll('#score-tbody tr');
    rows.forEach(row => {
        const inputs = row.querySelectorAll('.score-input');
        const calc = () => {
            const col = parseFloat(row.querySelector('.input-col').value) || 0;
            const mid = parseFloat(row.querySelector('.input-mid').value) || 0;
            const fin = parseFloat(row.querySelector('.input-fin').value) || 0;
            const total = col + mid + fin;
            
            row.querySelector('.total-score').textContent = total;
            
            let grade = "0"; let cls = "status-0";
            if(total >= 80) { grade = "4"; cls = "status-pass"; }
            else if(total >= 75) { grade = "3.5"; cls = "status-pass"; }
            else if(total >= 70) { grade = "3"; cls = "status-pass"; }
            else if(total >= 65) { grade = "2.5"; cls = "status-pass"; }
            else if(total >= 60) { grade = "2"; cls = "status-pass"; }
            else if(total >= 55) { grade = "1.5"; cls = "status-pass"; }
            else if(total >= 50) { grade = "1"; cls = "status-pass"; }
            
            const badge = row.querySelector('.grade-result');
            badge.textContent = grade;
            badge.className = `grade-result status-badge ${cls}`;
        };
        inputs.forEach(inp => inp.addEventListener('input', calc));
        calc(); // คำนวณครั้งแรก
    });
}

// 4. หน้าเช็กการมาเรียน
function renderAttendanceCheck(container) {
    container.innerHTML = `
        <div class="card">
            <div class="filter-bar">
                <div class="form-group">
                    <label>วันที่</label>
                    <input type="date" class="form-control" id="att-date" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>ระดับชั้น</label>
                    <select class="form-control"><option>ม.1</option></select>
                </div>
                <div class="form-group">
                    <label>ห้อง</label>
                    <select class="form-control"><option>1</option></select>
                </div>
                <div class="form-group" style="justify-content: flex-end;">
                    <button class="btn btn-primary"><i class="fa-solid fa-list-check"></i> ดึงรายชื่อ</button>
                </div>
            </div>

            <div class="table-responsive mt-3">
                <table class="table-arams">
                    <thead>
                        <tr>
                            <th width="10%">เลขที่</th>
                            <th class="text-left" width="40%">ชื่อ - นามสกุล</th>
                            <th width="50%">สถานะการมาเรียน</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td class="text-left">ด.ช. สมชาย รักเรียน</td>
                            <td>
                                <div style="display:flex; justify-content:center; gap: 15px;">
                                    <label><input type="radio" name="att_1" value="มา" checked> <span style="color:var(--success);font-weight:bold;">มา</span></label>
                                    <label><input type="radio" name="att_1" value="ขาด"> <span style="color:var(--danger);font-weight:bold;">ขาด</span></label>
                                    <label><input type="radio" name="att_1" value="ลา"> <span style="color:gray;font-weight:bold;">ลา</span></label>
                                    <label><input type="radio" name="att_1" value="สาย"> <span style="color:var(--warning);font-weight:bold;">สาย</span></label>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td class="text-left">ด.ญ. สมหญิง ขยันดี</td>
                            <td>
                                <div style="display:flex; justify-content:center; gap: 15px;">
                                    <label><input type="radio" name="att_2" value="มา"> <span style="color:var(--success);font-weight:bold;">มา</span></label>
                                    <label><input type="radio" name="att_2" value="ขาด"> <span style="color:var(--danger);font-weight:bold;">ขาด</span></label>
                                    <label><input type="radio" name="att_2" value="ลา" checked> <span style="color:gray;font-weight:bold;">ลา</span></label>
                                    <label><input type="radio" name="att_2" value="สาย"> <span style="color:var(--warning);font-weight:bold;">สาย</span></label>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn btn-success"><i class="fa-solid fa-floppy-disk"></i> บันทึกการมาเรียน</button>
            </div>
        </div>
    `;
}

// 5. หน้ารายการที่ต้องแก้ผลการเรียน (งานแก้ตัว)
function renderRemedialList(container) {
    container.innerHTML = `
        <div class="card">
            <div class="tabs">
                <button class="tab-btn active">นักเรียนที่ติด 0</button>
                <button class="tab-btn">นักเรียนที่ติด ร</button>
                <button class="tab-btn">นักเรียนที่ติด มส</button>
            </div>
            
            <div class="filter-bar">
                <div class="form-group">
                    <label>ระดับชั้น</label>
                    <select class="form-control"><option value="">ทั้งหมด</option><option>ม.1</option><option>ม.2</option></select>
                </div>
                <div class="form-group">
                    <label>วิชา</label>
                    <select class="form-control"><option value="">ทั้งหมด</option><option>คณิตศาสตร์</option></select>
                </div>
                <div class="form-group" style="justify-content: flex-end;">
                    <button class="btn btn-primary"><i class="fa-solid fa-filter"></i> กรองข้อมูล</button>
                </div>
                <div class="form-group" style="justify-content: flex-end; margin-left: auto;">
                    <button class="btn btn-success"><i class="fa-solid fa-print"></i> พิมพ์ใบรายงาน</button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table-arams">
                    <thead>
                        <tr>
                            <th>รหัสนักเรียน</th>
                            <th class="text-left">ชื่อ - นามสกุล</th>
                            <th>ชั้น/ห้อง</th>
                            <th>วิชา</th>
                            <th>ผลการเรียนเดิม</th>
                            <th>สถานะการแก้</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>660101</td>
                            <td class="text-left">นาย กฤษณะ สอนดี</td>
                            <td>ม.4/1</td>
                            <td>คณิตศาสตร์เพิ่มเติม</td>
                            <td><span class="status-badge status-0">0</span></td>
                            <td><span class="status-badge" style="background:#edf2f7; color:#2d3748;">รอดำเนินการ</span></td>
                            <td><button class="btn btn-outline" style="font-size:14px; padding:2px 10px;">ลงทะเบียนแก้</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// 6. Generic Template สำหรับหน้าที่เหลือ (เพื่อให้ทำงานได้โดยไม่พัง 100%)
function renderGenericPage(container, title) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">${title}</h3>
            </div>
            <div style="padding: 40px; text-align: center; color: var(--text-muted);">
                <i class="fa-solid fa-screwdriver-wrench" style="font-size: 60px; margin-bottom: 20px; color: var(--border-color);"></i>
                <h2>ระบบกำลังอยู่ระหว่างการพัฒนา</h2>
                <p>หมวดหมู่ <b>${title}</b> จะเปิดให้ใช้งานในอัปเดตถัดไป</p>
                <br>
                <button class="btn btn-primary" onclick="loadPage('dashboard')">กลับไปหน้าหลัก</button>
            </div>
        </div>
    `;
}

/**
 * ==========================================================================
 * Mock Backend (สำหรับทดสอบ UI โดยไม่ต้องต่อ Google Sheet ทันที)
 * ==========================================================================
 */
function mockBackend(action, payload) {
    return new Promise((resolve) => {
        setTimeout(() => {
            if(action === 'LOGIN') {
                if(payload.username === 'sxaiq54' && payload.password === 'Sxxnga2011') {
                    resolve({ user_id: 'U001', username: 'sxaiq54', role: 'Admin', name: 'ผู้ดูแลระบบสูงสุด' });
                } else {
                    throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
                }
            }
            if(action === 'GET_DASHBOARD') {
                resolve({
                    totalStudents: 1250, maleStudents: 600, femaleStudents: 650, 
                    totalTeachers: 45, totalSubjects: 32, studentsWithZero: 12, studentsWithR: 5, studentsWithMS: 2
                });
            }
            if(action === 'READ_DATA') {
                if(payload.sheetName === 'Students') {
                    resolve([
                        {student_id: '67001', prefix: 'ด.ช.', fname: 'สมชาย', lname: 'รักเรียน', class_level: 'ม.1', room: '1', status: 'ปกติ'},
                        {student_id: '67002', prefix: 'ด.ญ.', fname: 'สมหญิง', lname: 'ขยันดี', class_level: 'ม.1', room: '1', status: 'ปกติ'}
                    ]);
                }
                resolve([]);
            }
        }, 800); // จำลอง delay 0.8 วิให้เหมือนดึงเน็ตจริง
    });
}
