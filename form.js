/* ================================================================
   FORM MODULE v2 — Registration Type, File Uploads, Payment
   ================================================================ */
const supabaseUrl = "https://kgdkogczvsmbbptiuzap.supabase.co"
const supabaseKey = "sb_publishable_ClfcDfNddcRaO0NA5hkXlw_GFCOJkOC"
let supabase = null;

var App = window.App || {};
App.Form = {
    supabase: null,
    editingId: null,
    regType: 'new',
    photoData: null,
    aadhaarData: null,
    paymentData: null,

    init: function () {
        var self = this;
        // Initialize Supabase safely
        try {
            if (window.supabase) {
                this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
            }
        } catch (e) {
            console.error('Supabase init error:', e);
        }

        // Type selection
        document.getElementById('typeNew').addEventListener('click', function () { self._showForm('new'); });
        document.getElementById('typeUpdate').addEventListener('click', function () { self._showUpdateSearch(); });
        document.getElementById('backFromSearch').addEventListener('click', function () { self._showStep1(); });
        document.getElementById('backFromForm').addEventListener('click', function () { self._showStep1(); });

        // Update search
        document.getElementById('searchMemberBtn').addEventListener('click', function () { self._searchMember(); });
        document.getElementById('searchMobile').addEventListener('keydown', function (e) { if (e.key === 'Enter') self._searchMember(); });
        document.getElementById('searchMobile').addEventListener('input', function () { this.value = this.value.replace(/[^0-9]/g, ''); });

        // Form
        document.getElementById('memberForm').addEventListener('submit', function (e) { e.preventDefault(); self.handleSubmit(); });
        document.getElementById('formReset').addEventListener('click', function () { self.resetForm(); });
        document.getElementById('mobileNumber').addEventListener('input', function () { this.value = this.value.replace(/[^0-9]/g, ''); });

        // File uploads
        this._setupUpload('photoZone', 'photoFile', 'photoPlaceholder', 'photoPreview', 'photoImg', 'photoFileName', 'removePhoto', 'photo');
        this._setupUpload('aadhaarZone', 'aadhaarFile', 'aadhaarPlaceholder', 'aadhaarPreview', 'aadhaarImg', 'aadhaarFileName', 'removeAadhaar', 'aadhaar');
        this._setupUpload('paymentZone', 'paymentFile', 'paymentPlaceholder', 'paymentPreview', 'paymentImg', 'paymentFileName', 'removePayment', 'payment');

        // Clear errors on input
        document.querySelectorAll('#memberForm input, #memberForm select, #memberForm textarea').forEach(function (el) {
            el.addEventListener('input', function () { var fg = this.closest('.form-group'); if (fg) fg.classList.remove('has-error'); });
        });
    },

    _showStep1: function () {
        document.getElementById('regStep1').style.display = 'block';
        document.getElementById('regStep2a').style.display = 'none';
        document.getElementById('regStep2b').style.display = 'none';
        this.resetForm();
    },

    _showUpdateSearch: function () {
        document.getElementById('regStep1').style.display = 'none';
        document.getElementById('regStep2a').style.display = 'block';
        document.getElementById('regStep2b').style.display = 'none';
        document.getElementById('searchMobile').value = '';
        var res = document.getElementById('searchResult');
        res.innerHTML = '<div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--c-border); text-align:center"><p style="font-size:0.88rem; color:var(--c-text-muted); margin-bottom:12px">Data not in the system yet?</p><button class="btn btn-outline" id="skipSearchBtn">Enter Details Directly</button></div>';
        document.getElementById('skipSearchBtn').addEventListener('click', function () { App.Form._showForm('update', null); });
        document.getElementById('searchMobile').focus();
    },

    _showForm: function (type, member) {
        this.regType = type;
        document.getElementById('regType').value = type;
        document.getElementById('regStep1').style.display = 'none';
        document.getElementById('regStep2a').style.display = 'none';
        document.getElementById('regStep2b').style.display = 'block';

        // Show/hide payment and disclaimer
        document.getElementById('paymentSection').style.display = type === 'new' ? 'block' : 'none';
        document.getElementById('disclaimerSection').style.display = type === 'new' ? 'block' : 'none';

        // Show committee fields ONLY for update/edit flows
        var comSec = document.getElementById('committeeUpdateSection');
        if (comSec) {
            comSec.style.display = (type === 'update' || type === 'edit') ? 'block' : 'none';
        }

        if (type === 'new') {
            document.getElementById('formTitle').textContent = 'New Member Registration';
            document.getElementById('formSubtitle').textContent = 'Fill in the details below to register as a new member';
            document.getElementById('submitBtnText').textContent = 'Submit Registration';
        } else if (type === 'update' && member) {
            this.editingId = member.id;
            document.getElementById('editMemberId').value = member.id;
            document.getElementById('formTitle').textContent = 'Update Member Details';
            document.getElementById('formSubtitle').textContent = 'Update details for ' + member.memberName;
            document.getElementById('submitBtnText').textContent = 'Update Details';
            this._fillForm(member);
        } else if (type === 'update' && !member) {
            this.resetForm();
            this.regType = 'update';
            document.getElementById('formTitle').textContent = 'Existing Member Details';
            document.getElementById('formSubtitle').textContent = 'Enter your details into the digital system';
            document.getElementById('submitBtnText').textContent = 'Save Details';
            document.getElementById('paymentSection').style.display = 'none';
            document.getElementById('disclaimerSection').style.display = 'none';
        } else if (type === 'edit' && member) {
            this.editingId = member.id;
            this.regType = 'edit';
            document.getElementById('editMemberId').value = member.id;
            document.getElementById('formTitle').textContent = 'Edit Member';
            document.getElementById('formSubtitle').textContent = 'Editing ' + member.memberName;
            document.getElementById('submitBtnText').textContent = 'Save Changes';
            document.getElementById('paymentSection').style.display = 'none';
            document.getElementById('disclaimerSection').style.display = 'none';
            this._fillForm(member);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _fillForm: function (m) {
        document.getElementById('memberName').value = m.memberName || '';
        document.getElementById('dob').value = m.dob || '';
        document.getElementById('fatherName').value = m.fatherName || '';
        document.getElementById('spouseName').value = m.spouseName || '';
        document.getElementById('gothram').value = m.gothram || '';
        document.getElementById('bloodGroup').value = m.bloodGroup || '';
        document.getElementById('marriageDay').value = m.marriageDay || '';
        document.getElementById('address').value = m.address || '';
        document.getElementById('mobileNumber').value = m.mobileNumber || '';
        var pp = document.getElementById('presentPost'); if (pp) pp.value = m.presentPost || '';
        var prevp = document.getElementById('previousPost'); if (prevp) prevp.value = m.previousPost || '';

        // Restore uploaded files if present
        if (m.photoFile) {
            this.photoData = m.photoFile;
            document.getElementById('photoPreview').style.display = 'block';
            document.getElementById('photoPlaceholder').style.display = 'none';
            document.getElementById('photoImg').src = m.photoFile;
            document.getElementById('photoFileName').textContent = 'Photo uploaded';
        }
        if (m.aadhaarFile) {
            this.aadhaarData = m.aadhaarFile;
            document.getElementById('aadhaarPreview').style.display = 'block';
            document.getElementById('aadhaarPlaceholder').style.display = 'none';
            document.getElementById('aadhaarImg').src = m.aadhaarFile;
            document.getElementById('aadhaarFileName').textContent = 'Aadhaar uploaded';
        }
    },

    _searchMember: function () {
        var mobile = document.getElementById('searchMobile').value.trim();
        var result = document.getElementById('searchResult');

        if (!mobile || mobile.length !== 10) {
            result.innerHTML = '<div class="search-not-found">⚠️ Please enter a valid 10-digit mobile number</div>';
            return;
        }

        var member = App.DB.findByMobile(mobile);
        if (member) {
            result.innerHTML = '<div class="search-found">✅ Member found: <strong>' + App.Utils.escapeHtml(member.memberName) + '</strong><br><small>Gothram: ' + App.Utils.escapeHtml(member.gothram) + ' • Status: ' + member.status + '</small><br><br><button class="btn btn-primary btn-sm" id="loadFoundMember">Load & Edit Details</button></div>';
            document.getElementById('loadFoundMember').addEventListener('click', function () {
                App.Form._showForm('update', member);
            });
        } else {
            result.innerHTML = '<div class="search-not-found">❌ No member found with mobile number ' + mobile + '</div><div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--c-border); text-align:center"><p style="font-size:0.88rem; color:var(--c-text-muted); margin-bottom:12px">Data not in the system yet?</p><button class="btn btn-outline" id="skipSearchBtn2">Enter Details Directly</button></div>';
            document.getElementById('skipSearchBtn2').addEventListener('click', function () { App.Form._showForm('update', null); });
        }
    },

    // ===== FILE UPLOAD SETUP =====
    _setupUpload: function (zoneId, inputId, placeholderId, previewId, imgId, nameId, removeId, dataKey) {
        var self = this;
        var zone = document.getElementById(zoneId);
        var input = document.getElementById(inputId);
        var placeholder = document.getElementById(placeholderId);
        var preview = document.getElementById(previewId);
        var img = document.getElementById(imgId);
        var nameEl = document.getElementById(nameId);
        var removeBtn = document.getElementById(removeId);

        // Click to upload
        zone.addEventListener('click', function (e) {
            if (e.target.closest('.remove-upload')) return;
            input.click();
        });

        // File selected
        input.addEventListener('change', function () { if (this.files[0]) self._processFile(this.files[0], dataKey, placeholder, preview, img, nameEl); });

        // Drag & drop
        zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
        zone.addEventListener('drop', function (e) {
            e.preventDefault(); zone.classList.remove('dragover');
            if (e.dataTransfer.files[0]) self._processFile(e.dataTransfer.files[0], dataKey, placeholder, preview, img, nameEl);
        });

        // Remove
        removeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self[dataKey + 'Data'] = null; input.value = '';
            preview.style.display = 'none'; placeholder.style.display = 'block';
        });
    },

    _processFile: function (file, dataKey, placeholder, preview, img, nameEl) {
        if (file.size > 2 * 1024 * 1024) { App.toast('File too large. Max 2 MB allowed.', 'error'); return; }
        var self = this;
        var reader = new FileReader();
        reader.onload = function (e) {
            self[dataKey + 'Data'] = e.target.result;
            if (file.type.startsWith('image/')) {
                img.src = e.target.result; img.style.display = 'block';
            } else {
                img.style.display = 'none';
            }
            nameEl.textContent = file.name;
            preview.style.display = 'block'; placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    },

    // ===== VALIDATE =====
    validate: function () {
        var valid = true;
        var rules = [
            { id: 'memberName', msg: 'Member name is required' }, { id: 'dob', msg: 'Date of birth is required' },
            { id: 'fatherName', msg: "Father's name is required" }, { id: 'gothram', msg: 'Gothram is required' },
            { id: 'bloodGroup', msg: 'Blood group is required' }, { id: 'address', msg: 'Address is required' },
            { id: 'mobileNumber', msg: 'Mobile number is required' }
        ];

        document.querySelectorAll('#memberForm .form-group').forEach(function (fg) { fg.classList.remove('has-error'); });

        rules.forEach(function (r) {
            var el = document.getElementById(r.id), fg = document.getElementById('fg-' + r.id);
            var err = fg ? fg.querySelector('.fg-error') : null;
            if (!el.value.trim()) { valid = false; if (fg) fg.classList.add('has-error'); if (err) err.textContent = r.msg; }
        });

        var mob = document.getElementById('mobileNumber').value.trim();
        if (mob && !/^[0-9]{10}$/.test(mob)) {
            valid = false; var fg = document.getElementById('fg-mobileNumber');
            if (fg) { fg.classList.add('has-error'); fg.querySelector('.fg-error').textContent = 'Enter valid 10-digit number'; }
        }

        var pZone = document.getElementById('photoZone');
        if (!this.photoData && !this.editingId) {
            valid = false;
            if (pZone) { pZone.style.borderColor = 'var(--c-error)'; pZone.style.boxShadow = '0 0 0 3px rgba(255,82,82,.12)'; }
        } else {
            if (pZone) { pZone.style.borderColor = ''; pZone.style.boxShadow = ''; }
        }

        // Terms checkbox (new registration only)
        if (this.regType === 'new') {
            var terms = document.getElementById('agreeTerms');
            var termsErr = document.getElementById('termsError');
            if (!terms.checked) { valid = false; termsErr.textContent = 'You must agree to the terms'; termsErr.style.opacity = '1'; }
            else { termsErr.textContent = ''; termsErr.style.opacity = '0'; }
        }

        return valid;
    },

    // ===== SUBMIT =====
    handleSubmit: async function () {
        if (!this.validate()) {
            var fe = document.querySelector('#memberForm .form-group.has-error');
            if (fe) fe.scrollIntoView({ behavior: 'smooth', block: 'center' });
            App.toast('Please fix the errors in the form', 'error');
            return;
        }

        var data = {
            memberName: document.getElementById('memberName').value.trim(),
            dob: document.getElementById('dob').value,
            fatherName: document.getElementById('fatherName').value.trim(),
            spouseName: document.getElementById('spouseName').value.trim(),
            gothram: document.getElementById('gothram').value.trim(),
            bloodGroup: document.getElementById('bloodGroup').value,
            marriageDay: document.getElementById('marriageDay').value,
            address: document.getElementById('address').value.trim(),
            mobileNumber: document.getElementById('mobileNumber').value.trim(),
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        if (this.regType === 'update' || this.regType === 'edit') {
            var pp = document.getElementById('presentPost'); if (pp) data.presentPost = pp.value.trim();
            var prevp = document.getElementById('previousPost'); if (prevp) data.previousPost = prevp.value.trim();
        }

        if (this.photoData) data.photoFile = this.photoData;
        if (this.aadhaarData) data.aadhaarFile = this.aadhaarData;
        if (this.paymentData) data.paymentProof = this.paymentData;

        // NEW: Supabase Insert
        if (!this.supabase) {
            App.toast('Supabase not initialized! Check connection.', 'error');
            return;
        }

        const { data: res, error } = await this.supabase
            .from('vasavi_members')
            .insert([data]);

        if (error) {
            console.error(error);
            App.toast('Error saving data ❌: ' + error.message, 'error');
        } else {
            App.toast('Saved successfully ✅', 'success');
            this.resetForm();
            this._showStep1();
            if (window.App && window.App.refreshAll) window.App.refreshAll();
        }
    },

    // ===== RESET =====
    resetForm: function () {
        document.getElementById('memberForm').reset();
        this.editingId = null; this.photoData = null; this.aadhaarData = null; this.paymentData = null;
        document.getElementById('editMemberId').value = '';
        var pp = document.getElementById('presentPost'); if (pp) pp.value = '';
        var prevp = document.getElementById('previousPost'); if (prevp) prevp.value = '';
        document.querySelectorAll('#memberForm .form-group').forEach(function (fg) { fg.classList.remove('has-error'); });
        var pz = document.getElementById('photoZone'); if (pz) { pz.style.borderColor = ''; pz.style.boxShadow = ''; }
        // Reset upload previews
        ['photo', 'aadhaar', 'payment'].forEach(function (k) {
            var ph = document.getElementById(k + 'Placeholder'); var pv = document.getElementById(k + 'Preview');
            if (ph) ph.style.display = 'block'; if (pv) pv.style.display = 'none';
        });
        document.getElementById('paymentSection').style.display = 'block';
        document.getElementById('disclaimerSection').style.display = 'block';
    },

    // ===== EDIT from Members List =====
    loadMember: function (id) {
        var m = App.DB.getById(id); if (!m) return;
        App.navigate('register');
        var self = this;
        setTimeout(function () { self._showForm('edit', m); }, 100);
    }
};
window.App = App;
