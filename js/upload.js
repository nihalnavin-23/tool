/**
 * Upload System Controller
 * Handles drag-and-drop, media processing, IndexedDB saving, and preview generation.
 */

class UploadController {
  constructor() {
    this.currentFile = null;
    this.currentFileDataUrl = null;
    this.currentMediaType = 'image';

    // Elements
    this.modal = document.getElementById('uploadModal');
    this.closeBtn = document.getElementById('uploadModalCloseBtn');
    this.dropzone = document.getElementById('uploadDropzone');
    this.fileInput = document.getElementById('mediaFileInput');
    this.previewContainer = document.getElementById('uploadPreviewContainer');
    this.previewMedia = document.getElementById('uploadPreviewMedia');
    this.removePreviewBtn = document.getElementById('removePreviewBtn');
    this.form = document.getElementById('uploadForm');
    this.categorySelect = document.getElementById('uploadCategory');
    this.titleInput = document.getElementById('uploadTitle');
    this.tagInput = document.getElementById('uploadTag');
    this.clientInput = document.getElementById('uploadClient');
    this.descInput = document.getElementById('uploadDesc');

    this.initEvents();
  }

  initEvents() {
    // Close modal triggers
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.close();
        }
      });
    }

    // Dropzone click triggers file picker
    if (this.dropzone && this.fileInput) {
      this.dropzone.addEventListener('click', () => {
        this.fileInput.click();
      });

      // Drag & Drop events
      ['dragenter', 'dragover'].forEach(eventName => {
        this.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.remove('drag-over');
        });
      });

      this.dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          this.handleFile(files[0]);
        }
      });

      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFile(e.target.files[0]);
        }
      });
    }

    // Remove preview button
    if (this.removePreviewBtn) {
      this.removePreviewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetFile();
      });
    }

    // Discard / Delete upload button in form actions
    this.discardBtn = document.getElementById('uploadDiscardBtn');
    if (this.discardBtn) {
      this.discardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.resetFile();
        window.showToast('🗑️ Selected media was removed.', '🗑️');
      });
    }

    // Form submit
    if (this.form) {
      this.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSubmit();
      });
    }
  }

  open(preselectedCategory = null) {
    if (preselectedCategory && this.categorySelect) {
      this.categorySelect.value = preselectedCategory;
    }
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    this.resetForm();
  }

  handleFile(file) {
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      window.showToast('Please upload a valid image (PNG/JPG) or video (MP4/WEBM)', '⚠️');
      return;
    }

    this.currentFile = file;
    this.currentMediaType = isVideo ? 'video' : 'image';

    // If video file is selected and user hasn't explicitly set a category, guide to 'ai-videos'
    if (isVideo && this.categorySelect && this.categorySelect.value === 'social-media') {
      this.categorySelect.value = 'ai-videos';
    }

    // Auto-fill title from filename if empty
    if (this.titleInput && !this.titleInput.value) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      this.titleInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }

    // Read file data
    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentFileDataUrl = e.target.result;
      this.showPreview(e.target.result, isVideo, file.name);
    };
    reader.readAsDataURL(file);
  }

  showPreview(src, isVideo, filename = '') {
    this.previewContainer.innerHTML = '';
    
    // Top banner with badge and Delete / Remove Video button
    const topBar = document.createElement('div');
    topBar.className = 'preview-top-bar';
    topBar.innerHTML = `
      <span class="preview-type-badge">
        <i class="fas ${isVideo ? 'fa-video' : 'fa-image'}"></i>
        ${isVideo ? 'Video Selected' : 'Image Selected'}: ${filename || (isVideo ? 'video.mp4' : 'media.jpg')}
      </span>
      <button type="button" class="preview-delete-btn" id="previewDeleteBtn" title="Delete / Discard this file">
        <i class="fas fa-trash-can"></i> ${isVideo ? 'Delete Video' : 'Delete File'}
      </button>
    `;
    this.previewContainer.appendChild(topBar);

    if (isVideo) {
      const video = document.createElement('video');
      video.className = 'upload-preview-media';
      video.src = src;
      video.controls = true;
      video.autoplay = false;
      this.previewContainer.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.className = 'upload-preview-media';
      img.src = src;
      this.previewContainer.appendChild(img);
    }

    // Bind delete button
    const delBtn = topBar.querySelector('#previewDeleteBtn');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.resetFile();
        window.showToast('🗑️ Selected ' + (isVideo ? 'video' : 'file') + ' was deleted.', '🗑️');
      });
    }

    this.previewContainer.classList.add('has-preview');
    this.dropzone.style.display = 'none';

    // Show discard button in form actions
    if (this.discardBtn) {
      this.discardBtn.style.display = 'inline-flex';
      this.discardBtn.innerHTML = `<i class="fas fa-trash-can"></i> ${isVideo ? 'Discard Video' : 'Discard File'}`;
    }
  }

  resetFile() {
    this.currentFile = null;
    this.currentFileDataUrl = null;
    if (this.fileInput) this.fileInput.value = '';
    this.previewContainer.innerHTML = '';
    this.previewContainer.classList.remove('has-preview');
    this.dropzone.style.display = 'block';

    if (this.discardBtn) {
      this.discardBtn.style.display = 'none';
    }
  }

  resetForm() {
    this.resetFile();
    if (this.form) this.form.reset();
  }

  async handleSubmit() {
    if (!this.currentFileDataUrl) {
      window.showToast('Please select an image or video to upload!', '⚠️');
      return;
    }

    const category = this.categorySelect.value;
    const title = this.titleInput.value.trim() || 'Untitled Artwork';
    const tag = this.tagInput.value.trim() || (category === 'ai-videos' ? 'Motion Art' : 'Creative Design');
    const client = this.clientInput.value.trim() || 'Original Work';
    const description = this.descInput.value.trim() || 'Exclusively crafted artwork showcased in portfolio.';

    const newItem = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      category: category,
      title: title,
      client: client,
      tag: tag,
      description: description,
      mediaType: this.currentMediaType,
      mediaUrl: this.currentFileDataUrl,
      thumbnailUrl: this.currentFileDataUrl,
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      isCustom: true,
      timestamp: Date.now()
    };

    try {
      await window.portfolioStorage.addItem(newItem);
      window.showToast('✨ Published successfully to ' + category.replace('-', ' ') + '!', '🎉');
      this.close();

      // Switch to this category tab and render
      if (window.switchTab) {
        window.switchTab(category);
      }
      if (window.renderActiveGallery) {
        window.renderActiveGallery();
      }
    } catch (err) {
      console.error('Failed to save artwork:', err);
      window.showToast('Failed to save media: ' + err.message, '❌');
    }
  }
}

// Global initialization
window.uploader = new UploadController();
