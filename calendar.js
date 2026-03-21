/* ================================================================
   CALENDAR MODULE v2 — Same logic, uses approved members only
   ================================================================ */
var App = window.App || {};
App.Calendar = {
    year: new Date().getFullYear(), month: new Date().getMonth(), selected: null,

    init: function () {
        var self = this;
        document.getElementById('prevMonth').addEventListener('click', function () { self.month--; if (self.month < 0) { self.month = 11; self.year--; } self.selected = null; self.render(); });
        document.getElementById('nextMonth').addEventListener('click', function () { self.month++; if (self.month > 11) { self.month = 0; self.year++; } self.selected = null; self.render(); });
        document.getElementById('calTodayBtn').addEventListener('click', function () { var n = new Date(); self.year = n.getFullYear(); self.month = n.getMonth(); self.selected = null; self.render(); });
    },

    render: async function () {
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('calTitle').textContent = months[this.month] + ' ' + this.year;
        await this._grid();
    },

    _grid: async function () {
        var g = document.getElementById('calGrid'), today = new Date(), y = this.year, mo = this.month;
        var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        var html = days.map(function (d) { return '<div class="cal-day-name">' + d + '</div>'; }).join('');
        var first = new Date(y, mo, 1).getDay(), dim = new Date(y, mo + 1, 0).getDate(), prevDim = new Date(y, mo, 0).getDate();
        var eMap = await this._eventMap(mo);

        for (var i = first - 1; i >= 0; i--) html += '<div class="cal-cell other-month"><span>' + (prevDim - i) + '</span></div>';

        for (var d = 1; d <= dim; d++) {
            var isToday = d === today.getDate() && mo === today.getMonth() && y === today.getFullYear();
            var isSel = this.selected && this.selected.day === d && this.selected.month === mo;
            var ev = eMap[d] || [];
            var cls = 'cal-cell' + (isToday ? ' today' : '') + (isSel ? ' selected' : '');
            var dots = '';
            if (ev.length) {
                var hb = ev.some(function (e) { return e.type === 'birthday'; }), ha = ev.some(function (e) { return e.type === 'anniversary'; });
                dots = '<div class="cal-dots">' + (hb ? '<span class="cal-dot dot-b"></span>' : '') + (ha ? '<span class="cal-dot dot-a"></span>' : '') + '</div>';
            }
            html += '<div class="' + cls + '" data-day="' + d + '"><span>' + d + '</span>' + dots + '</div>';
        }

        var total = first + dim, rem = (7 - total % 7) % 7;
        for (var j = 1; j <= rem; j++) html += '<div class="cal-cell other-month"><span>' + j + '</span></div>';

        g.innerHTML = html;
        var self = this;
        g.querySelectorAll('.cal-cell:not(.other-month)').forEach(function (c) {
            c.addEventListener('click', function () { self.selected = { day: parseInt(this.getAttribute('data-day')), month: mo }; self.render(); self._showEvents(self.selected.day, mo); });
        });
        if (this.selected && this.selected.month === mo) this._showEvents(this.selected.day, mo);
    },

    _eventMap: async function (mo) {
        var m = {}, members = await App.DB.getApproved();
        members.forEach(function (mb) {
            if (mb.dob) { var d = new Date(mb.dob); if (d.getMonth() === mo) { var k = d.getDate(); if (!m[k]) m[k] = []; m[k].push({ type: 'birthday', member: mb }); } }
            if (mb.marriageDay) { var d2 = new Date(mb.marriageDay); if (d2.getMonth() === mo) { var k2 = d2.getDate(); if (!m[k2]) m[k2] = []; m[k2].push({ type: 'anniversary', member: mb }); } }
        });
        return m;
    },

    _showEvents: async function (day, mo) {
        var panel = document.getElementById('calEvents'), title = document.getElementById('calEventsTitle'), list = document.getElementById('calEventsList');
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        title.textContent = 'Events on ' + day + ' ' + months[mo];
        var events = await App.DB.getEventsForDate(mo, day);
        if (!events.length) { list.innerHTML = '<p class="empty-state">No events on this day</p>'; }
        else {
            list.innerHTML = events.map(function (ev) {
                var icon = ev.type === 'birthday' ? '🎂' : '💍', label = ev.type === 'birthday' ? 'Birthday' : 'Marriage Anniversary';
                return '<div class="event-item"><div class="event-icon">' + icon + '</div><div class="event-info"><div class="event-name">' + App.Utils.escapeHtml(ev.member.name || ev.member.memberName) + '</div><div class="event-detail">' + label + ' • 📱 ' + App.Utils.escapeHtml(ev.member.phone || ev.member.mobileNumber) + '</div></div></div>';
            }).join('');
        }
        panel.classList.add('show');
    }
};
window.App = App;
