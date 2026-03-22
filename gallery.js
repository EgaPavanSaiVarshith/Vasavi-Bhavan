/* ================================================================
   GALLERY MODULE — Manage and showcase events (Multiple Images)
   ================================================================ */
var App = window.App || {};
App.Gallery = {
    photosData: [], // Array of base64 strings
    editingId: null,
    currentViewItems: [], // Images in current viewing session
    currentViewIdx: 0,
    slideshowInterval: null,

    init: function () {
        var self = this;
        document.getElementById('addGalleryBtn').addEventListener('click', function () { self.showForm(); });
        document.getElementById('cancelGalleryForm').addEventListener('click', function () { self.hideForm(); });
        document.getElementById('galleryForm').addEventListener('submit', function (e) { e.preventDefault(); self.handleSubmit(); });

        // Setup photo upload (Multi support)
        this._setupPhotoUpload();

        // Setup Modal Navigation
        document.getElementById('prevImg').onclick = function(e) { e.stopPropagation(); self.prev(); };
        document.getElementById('nextImg').onclick = function(e) { e.stopPropagation(); self.next(); };
        
        // Keyboard support for modal
        window.addEventListener('keydown', function(e) {
            if (document.getElementById('imageModal').classList.contains('show')) {
                if (e.key === 'ArrowLeft') self.prev();
                if (e.key === 'ArrowRight') self.next();
                if (e.key === 'Escape') document.getElementById('imageModal').classList.remove('show');
            }
        });
    },

    _setupPhotoUpload: function () {
        var self = this;
        var zone = document.getElementById('galPhotoZone');
        var input = document.getElementById('galPhotoFile');
        
        zone.onclick = function (e) { if (!e.target.closest('.preview-item-remove')) input.click(); };
        
        input.onchange = function () { 
            if (this.files.length) {
                Array.from(this.files).forEach(function(file) {
                    self._processFile(file);
                });
                this.value = ''; // Reset input to allow re-selecting same files
            }
        };

        // Drag & Drop
        zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
        zone.addEventListener('drop', function (e) {
            e.preventDefault(); zone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                Array.from(e.dataTransfer.files).forEach(function(file) {
                    self._processFile(file);
                });
            }
        });
    },

    _processFile: function (file) {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 2 * 1024 * 1024) { App.toast('File ' + file.name + ' too large. Max 2MB.', 'error'); return; }
        
        var self = this;
        var reader = new FileReader();
        reader.onload = function (e) {
            self.photosData.push(e.target.result);
            self._renderUploadPreviews();
        };
        reader.readAsDataURL(file);
    },

    _renderUploadPreviews: function () {
        var grid = document.getElementById('galPhotoPreviewGrid');
        var placeholder = document.getElementById('galPhotoPlaceholder');
        
        if (!this.photosData.length) {
            grid.style.display = 'none';
            placeholder.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        placeholder.style.display = 'none';
        
        var self = this;
        grid.innerHTML = this.photosData.map(function(src, idx) {
            return '<div class="preview-item" style="position:relative; width:100px; height:80px">' +
                '<img src="' + src + '" style="width:100%; height:100%; object-fit:cover; border-radius:4px; border:1px solid var(--c-border)">' +
                '<button type="button" class="preview-item-remove" onclick="App.Gallery._removePreview(' + idx + ')" style="position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; background:var(--c-error); border:none; color:white; font-size:10px; cursor:pointer">✕</button>' +
                '</div>';
        }).join('');
    },

    _removePreview: function (idx) {
        this.photosData.splice(idx, 1);
        this._renderUploadPreviews();
    },

    showForm: async function (id) {
        this.resetForm();
        var container = document.getElementById('galleryFormContainer');
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth' });

        if (id) {
            this.editingId = id;
            var items = await App.DB.getGallery();
            var item = items.find(function(x) { return x.id === id; });
            if (item) {
                document.getElementById('galId').value = item.id;
                document.getElementById('galTitle').value = item.title;
                document.getElementById('galDate').value = item.date;
                document.getElementById('galCategory').value = item.category || 'Celebration';
                
                // Map old single image to array if necessary, or load images array
                this.photosData = item.images || (item.image ? [item.image] : []);
                this._renderUploadPreviews();
                
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
        this.photosData = [];
        document.getElementById('galleryForm').reset();
        document.getElementById('galId').value = '';
        this._renderUploadPreviews();
        document.getElementById('saveGalBtn').textContent = 'Save to Gallery';
    },

    handleSubmit: async function () {
        var title = document.getElementById('galTitle').value.trim();
        var date = document.getElementById('galDate').value;
        var category = document.getElementById('galCategory').value;

        if (!title || !date || !this.photosData.length) {
            App.toast('All fields including at least one photo are required', 'error');
            return;
        }

        var data = { 
            title: title, 
            date: date, 
            category: category, 
            images: this.photosData,
            image: this.photosData[0], // Fallback for any legacy code
            updated_at: new Date().toISOString()
        };

        var success = false;
        if (this.editingId) {
            success = await App.DB.updateGallery(this.editingId, data);
            if (success) App.toast('Gallery event updated! ✅', 'success');
        } else {
            success = await App.DB.addGallery(data);
            if (success) App.toast('New event added to gallery! 🎉', 'success');
        }

        if (success) {
            this.hideForm();
            await this.render();
        } else {
            App.toast('Error saving to gallery. Please try again.', 'error');
        }
    },

    render: async function () {
        var container = document.getElementById('galleryContainer');
        var items = await App.DB.getGallery();

        if (!items.length) {
            container.innerHTML = '<div class="empty-state" style="grid-column:1/-1; padding:60px"><h3>No memories yet</h3><p>Showcase the events the committee has organized.</p></div>';
            return;
        }

        container.innerHTML = items.map(function (item) {
            var dateStr = App.Utils.formatDate(item.date);
            var photos = item.images || (item.image ? [item.image] : []);
            var count = photos.length;
            var cover = photos[0];

            return '<div class="gal-card" data-id="' + item.id + '" data-photo-idx="0">' +
                '<div class="gal-img-box" onclick="App.Gallery.viewEvent(\'' + item.id + '\')">' +
                '<img class="gal-card-img" src="' + cover + '" alt="' + App.Utils.escapeHtml(item.title) + '">' +
                '<div class="gal-overlay"><span>👁️ View ' + count + ' ' + (count > 1 ? 'Photos' : 'Photo') + '</span></div>' +
                '<div class="gal-badge">' + count + ' 📷</div>' +
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

        this._startSlideshow();
    },

    _startSlideshow: async function () {
        var self = this;
        if (this.slideshowInterval) clearInterval(this.slideshowInterval);
        
        var gallery = await App.DB.getGallery();
        this.slideshowInterval = setInterval(function () {
            var cards = document.querySelectorAll('.gal-card');
            
            cards.forEach(function (card) {
                var id = card.getAttribute('data-id');
                var event = gallery.find(function(x) { return x.id === id; });
                if (!event) return;
                
                var photos = event.images || (event.image ? [event.image] : []);
                if (photos.length <= 1) return;
                
                var currentIdx = parseInt(card.getAttribute('data-photo-idx'));
                var nextIdx = (currentIdx + 1) % photos.length;
                
                var img = card.querySelector('.gal-card-img');
                if (img) {
                    img.style.opacity = '0.4'; // Quick fade effect
                    setTimeout(function() {
                        img.src = photos[nextIdx];
                        img.style.opacity = '1';
                        card.setAttribute('data-photo-idx', nextIdx);
                    }, 500);
                }
            });
        }, 30000); // 30 seconds
    },

    viewEvent: async function (id) {
        var items = await App.DB.getGallery();
        var item = items.find(function(x) { return x.id === id; });
        if (!item) return;
        
        this.currentViewItems = item.images || (item.image ? [item.image] : []);
        this.currentViewIdx = 0;
        this.currentTitle = item.title;
        
        this._updateModal();
        document.getElementById('imageModal').classList.add('show');
    },

    _updateModal: function () {
        var img = document.getElementById('modalImage');
        var counter = document.getElementById('modalImgCounter');
        var title = document.getElementById('modalImgTitle');
        var prevBtn = document.getElementById('prevImg');
        var nextBtn = document.getElementById('nextImg');

        img.src = this.currentViewItems[this.currentViewIdx];
        counter.textContent = (this.currentViewIdx + 1) + ' / ' + this.currentViewItems.length;
        title.textContent = this.currentTitle;

        prevBtn.style.display = this.currentViewItems.length > 1 ? 'flex' : 'none';
        nextBtn.style.display = this.currentViewItems.length > 1 ? 'flex' : 'none';
    },

    prev: function () {
        if (this.currentViewItems.length <= 1) return;
        this.currentViewIdx = (this.currentViewIdx === 0) ? this.currentViewItems.length - 1 : this.currentViewIdx - 1;
        this._updateModal();
    },

    next: function () {
        if (this.currentViewItems.length <= 1) return;
        this.currentViewIdx = (this.currentViewIdx === this.currentViewItems.length - 1) ? 0 : this.currentViewIdx + 1;
        this._updateModal();
    },

    delete: async function (id) {
        if (confirm('Are you sure you want to remove this memory from the gallery?')) {
            await App.DB.deleteGallery(id);
            App.toast('Removed from gallery', 'info');
            await this.render();
        }
    }
};
window.App = App;
