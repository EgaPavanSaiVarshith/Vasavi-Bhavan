/* ================================================================
   MAIN APP CONTROLLER v2 — Approval Workflow, Image Viewer
   ================================================================ */
var App = window.App || {};
App.currentView = 'dashboard';

App.init = function () {
    this.Form.init();
    this.Members.init();
    this.Calendar.init();
    this._setupNav();
    this._setupSidebar();
    this._setupNotifs();
    this._setupLogout();
    this._setupImageModal();
    this.Committee.init();
    this.Gallery.init();
    var hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigate(hash);
    this.refreshAll();
    this._checkAlerts();
};

// ===== NAVIGATION =====
App.navigate = function (v) {
    this.currentView = v;
    document.querySelectorAll('.view').forEach(function (el) { el.classList.remove('active'); });
    var t = document.getElementById('view-' + v); if (t) t.classList.add('active');
    document.querySelectorAll('.nav-item[data-view]').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-view') === v); });
    var titles = { committee: 'Committee Members', dashboard: 'Dashboard', register: 'Register Member', pending: 'Pending Approvals', members: 'Members List', calendar: 'Calendar', gallery: 'Photo Gallery' };
    document.getElementById('pageTitle').textContent = titles[v] || 'Dashboard';
    window.location.hash = v;
    this._closeSidebar();
    if (v === 'dashboard') this.Dashboard.render();
    if (v === 'committee') this.Committee.render();
    if (v === 'members') this.Members.render();
    if (v === 'calendar') this.Calendar.render();
    if (v === 'gallery') this.Gallery.render();
    if (v === 'pending') this._renderPending();
    if (v === 'register') this.Form._showStep1();
};

App._setupNav = function () {
    var self = this;
    document.querySelectorAll('.nav-item[data-view]').forEach(function (l) {
        l.addEventListener('click', function (e) { e.preventDefault(); self.navigate(this.getAttribute('data-view')); });
    });
    window.addEventListener('hashchange', function () { var h = window.location.hash.replace('#', '') || 'dashboard'; if (h !== self.currentView) self.navigate(h); });
};

// ===== SIDEBAR =====
App._setupSidebar = function () {
    var self = this, sb = document.getElementById('sidebar'), ov = document.getElementById('sidebarOverlay');
    document.getElementById('menuToggle').addEventListener('click', function () { sb.classList.toggle('open'); ov.classList.toggle('show'); });
    ov.addEventListener('click', function () { self._closeSidebar(); });
};
App._closeSidebar = function () { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('show'); };

// ===== NOTIFICATIONS =====
App._setupNotifs = function () {
    var self = this, p = document.getElementById('notifPanel'), ov = document.getElementById('notifOverlay');
    document.getElementById('notifToggle').addEventListener('click', function () { self._renderNotifPanel(); p.classList.add('show'); ov.classList.add('show'); });
    document.getElementById('notifClose').addEventListener('click', function () { p.classList.remove('show'); ov.classList.remove('show'); });
    ov.addEventListener('click', function () { p.classList.remove('show'); ov.classList.remove('show'); });
};
App._renderNotifPanel = function () {
    var body = document.getElementById('notifBody');
    var pending = App.DB.getPending();
    var events = App.DB.getUpcomingEvents(30);
    var items = '';

    if (pending.length) {
        items += '<div style="font-size:.78rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;padding:8px 0 4px">Pending Approvals</div>';
        items += pending.map(function (m) {
            return '<div class="notif-item"><div class="notif-item-icon">⏳</div><div class="notif-item-content"><div class="notif-item-title">' + App.Utils.escapeHtml(m.memberName) + '</div><div class="notif-item-desc">Awaiting approval</div></div></div>';
        }).join('');
    }

    if (events.length) {
        items += '<div style="font-size:.78rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;padding:12px 0 4px">Upcoming Events</div>';
        items += events.map(function (ev) {
            var icon = ev.type === 'birthday' ? '🎂' : '💍', label = ev.type === 'birthday' ? 'Birthday' : 'Anniversary';
            var dt = ev.daysUntil === 0 ? '🎉 Today!' : 'In ' + ev.daysUntil + ' day(s)';
            return '<div class="notif-item"><div class="notif-item-icon">' + icon + '</div><div class="notif-item-content"><div class="notif-item-title">' + App.Utils.escapeHtml(ev.member.memberName) + '</div><div class="notif-item-desc">' + label + ' — ' + dt + '</div></div></div>';
        }).join('');
    }

    body.innerHTML = items || '<p class="notif-empty">🔔 No notifications</p>';
};

// ===== ALERTS =====
App._checkAlerts = function () {
    var bd = App.DB.getTodayBirthdays(), an = App.DB.getTodayAnniversaries(), up = App.DB.getUpcomingEvents(7), pe = App.DB.getPending();
    var total = up.length + pe.length;
    var badge = document.getElementById('notifBadge');
    badge.style.display = total > 0 ? 'flex' : 'none'; badge.textContent = total;

    // Pending badge in sidebar
    var pb = document.getElementById('pendingBadge');
    pb.style.display = pe.length > 0 ? 'flex' : 'none'; pb.textContent = pe.length;

    var self = this;
    setTimeout(function () {
        bd.forEach(function (m) { self.toast('🎂 Happy Birthday to ' + m.memberName + '!', 'info'); });
        an.forEach(function (m) { self.toast('💍 Happy Anniversary to ' + m.memberName + '!', 'info'); });
        if (pe.length) self.toast('⏳ ' + pe.length + ' pending approval' + (pe.length > 1 ? 's' : '') + ' to review', 'warning');
    }, 800);
};

