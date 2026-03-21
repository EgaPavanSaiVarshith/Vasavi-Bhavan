/* ================================================================
   MEMBER REGISTRATION FORM MODULE v2 — Multi-step, Supabase, Validation
   ================================================================ */
var App = window.App || {};
App.Form = {
    editingId: null,
    regType: 'new',
    photoData: null,
    aadhaarData: null,
    paymentData: null,

    init: function () {
        var self = this;
        // The Supabase client is now centrally managed in data.js (App.DB)
        this.supabaseClient = App.DB.client;

        // Type selection
        document.getElementById('typeNew').addEventListener('click', function () { self._showForm('new'); });
        document.getElementById('typeUpdate').addEventListener('click', function () { self._showForm('update'); });
        
        // Search
        document.getElementById('searchBtn').addEventListener('click', function () { self._searchMember(); });
        document.getElementById('skipSearchBtn').addEventListener('click', function () { self._showForm('update', null); });

        // Navigation
        document.getElementById('nextStep1').addEventListener('click', function () { if (self.validate()) self._showStep2(); });
        document.getElementById('prevStep2').addEventListener('click', function () { self._showStep1(); });

        // Setup uploads
        this._setupUpload('photoZone', 'photoFile', 'photoPlaceholder', 'photoPreview', 'photoImg', 'photoFileName', 'removePhoto', 'photo');
        this._setupUpload('aadhaarZone', 'aadhaarFile', 'aadhaarPlaceholder', 'aadhaarPreview', 'aadhaarImg', 'aadhaarFileName', 'removeAadhaar', 'aadhaar');
        this._setupUpload('paymentZone', 'paymentFile', 'paymentPlaceholder', 'paymentPreview', 'paymentImg', 'paymentFileName', 'removePayment', 'payment');

        // Form submit
        document.getElementById('memberForm').addEventListener('submit', function (e) {
            e.preventDefault();
            self.handleSubmit();
        });
    },

    _showForm: function (type, member) {
        this.regType = type;
        this.resetForm();
        document.getElementById('selectionScreen').style.display = 'none';
        document.getElementById('searchScreen').style.display = type === 'update' && !member ? 'block' : 'none';
        document.getElementById('formScreen').style.display = type === 'new' || member ? 'block' : 'none';
        
        if (type === 'new') {
            document.getElementById('formTitle').textContent = 'New Member Registration';
            document.getElementById('formSubtitle').textContent = 'Complete the form below to apply for membership';
            document.getElementById('submitBtnText').textContent = 'Submit Application';
            document.getElementById('committeeUpdateSection').style.display = 'none';
        } else if (member) {
            document.getElementById('formTitle').textContent = 'Update Membership';
            document.getElementById('formSubtitle').textContent = 'Editing ' + (member.name || member.memberName);
            document.getElementById('submitBtnText').textContent = 'Save Changes';
            document.getElementById('paymentSection').style.display = 'none';
            document.getElementById('disclaimerSection').style.display = 'none';
            this._fillForm(member);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _showStep1: function () {
        document.getElementById('step1').style.display = 'block';
        document.getElementById('step2').style.display = 'none';
        document.getElementById('indicator1').classList.add('active');
        document.getElementById('indicator2').classList.remove('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _showStep2: function () {
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
        document.getElementById('indicator1').classList.add('active');
        document.getElementById('indicator2').classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _fillForm: function (m) {
        this.editingId = m.id;
        document.getElementById('memberName').value = m.name || m.memberName || '';
        document.getElementById('dob').value = m.dob || '';
        document.getElementById('fatherName').value = m.father_name || m.fatherName || '';
        document.getElementById('spouseName').value = m.spouse_name || m.spouseName || '';
        document.getElementById('gothram').value = m.gothram || '';
        document.getElementById('bloodGroup').value = m.blood_group || m.bloodGroup || '';
        document.getElementById('marriageDay').value = m.marriage_day || m.marriageDay || '';
        document.getElementById('address').value = m.address || '';
        document.getElementById('mobileNumber').value = m.phone || m.mobileNumber || '';
        
        var pp = document.getElementById('presentPost'); if (pp) pp.value = m.presentPost || '';
        var prevp = document.getElementById('previousPost'); if (prevp) prevp.value = m.previousPost || '';

        // Restore uploads
        if (m.photo || m.photoData || m.photoFile) {
            this.photoData = m.photo || m.photoData || m.photoFile;
            this._showPreview('photo', this.photoData);
        }
        if (m.aadhaar || m.aadhaarFile) {
            this.aadhaarData = m.aadhaar || m.aadhaarFile;
            this._showPreview('aadhaar', this.aadhaarData);
        }
        if (m.payment_proof || m.paymentProof) {
            this.paymentData = m.payment_proof || m.paymentProof;
            this._showPreview('payment', this.paymentData);
        }
    },

    _showPreview: function(key, data) {
        var pv = document.getElementById(key + 'Preview'), ph = document.getElementById(key + 'Placeholder'), img = document.getElementById(key + 'Img');
        if (pv) pv.style.display = 'block'; if (ph) ph.style.display = 'none'; if (img) img.src = data;
    },

    _searchMember: async function () {
        var mobile = document.getElementById('searchMobile').value.trim();
        var result = document.getElementById('searchResult');
        if (!mobile || mobile.length !== 10) {
            result.innerHTML = '<div class="search-not-found">⚠️ Please enter a 10-digit mobile number</div>';
            return;
        }
        var member = await App.DB.findByMobile(mobile);
        if (member) {
            result.innerHTML = '<div class="search-found">✅ Member found: <strong>' + App.Utils.escapeHtml(member.memberName) + '</strong><br><small>Gothram: ' + App.Utils.escapeHtml(member.gothram) + '</small><br><br><button class="btn btn-primary btn-sm" id="loadFoundMember">Load Details</button></div>';
            document.getElementById('loadFoundMember').addEventListener('click', () => this._showForm('update', member));
        } else {
            result.innerHTML = '<div class="search-not-found">❌ No member found with mobile ' + mobile + '</div><br><button class="btn btn-outline btn-sm" onclick="App.Form._showForm(\'update\', null)">Enter Details Directly</button>';
        }
    },

    _setupUpload: function (zoneId, inputId, placeholderId, previewId, imgId, nameId, removeId, dataKey) {
        var self = this, zone = document.getElementById(zoneId), input = document.getElementById(inputId);
        var ph = document.getElementById(placeholderId), pv = document.getElementById(previewId), img = document.getElementById(imgId), nameEl = document.getElementById(nameId), rm = document.getElementById(removeId);

        zone.onclick = (e) => { if (!e.target.closest('.remove-upload')) input.click(); };
        input.onchange = () => { if (input.files[0]) this._processFile(input.files[0], dataKey, ph, pv, img, nameEl); };
        rm.onclick = (e) => { e.stopPropagation(); this[dataKey+'Data'] = null; input.value = ''; pv.style.display = 'none'; ph.style.display = 'block'; };
    },

    _processFile: function (file, dataKey, ph, pv, img, nameEl) {
        if (file.size > 2 * 1024 * 1024) { App.toast('File too large (Max 2MB)', 'error'); return; }
        var reader = new FileReader();
        reader.onload = (e) => {
            this[dataKey + 'Data'] = e.target.result;
            img.src = e.target.result; nameEl.textContent = 'File selected';
            pv.style.display = 'block'; ph.style.display = 'none';
        };
        reader.readAsDataURL(file);
    },

    validate: function () {
        var rules = [
            { id: 'memberName', msg: 'Name is required' }, { id: 'dob', msg: 'DOB is required' },
            { id: 'fatherName', msg: 'Father name is required' }, { id: 'gothram', msg: 'Gothram is required' },
            { id: 'bloodGroup', msg: 'Blood group is required' }, { id: 'address', msg: 'Address is required' },
            { id: 'mobileNumber', msg: 'Mobile number is required' }
        ];
        var valid = true;
        document.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('has-error'));
        rules.forEach(r => {
            var el = document.getElementById(r.id);
            if (!el.value.trim()) {
                var fg = document.getElementById('fg-' + r.id); if (fg) fg.classList.add('has-error');
                valid = false;
            }
        });
        if (!this.photoData) { App.toast('Photo is required', 'error'); valid = false; }
        return valid;
    },

    handleSubmit: async function () {
        var data = {
            name: document.getElementById('memberName').value.trim(),
            phone: document.getElementById('mobileNumber').value.trim(),
            dob: document.getElementById('dob').value,
            father_name: document.getElementById('fatherName').value.trim(),
            spouse_name: document.getElementById('spouseName').value.trim(),
            gothram: document.getElementById('gothram').value.trim(),
            blood_group: document.getElementById('bloodGroup').value,
            marriage_day: document.getElementById('marriageDay').value || null,
            address: document.getElementById('address').value.trim(),
            photo: this.photoData,
            aadhaar: this.aadhaarData,
            payment_proof: this.paymentData,
            status: this.editingId ? undefined : 'pending' // Preserve status on update
        };

        if (this.editingId) {
            var { error } = await App.DB.client.from('vasavi_members').update(data).eq('id', this.editingId);
            if (error) App.toast('Error updating: ' + error.message, 'error');
            else { App.toast('Updated successfully! ✅', 'success'); this._exit(); }
        } else {
            var { error } = await App.DB.client.from('vasavi_members').insert([data]);
            if (error) App.toast('Error saving: ' + error.message, 'error');
            else { App.toast('Registered successfully! ✅', 'success'); this._exit(); }
        }
    },

    _exit: function() {
        this.resetForm();
        window.location.hash = 'dashboard';
        App.navigate('dashboard');
        App.refreshAll();
    },

    resetForm: function () {
        document.getElementById('memberForm').reset();
        this.editingId = null; this.photoData = null; this.aadhaarData = null; this.paymentData = null;
        document.querySelectorAll('.upload-preview').forEach(p => p.style.display = 'none');
        document.querySelectorAll('.upload-placeholder').forEach(p => p.style.display = 'block');
        this._showStep1();
    },

    loadMember: async function (id) {
        var m = await App.DB.getById(id);
        if (m) this._showForm('update', m);
    }
};
