const supabaseUrl = "https://kgdkogczvsmbbptiuzap.supabase.co"
const supabaseKey = "sb_publishable_ClfcDfNddcRaO0NA5hkXlw_GFCOJkOC"
let supabaseClient = null;

var App = window.App || {};
App.DB = {
    key: 'vasavi_members',
    comKey: 'vasavi_committee',
    galKey: 'vasavi_gallery',

    _membersCache: null,

    init: function() {
        if (window.supabase && !supabaseClient) {
            supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
            this.client = supabaseClient;
        }
    },

    // ===== MAIN MEMBERS DATABASE (Now Faster & Async) =====
    // ===== MAIN MEMBERS DATABASE (Instant Load Logic) =====
    getAll: async function (forceRefresh) { 
        if (!supabaseClient) this.init();
        if (this._membersCache && !forceRefresh) return this._membersCache;

        // Try to load from LocalStorage first for an instant feel
        if (!this._membersCache) {
            try { 
                var local = localStorage.getItem(this.key);
                if (local) {
                    this._membersCache = JSON.parse(local);
                    this._syncFromSupabase(); // Start live refresh in background
                    return this._membersCache;
                }
            } catch(e) {}
        }
        return await this._syncFromSupabase();
    },

    getByIdSync: function (id) { 
        if (!this._membersCache) return null;
        return this._membersCache.find(function (m) { return m.id == id; }) || null; 
    },

    _syncFromSupabase: async function() {
        if (!supabaseClient) this.init();
        const { data, error } = await supabaseClient.from(this.key).select('*');
        if (error) { console.error('Supabase fetch error:', error); return this._membersCache || []; }

        this._membersCache = (data || []).map(m => Object.assign({ 
            memberName: m.name || 'Unknown', 
            mobileNumber: m.phone || '0', 
            dob: m.dob || '',
            fatherName: m.father_name || '',
            spouseName: m.spouse_name || '',
            gothram: m.gothram || '',
            bloodGroup: m.blood_group || '',
            marriageDay: m.marriage_day || '',
            address: m.address || '',
            photoData: m.photo || '',
            aadhaarFile: m.aadhaar || '',
            paymentProof: m.payment_proof || '',
            createdAt: m.createdAt || m.created_at || new Date().toISOString()
        }, m));

        // Save fresh copy to LocalStorage for next time
        localStorage.setItem(this.key, JSON.stringify(this._membersCache));

        return this._membersCache;
    },
    getById: async function (id) { 
        const items = await this.getAll();
        return items.find(function (m) { return m.id == id; }) || null; 
    },

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

    // Update member (Now Async)
    update: async function (id, data) {
        if (!supabaseClient) this.init();
        const { error } = await supabaseClient.from(this.key).update(data).eq('id', id);
        if (error) { console.error('Update error:', error); return false; }
        this._membersCache = null; // Clear cache on change
        return true;
    },

    delete: async function (id) { 
        if (!supabaseClient) this.init();
        const { error } = await supabaseClient.from(this.key).delete().eq('id', id);
        if (error) { console.error('Delete error:', error); return false; }
        this._membersCache = null;
        return true;
    },

    approve: async function (id) { return await this.update(id, { status: 'approved' }); },
    reject: async function (id) { return await this.update(id, { status: 'rejected' }); },

    // ===== QUERIES =====
    search: async function (query, statusFilter) {
        query = (query || '').toLowerCase().trim();
        var members = await this.getAll();
        if (statusFilter && statusFilter !== 'all') members = members.filter(function (m) { return m.status === statusFilter; });
        if (!query) return members;
        return members.filter(function (m) {
            return (m.name || m.memberName || '').toLowerCase().includes(query) ||
                (m.fatherName || '').toLowerCase().includes(query) ||
                (m.spouseName || '').toLowerCase().includes(query) ||
                (m.gothram || '').toLowerCase().includes(query) ||
                (m.phone || m.mobileNumber || '').includes(query) ||
                (m.bloodGroup || '').toLowerCase().includes(query);
        });
    },

    findByMobile: async function (mobile) { 
        const items = await this.getAll();
        return items.find(function (m) { return m.phone === mobile || m.mobileNumber === mobile; }) || null; 
    },

    getByStatus: async function (status) { 
        const items = await this.getAll();
        return items.filter(function (m) { return m.status === status; }); 
    },
    getApproved: async function () { return this.getByStatus('approved'); },
    getPending: async function () { return this.getByStatus('pending'); },

    _isToday: function (ds) { 
        if (!ds) return false; 
        var n = new Date();
        var pts = ds.split('-'); if (pts.length < 3) return false;
        var y = parseInt(pts[0]), m = parseInt(pts[1]) - 1, d = parseInt(pts[2]);
        return d === n.getDate() && m === n.getMonth(); 
    },
    _daysUntilNext: function (ds) { 
        if (!ds) return 999; 
        var n = new Date(); n.setHours(0,0,0,0);
        var pts = ds.split('-'); if (pts.length < 3) return 999;
        var m = parseInt(pts[1]) - 1, d = parseInt(pts[2]);
        var nx = new Date(n.getFullYear(), m, d);
        if (nx < n) nx.setFullYear(n.getFullYear() + 1);
        return Math.round((nx - n) / 864e5);
    },

    getTodayBirthdays: async function () { 
        const approved = await this.getApproved();
        return approved.filter(m => this._isToday(m.dob)); 
    },
    getTodayAnniversaries: async function () { 
        const approved = await this.getApproved();
        return approved.filter(m => this._isToday(m.marriageDay)); 
    },

    getUpcomingEvents: async function (days) {
        days = days || 7; var s = this, ev = [];
        const approved = await this.getApproved();
        approved.forEach(function (m) {
            var bd = s._daysUntilNext(m.dob); if (bd <= days) ev.push({ type: 'birthday', member: m, daysUntil: bd });
            if (m.marriageDay) { var ad = s._daysUntilNext(m.marriageDay); if (ad <= days) ev.push({ type: 'anniversary', member: m, daysUntil: ad }); }
        });
        return ev.sort(function (a, b) { return a.daysUntil - b.daysUntil; });
    },

    getEventsForDate: async function (month, day) {
        var ev = [];
        const approved = await this.getApproved();
        approved.forEach(function (m) {
            if (m.dob) { var d = new Date(m.dob); if (d.getMonth() === month && d.getDate() === day) ev.push({ type: 'birthday', member: m }); }
            if (m.marriageDay) { var d2 = new Date(m.marriageDay); if (d2.getMonth() === month && d2.getDate() === day) ev.push({ type: 'anniversary', member: m }); }
        });
        return ev;
    },

    getRecent: async function (n) { 
        const items = await this.getAll();
        return items.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0, n || 5); 
    },
    _save: function (m) { }
};

App.Utils = {
    formatDate: function (s) { if (!s) return '—'; return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); },
    formatDateLong: function (s) { if (!s) return '—'; return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); },
    escapeHtml: function (s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; },
    daysUntilNext: function (s) { return App.DB._daysUntilNext(s); }
};
window.App = App;