// ===== PENDING APPROVALS =====
App._renderPending = function () {
    var c = document.getElementById('pendingList'), pending = App.DB.getPending();
    if (!pending.length) { c.innerHTML = '<p class="empty-state">No pending applications 🎉</p>'; return; }
    c.innerHTML = pending.map(function (m) {
        var esc = App.Utils.escapeHtml, fd = App.Utils.formatDate;
        var aadhaarBtn = m.aadhaarFile ? '<button class="view-doc-btn" onclick="App.viewImage(\'' + m.id + '\',\'aadhaar\')">📄 View Aadhaar</button>' : '';
        var paymentBtn = m.paymentProof ? '<button class="view-doc-btn" onclick="App.viewImage(\'' + m.id + '\',\'payment\')">🧾 View Payment</button>' : '';
        return '<div class="approval-card">'
            + '<div class="ac-header"><h3>' + esc(m.memberName) + '</h3><span class="status-badge status-pending">Pending</span></div>'
            + '<div class="ac-body">'
            + '<div class="ac-detail"><strong>DOB:</strong> ' + fd(m.dob) + '</div>'
            + '<div class="ac-detail"><strong>Father:</strong> ' + esc(m.fatherName) + '</div>'
            + '<div class="ac-detail"><strong>Spouse:</strong> ' + esc(m.spouseName || '—') + '</div>'
            + '<div class="ac-detail"><strong>Gothram:</strong> ' + esc(m.gothram) + '</div>'
            + '<div class="ac-detail"><strong>Blood:</strong> ' + esc(m.bloodGroup) + '</div>'
            + '<div class="ac-detail"><strong>Mobile:</strong> ' + esc(m.mobileNumber) + '</div>'
            + '<div class="ac-detail"><strong>Marriage:</strong> ' + fd(m.marriageDay) + '</div>'
            + '<div class="ac-detail"><strong>Address:</strong> ' + esc(m.address) + '</div>'
            + '<div class="ac-uploads">' + aadhaarBtn + paymentBtn + '</div>'
            + '</div>'
            + '<div class="ac-actions"><button class="btn btn-success btn-sm" onclick="App.approveMember(\'' + m.id + '\')">✅ Approve</button><button class="btn btn-danger btn-sm" onclick="App.rejectMember(\'' + m.id + '\')">❌ Reject</button></div>'
            + '</div>';
    }).join('');
};

App.approveMember = function (id) { App.DB.approve(id); App.toast('Member approved! ✅', 'success'); App.refreshAll(); this._renderPending(); };
App.rejectMember = function (id) { App.DB.reject(id); App.toast('Application rejected', 'warning'); App.refreshAll(); this._renderPending(); };

// ===== IMAGE VIEWER MODAL =====
App._setupImageModal = function () {
    document.getElementById('closeImageModal').addEventListener('click', function () { document.getElementById('imageModal').classList.remove('show'); });
    document.getElementById('imageModal').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });
};
App.viewImage = function (id, type) {
    var m = App.DB.getById(id); if (!m) return;
    var src = type === 'aadhaar' ? m.aadhaarFile : m.paymentProof;
    if (!src) { this.toast('No document uploaded', 'warning'); return; }
    document.getElementById('modalImage').src = src;
    document.getElementById('imageModal').classList.add('show');
};

// ===== LOGOUT =====
App._setupLogout = function () {
    document.getElementById('logoutBtn').addEventListener('click', function () { sessionStorage.removeItem('vasavi_auth'); sessionStorage.removeItem('vasavi_user'); window.location.href = 'login.html'; });
};

// ===== REFRESH ALL =====
App.refreshAll = function () { this.Dashboard.render(); this.Committee.render(); this.Members.render(); this.Calendar.render(); this._checkAlerts(); };

// ===== TOAST =====
App.toast = function (msg, type) {
    type = type || 'info';
    var icons = { success: '✅', error: '❌', warning: '⚠️', info: '💡' };
    var c = document.getElementById('toastContainer');
    var t = document.createElement('div'); t.className = 'toast toast-' + type;
    t.innerHTML = '<span class="toast-icon">' + (icons[type] || '💡') + '</span><span class="toast-msg">' + msg + '</span><button class="toast-close">&times;</button>';
    c.appendChild(t);
    t.querySelector('.toast-close').addEventListener('click', function () { t.classList.add('toast-out'); setTimeout(function () { t.remove(); }, 300); });
    setTimeout(function () { if (t.parentElement) { t.classList.add('toast-out'); setTimeout(function () { t.remove(); }, 300); } }, 5000);
};

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', function () { App.init(); });
window.App = App;
