/* ================================================================
   GALLERY MODULE — Manage and showcase events
   ================================================================ */
var App = window.App || {};
App.Gallery = {
    photoData: null,
    editingId: null,

    init: function () {
        var self = this;
        document.getElementById('addGalleryBtn').addEventListener('click', function () { self.showForm(); });
        document.getElementById('cancelGalleryForm').addEventListener('click', function () { self.hideForm(); });
        document.getElementById('galleryForm').addEventListener('submit', function (e) { e.preventDefault(); self.handleSubmit(); });

        // Setup photo upload (using same technique as other modules)
        this._setupPhotoUpload();
    },

    _setupPhotoUpload: function () {
        var self = this;
        var zone = document.getElementById('galPhotoZone');
        var input = document.getElementById('galPhotoFile');
        var placeholder = document.getElementById('galPhotoPlaceholder');
        var preview = document.getElementById('galPhotoPreview');
        var img = document.getElementById('galPhotoImg');
        var removeBtn = document.getElementById('removeGalPhoto');

        zone.onclick = function (e) { if (!e.target.closest('.remove-upload')) input.click(); };
        input.onchange = function () { if (this.files[0]) self._processFile(this.files[0], img, preview, placeholder); };

        removeBtn.onclick = function (e) {
            e.stopPropagation();
            self.photoData = null;
            input.value = '';
            preview.style.display = 'none';
            placeholder.style.display = 'block';
        };
    },

    _processFile: function (file, img, preview, placeholder) {
        if (file.size > 2 * 1024 * 1024) { App.toast('File too large. Max 2MB.', 'error'); return; }
        var self = this;
        var reader = new FileReader();
        reader.onload = function (e) {
            self.photoData = e.target.result;
            img.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    },

    showForm: function (id) {
        this.resetForm();
        var container = document.getElementById('galleryFormContainer');
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth' });

        if (id) {
            this.editingId = id;
            var items = App.DB.getGallery();
            var item = items.find(function(x) { return x.id === id; });
            if (item) {
                document.getElementById('galId').value = item.id;
                document.getElementById('galTitle').value = item.title;
                document.getElementById('galDate').value = item.date;
                document.getElementById('galCategory').value = item.category || 'Celebration';
                if (item.image) {
                    this.photoData = item.image;
                    document.getElementById('galPhotoImg').src = item.image;
                    document.getElementById('galPhotoPreview').style.display = 'block';
                    document.getElementById('galPhotoPlaceholder').style.display = 'none';
                }
                document.getElementById('saveGalBtn').textContent = 'Update Event';
            }
        }
    },

    hideForm: function () {
        document.getElementById('galleryFormContainer').style.display = 'none';
        this.resetForm();
    },

    resetForm: function () {
        this.editingId = null;
        this.photoData = null;
        document.getElementById('galleryForm').reset();
        document.getElementById('galId').value = '';
        document.getElementById('galPhotoPreview').style.display = 'none';
        document.getElementById('galPhotoPlaceholder').style.display = 'block';
        document.getElementById('saveGalBtn').textContent = 'Save to Gallery';
    },

    handleSubmit: function () {
        var title = document.getElementById('galTitle').value.trim();
        var date = document.getElementById('galDate').value;
        var category = document.getElementById('galCategory').value;

        if (!title || !date || !this.photoData) {
            App.toast('All fields including a photo are required', 'error');
            return;
        }

        var data = { title: title, date: date, category: category, image: this.photoData };

        if (this.editingId) {
            App.DB.updateGallery(this.editingId, data);
            App.toast('Gallery item updated!', 'success');
        } else {
            App.DB.addGallery(data);
            App.toast('Added to gallery!', 'success');
        }

        this.hideForm();
        this.render();
    },

    render: function () {
        var container = document.getElementById('galleryContainer');
        var items = App.DB.getGallery();

        if (!items.length) {
            container.innerHTML = '<div class="empty-state" style="grid-column:1/-1; padding:60px"><h3>No memories yet</h3><p>Start by adding photos of your events.</p></div>';
            return;
        }

        container.innerHTML = items.map(function (item) {
            var dateStr = App.Utils.formatDate(item.date);
            return '<div class="gal-card">' +
                '<div class="gal-img-box" onclick="App.Gallery.view(\'' + item.id + '\')">' +
                '<img src="' + item.image + '" alt="' + App.Utils.escapeHtml(item.title) + '">' +
                '<div class="gal-overlay"><span>👁️ View</span></div>' +
                '</div>' +
                '<div class="gal-info">' +
                '<div class="gal-meta"><span class="gal-cat">' + item.category + '</span><span class="gal-date">' + dateStr + '</span></div>' +
                '<h3 class="gal-title">' + App.Utils.escapeHtml(item.title) + '</h3>' +
                '</div>' +
                '<div class="gal-actions">' +
                '<button onclick="App.Gallery.showForm(\'' + item.id + '\')" title="Edit">✏️</button>' +
                '<button onclick="App.Gallery.delete(\'' + item.id + '\')" title="Delete">🗑️</button>' +
                '</div>' +
                '</div>';
        }).join('');
    },

    view: function (id) {
        var items = App.DB.getGallery();
        var item = items.find(function(x) { return x.id === id; });
        if (!item) return;
        
        document.getElementById('modalImage').src = item.image;
        document.getElementById('imageModal').classList.add('show');
    },

    delete: function (id) {
        if (confirm('Are you sure you want to remove this memory from the gallery?')) {
            App.DB.deleteGallery(id);
            App.toast('Removed from gallery', 'info');
            this.render();
        }
    }
};
window.App = App;
