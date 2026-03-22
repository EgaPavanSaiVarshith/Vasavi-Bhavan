/* ================================================================
   COMMITTEE MEMBERS MODULE
   ================================================================ */
var App = window.App || {};
App.Committee = {
    comPhotoData: null,
    editingId: null,

    init: function() {
        var self = this;
        document.getElementById('showCommitteeFormBtn').addEventListener('click', function() {
            self._showForm();
        });
        document.getElementById('cancelCommitteeForm').addEventListener('click', function() {
            self._hideForm();
        });

        // Setup photo upload
        this._setupUpload('comPhotoZone', 'comPhotoFile', 'comPhotoPlaceholder', 'comPhotoPreview', 'comPhotoImg', 'removeComPhoto');

        document.getElementById('committeeForm').addEventListener('submit', function(e) {
            e.preventDefault();
            self._save();
        });
    },

    _setupUpload: function (zoneId, fileId, placeholderId, previewId, imgId, removeId) {
        var zone = document.getElementById(zoneId), file = document.getElementById(fileId), self = this;
        zone.addEventListener('click', function () { file.click(); });
        zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.style.borderColor = 'var(--c-primary)'; });
        zone.addEventListener('dragleave', function () { zone.style.borderColor = 'var(--c-border)'; });
        zone.addEventListener('drop', function (e) {
            e.preventDefault(); zone.style.borderColor = 'var(--c-border)';
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
        file.addEventListener('change', function (e) { if (e.target.files.length) handleFile(e.target.files[0]); });
        document.getElementById(removeId).addEventListener('click', function (e) {
            e.stopPropagation();
            file.value = '';
            self.comPhotoData = null;
            document.getElementById(previewId).style.display = 'none';
            document.getElementById(placeholderId).style.display = 'block';
        });

        function handleFile(f) {
            if (f.size > 2 * 1024 * 1024) { App.toast('File too large (Max 2MB)', 'error'); return; }
            var r = new FileReader();
            r.onload = function (e) {
                self.comPhotoData = e.target.result;
                document.getElementById(previewId).style.display = 'block';
                document.getElementById(placeholderId).style.display = 'none';
                document.getElementById(imgId).src = e.target.result;
            };
            r.readAsDataURL(f);
        }
    },

    _showForm: function(member) {
        document.getElementById('committeeFormContainer').style.display = 'block';
        document.getElementById('showCommitteeFormBtn').style.display = 'none';
        var form = document.getElementById('committeeForm');
        form.reset();
        this.comPhotoData = null;
        this.editingId = null;

        document.getElementById('comPhotoPreview').style.display = 'none';
        document.getElementById('comPhotoPlaceholder').style.display = 'block';

        if (member) {
            this.editingId = member.id;
            document.getElementById('comName').value = member.name || '';
            document.getElementById('comRole').value = member.role || '';
            document.getElementById('comPrevRole').value = member.prevRole || '';
            document.getElementById('comPhone').value = member.mobile || '';
            if (member.image) {
                this.comPhotoData = member.image;
                document.getElementById('comPhotoPreview').style.display = 'block';
                document.getElementById('comPhotoPlaceholder').style.display = 'none';
                document.getElementById('comPhotoImg').src = member.image;
            }
        }
        document.getElementById('comName').focus();
    },

    _hideForm: function() {
        document.getElementById('committeeFormContainer').style.display = 'none';
        document.getElementById('showCommitteeFormBtn').style.display = 'block';
    },

    _save: async function() {
        var name = document.getElementById('comName').value.trim();
        var role = document.getElementById('comRole').value;
        var prevRole = document.getElementById('comPrevRole').value.trim();
        var mobile = document.getElementById('comPhone').value.trim();

        if (!name || !role || !mobile || (!this.comPhotoData && !this.editingId)) {
            App.toast('Please fill all required fields and upload an image.', 'error');
            return;
        }

        var data = {
            name: name,
            role: role,
            prevRole: prevRole,
            mobile: mobile
        };
        if (this.comPhotoData) data.image = this.comPhotoData;

        var success = false;
        if (this.editingId) {
            success = await App.DB.updateCommittee(this.editingId, data);
            if (success) App.toast('Committee member updated!', 'success');
        } else {
            success = await App.DB.addCommittee(data);
            if (success) App.toast('Committee member added!', 'success');
        }
        
        if (success) {
            this._hideForm();
            await this.render();
        } else {
            App.toast('Error saving committee member.', 'error');
        }
    },

    deleteMember: async function(id) {
        if (confirm('Are you sure you want to remove this committee member?')) {
            await App.DB.deleteCommittee(id);
            App.toast('Member removed', 'success');
            await this.render();
        }
    },

    editMember: async function(id) {
        var items = await App.DB.getCommittee();
        var c = items.find(function(m) { return m.id === id; });
        if (c) this._showForm(c);
    },

    render: async function() {
        var c = document.getElementById('committeeContainer');
        var members = await App.DB.getCommittee();
        
        if (!members.length) {
            c.innerHTML = '<div class="empty-state" style="padding:60px; text-align:center"><div style="font-size:3rem;margin-bottom:16px">🏛️</div><p>No committee members defined yet.</p><p style="font-size:0.85rem;margin-top:8px">Click "Add Member" above to set up the board.</p></div>';
            return;
        }

        var order = {
            'President': 1,
            'Vice President': 2,
            'General Secretary': 3,
            'Administrative Secretary': 4,
            'Treasurer': 5,
            'Additional Treasurer': 6,
            'Joint Secretary': 7,
            'Executive Member': 8
        };

        members.sort(function(a, b) {
            return (order[a.role] || 99) - (order[b.role] || 99);
        });

        var html = '<div class="committee-grid">';
        
        members.forEach(function(m) {
            var imgHtml = m.image 
                ? '<img src="' + m.image + '" alt="' + App.Utils.escapeHtml(m.name) + '">' 
                : '<div class="com-img-placeholder">👤</div>';
                
            var prevText = m.prevRole ? '<div class="com-prev-role">Prev: ' + App.Utils.escapeHtml(m.prevRole) + '</div>' : '';

            html += '<div class="com-card">'
                 + '<div style="position:absolute;top:10px;right:10px;display:flex;gap:6px">'
                 + '<button class="act-btn" style="background:transparent;border:none;cursor:pointer;opacity:0.6;font-size:0.9rem" onclick="App.Committee.editMember(\'' + m.id + '\')" title="Edit">✏️</button>'
                 + '<button class="act-btn" style="background:transparent;border:none;cursor:pointer;opacity:0.6;font-size:0.9rem" onclick="App.Committee.deleteMember(\'' + m.id + '\')" title="Delete">🗑️</button>'
                 + '</div>'
                 + '<div class="com-img-box">' + imgHtml + '</div>'
                 + '<div class="com-info">'
                 + '<div class="com-role">' + App.Utils.escapeHtml(m.role) + '</div>'
                 + '<div class="com-name">' + App.Utils.escapeHtml(m.name) + '</div>'
                 + prevText
                 + '<div class="com-phone">📱 ' + App.Utils.escapeHtml(m.mobile) + '</div>'
                 + '</div></div>';
        });

        html += '</div>';
        c.innerHTML = html;
        this._hideForm(); // ensure form is hidden on render
    }
};
window.App = App;
