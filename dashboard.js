/* ================================================================
   DASHBOARD MODULE v2 — With Pending Approvals Metric
   ================================================================ */
var App = window.App || {};
App.Dashboard = {
    render: async function () { 
        await this._metrics(); 
        await this._birthdays(); 
        await this._anniversaries(); 
        await this._upcoming(); 
        await this._recent(); 
    },

    _metrics: async function () {
        const approved = await App.DB.getApproved();
        const pending = await App.DB.getPending();
        const birthdays = await App.DB.getTodayBirthdays();
        const anniversaries = await App.DB.getTodayAnniversaries();

        this._count('metricTotal', approved.length);
        this._count('metricPending', pending.length);
        this._count('metricBirthdays', birthdays.length);
        this._count('metricAnniversaries', anniversaries.length);
    },

    _count: function (id, target) {
        var el = document.getElementById(id); if (!el) return;
        var cur = 0, step = Math.max(1, Math.ceil(target / 15));
        var iv = setInterval(function () { cur += step; if (cur >= target) { cur = target; clearInterval(iv); } el.textContent = cur; }, 40);
    },

    _birthdays: async function () {
        var c = document.getElementById('dashBirthdays'), b = await App.DB.getTodayBirthdays();
        if (!b.length) { c.innerHTML = '<p class="empty-state">No birthdays today 🎂</p>'; return; }
        c.innerHTML = b.map(function (m) { return '<div class="event-item"><div class="event-icon">🎂</div><div class="event-info"><div class="event-name">' + App.Utils.escapeHtml(m.memberName) + '</div><div class="event-detail">DOB: ' + App.Utils.formatDate(m.dob) + ' • 📱 ' + App.Utils.escapeHtml(m.mobileNumber) + '</div></div><span class="event-badge badge-today">🎉 Today!</span></div>'; }).join('');
    },

    _anniversaries: async function () {
        var c = document.getElementById('dashAnniversaries'), a = await App.DB.getTodayAnniversaries();
        if (!a.length) { c.innerHTML = '<p class="empty-state">No anniversaries today 💍</p>'; return; }
        c.innerHTML = a.map(function (m) { return '<div class="event-item"><div class="event-icon">💍</div><div class="event-info"><div class="event-name">' + App.Utils.escapeHtml(m.memberName) + '</div><div class="event-detail">' + App.Utils.formatDate(m.marriageDay) + ' • 📱 ' + App.Utils.escapeHtml(m.mobileNumber) + '</div></div><span class="event-badge badge-today">🎉 Today!</span></div>'; }).join('');
    },

    _upcoming: async function () {
        var c = document.getElementById('dashUpcoming'), ev = await App.DB.getUpcomingEvents(7);
        if (!ev.length) { c.innerHTML = '<p class="empty-state">No upcoming events 📅</p>'; return; }
        c.innerHTML = ev.map(function (e) {
            var i = e.type === 'birthday' ? '🎂' : '💍', l = e.type === 'birthday' ? 'Birthday' : 'Anniversary';
            var ds = e.type === 'birthday' ? e.member.dob : e.member.marriageDay;
            var bc = e.daysUntil === 0 ? 'badge-today' : 'badge-upcoming', bt = e.daysUntil === 0 ? '🎉 Today!' : e.daysUntil + 'd';
            return '<div class="event-item"><div class="event-icon">' + i + '</div><div class="event-info"><div class="event-name">' + App.Utils.escapeHtml(e.member.memberName) + '</div><div class="event-detail">' + l + ': ' + App.Utils.formatDate(ds) + '</div></div><span class="event-badge ' + bc + '">' + bt + '</span></div>';
        }).join('');
    },

    _recent: async function () {
        var c = document.getElementById('dashRecent'), r = await App.DB.getRecent(5);
        if (!r.length) { c.innerHTML = '<p class="empty-state">No members yet 🆕</p>'; return; }
        c.innerHTML = r.map(function (m) {
            var s = '<span class="status-badge status-' + m.status + '">' + m.status + '</span>';
            return '<div class="recent-item"><div><div class="recent-name">' + App.Utils.escapeHtml(m.memberName) + '</div><div class="recent-meta">' + App.Utils.escapeHtml(m.gothram) + ' • ' + App.Utils.escapeHtml(m.bloodGroup) + '</div></div><div style="text-align:right">' + s + '<div class="recent-meta">' + App.Utils.formatDate(m.createdAt) + '</div></div></div>';
        }).join('');
    }
};
window.App = App;
