/* ================================================================
   DATA LAYER v2 — With Status, File Uploads, Approval Workflow
   ================================================================ */
var App = window.App || {};
App.DB = {
    key: 'vasavi_members',
    comKey: 'vasavi_committee',
    galKey: 'vasavi_gallery',

    // ===== MAIN MEMBERS DATABASE =====
    getAll: function () { try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch (e) { return []; } },
    getById: function (id) { return this.getAll().find(function (m) { return m.id === id; }) || null; },

    create: function (member) {
        var members = this.getAll();
        member.id = Date.now().toString() + Math.random().toString(36).substr(2, 4);
        member.createdAt = new Date().toISOString();
        member.updatedAt = member.createdAt;
        member.status = member.status || 'pending';
        members.push(member);
        this._save(members);
        return member;
    },

    // ===== COMMITTEE DATABASE =====
    getCommittee: function () {
        var data = localStorage.getItem(this.comKey);
        return data ? JSON.parse(data) : [];
    },
    saveCommittee: function (members) {
        localStorage.setItem(this.comKey, JSON.stringify(members));
    },
    addCommittee: function (member) {
        var c = this.getCommittee();
        member.id = 'COM-' + Date.now();
        c.unshift(member);
        this.saveCommittee(c);
        return member;
    },
    updateCommittee: function (id, data) {
        var c = this.getCommittee(), idx = c.findIndex(function(x) { return x.id === id; });
        if (idx !== -1) { c[idx] = Object.assign(c[idx], data); this.saveCommittee(c); }
    },
    deleteCommittee: function (id) {
        var c = this.getCommittee();
        this.saveCommittee(c.filter(function(x) { return x.id !== id; }));
    },

    // ===== GALLERY DATABASE =====
    getGallery: function () {
        var data = localStorage.getItem(this.galKey);
        return data ? JSON.parse(data) : [];
    },
    saveGallery: function (items) {
        localStorage.setItem(this.galKey, JSON.stringify(items));
    },
    addGallery: function (item) {
        var g = this.getGallery();
        item.id = 'GAL-' + Date.now();
        item.createdAt = new Date().toISOString();
        g.unshift(item);
        this.saveGallery(g);
        return item;
    },
    updateGallery: function (id, data) {
        var g = this.getGallery(), idx = g.findIndex(function(x) { return x.id === id; });
        if (idx !== -1) { g[idx] = Object.assign(g[idx], data); this.saveGallery(g); }
    },
    deleteGallery: function (id) {
        var g = this.getGallery();
        this.saveGallery(g.filter(function(x) { return x.id !== id; }));
    },

    update: function (id, data) {
        var members = this.getAll();
        var idx = members.findIndex(function (m) { return m.id === id; });
        if (idx === -1) return null;
        Object.keys(data).forEach(function (k) { members[idx][k] = data[k]; });
        members[idx].updatedAt = new Date().toISOString();
        this._save(members);
        return members[idx];
    },

    delete: function (id) { this._save(this.getAll().filter(function (m) { return m.id !== id; })); },

    approve: function (id) { return this.update(id, { status: 'approved' }); },
    reject: function (id) { return this.update(id, { status: 'rejected' }); },

    // ===== QUERIES =====
    search: function (query, statusFilter) {
        query = (query || '').toLowerCase().trim();
        var members = this.getAll();
        if (statusFilter && statusFilter !== 'all') members = members.filter(function (m) { return m.status === statusFilter; });
        if (!query) return members;
        return members.filter(function (m) {
            return (m.memberName || '').toLowerCase().includes(query) ||
                (m.fatherName || '').toLowerCase().includes(query) ||
                (m.spouseName || '').toLowerCase().includes(query) ||
                (m.gothram || '').toLowerCase().includes(query) ||
                (m.mobileNumber || '').includes(query) ||
                (m.bloodGroup || '').toLowerCase().includes(query);
        });
    },

    findByMobile: function (mobile) { return this.getAll().find(function (m) { return m.mobileNumber === mobile; }) || null; },

    getByStatus: function (status) { return this.getAll().filter(function (m) { return m.status === status; }); },
    getApproved: function () { return this.getByStatus('approved'); },
    getPending: function () { return this.getByStatus('pending'); },

    _isToday: function (ds) { if (!ds) return false; var d = new Date(ds), n = new Date(); return d.getDate() === n.getDate() && d.getMonth() === n.getMonth(); },
    _daysUntilNext: function (ds) { if (!ds) return 999; var t = new Date(); t.setHours(0, 0, 0, 0); var d = new Date(ds), nx = new Date(t.getFullYear(), d.getMonth(), d.getDate()); if (nx < t) nx.setFullYear(t.getFullYear() + 1); return Math.round((nx - t) / 864e5); },

    getTodayBirthdays: function () { var s = this; return this.getApproved().filter(function (m) { return s._isToday(m.dob); }); },
    getTodayAnniversaries: function () { var s = this; return this.getApproved().filter(function (m) { return s._isToday(m.marriageDay); }); },

    getUpcomingEvents: function (days) {
        days = days || 7; var s = this, ev = [];
        this.getApproved().forEach(function (m) {
            var bd = s._daysUntilNext(m.dob); if (bd <= days) ev.push({ type: 'birthday', member: m, daysUntil: bd });
            if (m.marriageDay) { var ad = s._daysUntilNext(m.marriageDay); if (ad <= days) ev.push({ type: 'anniversary', member: m, daysUntil: ad }); }
        });
        return ev.sort(function (a, b) { return a.daysUntil - b.daysUntil; });
    },

    getEventsForDate: function (month, day) {
        var ev = [];
        this.getApproved().forEach(function (m) {
            if (m.dob) { var d = new Date(m.dob); if (d.getMonth() === month && d.getDate() === day) ev.push({ type: 'birthday', member: m }); }
            if (m.marriageDay) { var d2 = new Date(m.marriageDay); if (d2.getMonth() === month && d2.getDate() === day) ev.push({ type: 'anniversary', member: m }); }
        });
        return ev;
    },

    getRecent: function (n) { return this.getAll().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0, n || 5); },
    _save: function (m) { localStorage.setItem(this.key, JSON.stringify(m)); }
};

App.Utils = {
    formatDate: function (s) { if (!s) return '—'; return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); },
    formatDateLong: function (s) { if (!s) return '—'; return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); },
    escapeHtml: function (s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; },
    daysUntilNext: function (s) { return App.DB._daysUntilNext(s); }
};
window.App = App;
