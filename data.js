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
        
        // If forceRefresh is true, skip cache and localStorage
        if (forceRefresh) {
            return await this._syncFromSupabase();
        }

        if (this._membersCache) return this._membersCache;

        // Try to load from LocalStorage first for an instant feel
        try { 
            var local = localStorage.getItem(this.key);
            if (local) {
                this._membersCache = JSON.parse(local);
                // Still sync in background to keep it fresh for next time
                this._syncFromSupabase(); 
                return this._membersCache;
            }
        } catch(e) {}

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
            presentPost: m.present_post || '',
            previousPost: m.previous_post || '',
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

    // ===== COMMITTEE DATABASE (Async) =====
    _comCache: null,
    getCommittee: async function (forceRefresh) {
        if (!supabaseClient) this.init();
        if (this._comCache && !forceRefresh) return this._comCache;

        // Instant feel from LocalStorage
        if (!this._comCache) {
            try {
                var local = localStorage.getItem(this.comKey);
                if (local) {
                    this._comCache = JSON.parse(local);
                    this._syncCommittee(); // Refresh in background
                    return this._comCache;
                }
            } catch(e) {}
        }
        return await this._syncCommittee();
    },

    _syncCommittee: async function() {
        if (!supabaseClient) this.init();
        const { data, error } = await supabaseClient.from(this.comKey).select('*').order('created_at', { ascending: false });
        if (error) { 
            console.error('Com fetch error:', error); 
            if (window.App && App.toast) App.toast('Committee error: ' + error.message, 'error');
            return this._comCache || []; 
        }
        this._comCache = data || [];
        try { localStorage.setItem(this.comKey, JSON.stringify(this._comCache)); } catch(e) {}
        
        // Re-render committee if visible
        if (window.App && App.Committee && App.currentView === 'committee') {
            App.Committee.render();
        }
        
        return this._comCache;
    },
    addCommittee: async function (member) {
        if (!supabaseClient) this.init();
        // Construct payload to match confirmed columns: phone, prev_role, updated_at, image, name, role
        var payload = {
            name: member.name,
            role: member.role,
            prev_role: member.prev_role,
            phone: member.phone || member.mobile,
            image: member.image,
            updated_at: new Date().toISOString()
        };
        const { error } = await supabaseClient.from(this.comKey).insert([payload]);
        if (error) { 
            console.error('Com insert error:', error); 
            return { success: false, error: 'Database error: ' + error.message }; 
        }
        this._comCache = null; 
        try { localStorage.removeItem(this.comKey); } catch(e) {}
        return { success: true };
    },
    updateCommittee: async function (id, data) {
        if (!supabaseClient) this.init();
        // Use confirmed column names
        var payload = {
            name: data.name,
            role: data.role,
            prev_role: data.prev_role,
            phone: data.phone || data.mobile,
            image: data.image,
            updated_at: new Date().toISOString()
        };
        const { error } = await supabaseClient.from(this.comKey).update(payload).eq('id', id);
        if (error) { 
            console.error('Com update error:', error); 
            return { success: false, error: 'Database error: ' + error.message }; 
        }
        this._comCache = null; 
        try { localStorage.removeItem(this.comKey); } catch(e) {}
        return { success: true };
    },
    deleteCommittee: async function (id) {
        if (!supabaseClient) this.init();
        const { error } = await supabaseClient.from(this.comKey).delete().eq('id', id);
        if (error) { console.error('Com delete error:', error); return { success: false, error: error.message }; }
        this._comCache = null; 
        try { localStorage.removeItem(this.comKey); } catch(e) {}
        return { success: true };
    },

    // ===== GALLERY DATABASE (Async) =====
    _galCache: null,
    getGallery: async function (forceRefresh) {
        if (!supabaseClient) this.init();
        if (this._galCache && !forceRefresh) return this._galCache;

        // Instant feel from LocalStorage
        if (!this._galCache) {
            try {
                var local = localStorage.getItem(this.galKey);
                if (local) {
                    this._galCache = JSON.parse(local);
                    this._syncGallery(); // Refresh in background
                    return this._galCache;
                }
            } catch(e) {}
        }
        return await this._syncGallery();
    },

    _syncGallery: async function() {
        if (!supabaseClient) this.init();
        
        // 1. Fetch LIGHTWEIGHT metadata first for instant feel
        // We exclude the heavy 'images' array which causes the 3-4s lag
        const { data: lightData, error: e1 } = await supabaseClient
            .from(this.galKey)
            .select('id, title, date, category, image, updated_at, created_at')
            .order('created_at', { ascending: false });

        if (e1) {
            console.error('Gal light fetch error:', e1);
            if (window.App && App.toast) App.toast('Gallery error: ' + e1.message, 'error');
            return this._galCache || [];
        }

        // Update cache with light data (showing count as "..." for now)
        this._galCache = (lightData || []).map(item => {
            // Keep existing full data if we have it in memory already, otherwise use light
            var existing = this._galCache ? this._galCache.find(x => x.id === item.id) : null;
            return existing && existing.images ? existing : Object.assign({ _isLight: true }, item);
        });

        // Trigger immediate render with light data
        if (window.App && App.Gallery && App.currentView === 'gallery') {
            App.Gallery.render();
        }

        // 2. Fetch FULL records in the background to populate slideshows/counts
        supabaseClient
            .from(this.galKey)
            .select('*')
            .order('created_at', { ascending: false })
            .then(({ data: fullData, error: e2 }) => {
                if (!e2 && fullData) {
                    this._galCache = fullData;
                    try { localStorage.setItem(this.galKey, JSON.stringify(this._galCache)); } catch(e) {}
                    
                    // Re-render again with full data (counts will update, slideshows will start)
                    if (window.App && App.Gallery && App.currentView === 'gallery') {
                        App.Gallery.render();
                    }
                }
            });

        return this._galCache;
    },

    getGalleryFull: async function (id) {
        if (!supabaseClient) this.init();
        
        // 1. Check if we already have full data in the memory cache
        if (this._galCache) {
            var cached = this._galCache.find(x => String(x.id) === String(id));
            // Only return from cache if it actually has the 'images' array populated
            if (cached && cached.images && cached.images.length > 0) return cached;
        }

        // 2. Otherwise fetch the specific row from Supabase
        const { data, error } = await supabaseClient
            .from(this.galKey)
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) {
            console.error('getGalleryFull error:', error);
            return null;
        }
        
        // 3. Update the memory cache with this fresh full record
        if (this._galCache) {
            var idx = this._galCache.findIndex(x => String(x.id) === String(id));
            if (idx !== -1) {
                this._galCache[idx] = data;
                // Optional: persist the whole cache back to localStorage
                try { localStorage.setItem(this.galKey, JSON.stringify(this._galCache)); } catch(e) {}
            } else {
                this._galCache.push(data);
            }
        }
        
        return data;
    },
    addGallery: async function (item) {
        if (!supabaseClient) this.init();
        item.created_at = new Date().toISOString();
        const { error } = await supabaseClient.from(this.galKey).insert([item]);
        if (error) { 
            console.error('Gal insert error:', error); 
            var msg = error.message;
            if (msg.includes('too large')) msg = "Images too large for database. Try fewer or smaller photos.";
            return { success: false, error: msg }; 
        }
        this._galCache = null; 
        try { localStorage.removeItem(this.galKey); } catch(e) {}
        return { success: true };
    },
    updateGallery: async function (id, data) {
        if (!supabaseClient) this.init();
        const { error } = await supabaseClient.from(this.galKey).update(data).eq('id', id);
        if (error) { console.error('Gal update error:', error); return { success: false, error: error.message }; }
        this._galCache = null; 
        try { localStorage.removeItem(this.galKey); } catch(e) {}
        return { success: true };
    },
    deleteGallery: async function (id) {
        if (!supabaseClient) this.init();
        const { error } = await supabaseClient.from(this.galKey).delete().eq('id', id);
        if (error) { console.error('Gal delete error:', error); return { success: false, error: error.message }; }
        this._galCache = null; return { success: true };
    },

    // Update member (Now Async)
    update: async function (id, data) {
        if (!supabaseClient) this.init();
        const { error } = await supabaseClient.from(this.key).update(data).eq('id', id);
        if (error) { console.error('Update error:', error); return false; }
        this._membersCache = null; // Clear cache on change
        try { localStorage.removeItem(this.key); } catch(e) {} // Clear storage too
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
