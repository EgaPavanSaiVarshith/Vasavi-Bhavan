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
        document.getElementById('closeImageModal').onclick = function() { document.getElementById('imageModal').classList.remove('show'); };
        document.getElementById('imageModal').onclick = function(e) { if(e.target === this) this.classList.remove('show'); };
        
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
        // Increase limit slightly since we'll compress them anyway
        if (file.size > 10 * 1024 * 1024) { App.toast('File ' + file.name + ' too large. Max 10MB.', 'error'); return; }
        
        var self = this;
        var reader = new FileReader();
        reader.onload = function (e) {
            // COMPRESS before adding to the list
            self._resizeImage(e.target.result, 1200, 1200, function(resized) {
                self.photosData.push(resized);
                self._renderUploadPreviews();
            });
        };
        reader.readAsDataURL(file);
    },

    // ===== MULTI-PHOTO RESIZING UTILITY =====
    _resizeImage: function(base64, maxWidth, maxHeight, callback) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var width = img.width;
            var height = img.height;
            // Calculate scale
            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }
            canvas.width = width; canvas.height = height;
            var ctx = canvas.getContext('2d');
            // Background to avoid transparency issues on JPG
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0,0,width,height);
            ctx.drawImage(img, 0, 0, width, height);
            // Export as slightly compressed JPEG
            callback(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.src = base64;
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

        var res = { success: false };
        if (this.editingId) {
            res = await App.DB.updateGallery(this.editingId, data);
            if (res.success) App.toast('Gallery event updated! ✅', 'success');
        } else {
            res = await App.DB.addGallery(data);
            if (res.success) App.toast('New event added to gallery! 🎉', 'success');
        }

        if (res.success) {
            this.hideForm();
            await this.render();
        } else {
            App.toast('Error saving gallery event: ' + res.error, 'error');
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
            var count = item._isLight ? '...' : (photos.length || 0);
            var cover = photos[0] || item.image;
            var label = item._isLight ? 'View Event' : ('View ' + count + ' ' + (count > 1 ? 'Photos' : 'Photo'));

            return '<div class="gal-card' + (item._isLight ? ' is-loading' : '') + '" data-id="' + item.id + '" data-photo-idx="0">' +
                '<div class="gal-img-box" onclick="App.Gallery.viewEvent(\'' + item.id + '\')">' +
                '<img class="gal-card-img" src="' + cover + '" alt="' + App.Utils.escapeHtml(item.title) + '" loading="lazy">' +
                '<div class="gal-overlay"><span>👁️ ' + label + '</span></div>' +
                (item._isLight ? '' : '<div class="gal-badge">' + count + ' 📷</div>') +
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
                // Use String() mapping to ensure ID match between numbers and strings
                var event = gallery.find(function(x) { return String(x.id) === String(id); });
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
        }, 5000); // Faster 5s interval for better UX
    },

    viewEvent: async function (id) {
        // Fetch full quality details from DB (metadata load doesn't include full 'images' array)
        var item = await App.DB.getGalleryFull(id);
        if (!item) {
            App.toast('Could not load memory details', 'error');
            return;
        }
        
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
            var res = await App.DB.deleteGallery(id);
            if (res.success) {
                App.toast('Removed from gallery', 'info');
                await this.render();
            } else {
                App.toast('Error removing memory: ' + res.error, 'error');
            }
        }
    }
};
window.App = App;
