// CodeWithAnup - Admin Dashboard Controller & Authentication Engine
let siteData = null;
let currentTab = 'hero-media';

function showAdminToast(msg, type = 'success') {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `admin-toast ${type === 'error' ? 'border-red-500 bg-red-950 text-white' : ''}`;
  toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '✅'}</span> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Convert File to Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Upload file to Backend
async function uploadImageToServer(file) {
  const base64Data = await fileToBase64(file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      dataUrl: base64Data
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
}

class AdminApp {
  constructor() {
    this.init();
  }

  async init() {
    this.setupAuth();
    this.setupTabs();
    this.setupImageUploads();
    this.setupSecurityTab();
    
    // Check if user is already authenticated
    const token = localStorage.getItem('cwa_admin_token');
    if (token) {
      this.showDashboard();
      await this.loadData();
      this.loadMessages();
    } else {
      this.showLogin();
    }
  }

  setupAuth() {
    const loginForm = document.getElementById('admin-login-form');
    const togglePassBtn = document.getElementById('toggle-password-btn');
    const passInput = document.getElementById('login-password');
    const errorAlert = document.getElementById('login-error-alert');
    const errorText = document.getElementById('login-error-text');

    if (togglePassBtn && passInput) {
      togglePassBtn.addEventListener('click', () => {
        if (passInput.type === 'password') {
          passInput.type = 'text';
          togglePassBtn.textContent = '🙈';
        } else {
          passInput.type = 'password';
          togglePassBtn.textContent = '👁️';
        }
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('login-submit-btn');

        if (errorAlert) errorAlert.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Signing in...';

        try {
          const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            localStorage.setItem('cwa_admin_token', data.token);
            localStorage.setItem('cwa_admin_user', data.username);
            this.showDashboard();
            await this.loadData();
            this.loadMessages();
            showAdminToast(`Welcome back, ${data.username}!`);
          } else {
            if (errorAlert && errorText) {
              errorText.textContent = data.error || 'Invalid username or password';
              errorAlert.classList.remove('hidden');
            }
          }
        } catch (err) {
          if (errorAlert && errorText) {
            errorText.textContent = 'Failed to connect to authentication server';
            errorAlert.classList.remove('hidden');
          }
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>Sign In to Dashboard</span> <span>→</span>';
        }
      });
    }
  }

  showLogin() {
    const loginBox = document.getElementById('login-container');
    const dashboardBox = document.getElementById('dashboard-container');
    if (loginBox) loginBox.classList.remove('hidden');
    if (dashboardBox) dashboardBox.classList.add('hidden');
  }

  showDashboard() {
    const loginBox = document.getElementById('login-container');
    const dashboardBox = document.getElementById('dashboard-container');
    if (loginBox) loginBox.classList.add('hidden');
    if (dashboardBox) dashboardBox.classList.remove('hidden');
  }

  logout() {
    localStorage.removeItem('cwa_admin_token');
    localStorage.removeItem('cwa_admin_user');
    this.showLogin();
    showAdminToast('Signed out successfully.');
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.sidebar-link[data-tab]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        this.switchTab(target);
      });
    });
  }

  switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(section => {
      section.classList.add('hidden');
    });
    const activeSection = document.getElementById(`tab-${tabId}`);
    if (activeSection) {
      activeSection.classList.remove('hidden');
    }
  }

  async loadData() {
    try {
      const res = await fetch('/api/site-data');
      if (!res.ok) throw new Error('API load error');
      siteData = await res.json();
      this.populateAllForms();
      this.updateSummaryCounts();
    } catch (err) {
      showAdminToast('Failed to load site data', 'error');
    }
  }

  updateSummaryCounts() {
    if (!siteData) return;
    const pCount = document.getElementById('count-projects');
    const nCount = document.getElementById('count-notes');
    const bCount = document.getElementById('count-blogs');

    if (pCount) pCount.textContent = (siteData.projects || []).length;
    if (nCount) nCount.textContent = (siteData.notes || []).length;
    if (bCount) bCount.textContent = (siteData.blogs || []).length;
  }

  populateAllForms() {
    if (!siteData) return;
    this.populateHeroMedia();
    this.renderProjectsList();
    this.renderNotesList();
    this.renderBlogsList();
    this.populateStatsSkills();
    this.populateSocialLinks();
  }

  populateHeroMedia() {
    const p = siteData.profile || {};
    const bg = siteData.background || {};

    // Profile inputs
    const nameInput = document.getElementById('input-name');
    const brandInput = document.getElementById('input-brand');
    const titleInput = document.getElementById('input-title');
    const taglineInput = document.getElementById('input-tagline');
    const phrasesInput = document.getElementById('input-phrases');
    const bioInput = document.getElementById('input-bio');

    if (nameInput) nameInput.value = p.name || '';
    if (brandInput) brandInput.value = p.brandName || '';
    if (titleInput) titleInput.value = p.title || '';
    if (taglineInput) taglineInput.value = p.tagline || '';
    if (phrasesInput) phrasesInput.value = (p.typingPhrases || []).join(', ');
    if (bioInput) bioInput.value = p.bio || '';

    // Full Background inputs
    const bgImgInput = document.getElementById('input-bg-image');
    const bgImgPreview = document.getElementById('preview-bg-image');
    const bgTypeInput = document.getElementById('input-bg-type');
    const bgOpacityInput = document.getElementById('input-bg-opacity');
    const bgOpacityVal = document.getElementById('val-bg-opacity');
    const bgBlurInput = document.getElementById('input-bg-blur');
    const bgBlurVal = document.getElementById('val-bg-blur');
    const photoAnimInput = document.getElementById('input-photo-anim');

    if (bgImgInput) bgImgInput.value = bg.customImage || '';
    if (bgImgPreview && bg.customImage) bgImgPreview.style.backgroundImage = `url("${bg.customImage}")`;
    if (bgTypeInput) bgTypeInput.value = bg.type || 'particles';
    if (bgOpacityInput) {
      bgOpacityInput.value = bg.overlayOpacity !== undefined ? bg.overlayOpacity : 0.75;
      if (bgOpacityVal) bgOpacityVal.textContent = bgOpacityInput.value;
    }
    if (bgBlurInput) {
      bgBlurInput.value = bg.blur !== undefined ? bg.blur : 0;
      if (bgBlurVal) bgBlurVal.textContent = bgBlurInput.value + 'px';
    }
    if (photoAnimInput) photoAnimInput.value = bg.photoAnimation || 'scroll-parallax-zoom';

    // Live preview listeners
    if (bgImgInput) {
      bgImgInput.addEventListener('input', () => {
        if (bgImgPreview) bgImgPreview.style.backgroundImage = `url("${bgImgInput.value}")`;
      });
    }
    if (bgOpacityInput && bgOpacityVal) {
      bgOpacityInput.addEventListener('input', () => {
        bgOpacityVal.textContent = bgOpacityInput.value;
      });
    }
    if (bgBlurInput && bgBlurVal) {
      bgBlurInput.addEventListener('input', () => {
        bgBlurVal.textContent = bgBlurInput.value + 'px';
      });
    }
  }

  setupImageUploads() {
    const bgFileInput = document.getElementById('file-bg-upload');
    const bgDropzone = document.getElementById('dropzone-bg');
    if (bgFileInput && bgDropzone) {
      bgDropzone.addEventListener('click', () => bgFileInput.click());
      bgFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          showAdminToast('Uploading full-background photo...');
          const uploadedUrl = await uploadImageToServer(file);
          document.getElementById('input-bg-image').value = uploadedUrl;
          document.getElementById('preview-bg-image').style.backgroundImage = `url("${uploadedUrl}")`;
          showAdminToast('Photo uploaded! Click "Save All Changes" to persist.');
        } catch (err) {
          showAdminToast('Upload failed: ' + err.message, 'error');
        }
      });
    }
  }

  setupSecurityTab() {
    const form = document.getElementById('change-password-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldPassword = document.getElementById('sec-current-password').value;
      const newUsername = document.getElementById('sec-new-username').value.trim();
      const newPassword = document.getElementById('sec-new-password').value;

      try {
        const res = await fetch('/api/admin/change-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPassword, newUsername, newPassword })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showAdminToast('Admin credentials updated successfully!');
          form.reset();
        } else {
          showAdminToast(data.error || 'Failed to update credentials', 'error');
        }
      } catch (err) {
        showAdminToast('Error connecting to server', 'error');
      }
    });
  }

  renderProjectsList() {
    const list = document.getElementById('admin-projects-list');
    if (!list || !siteData.projects) return;

    list.innerHTML = siteData.projects.map((p, index) => `
      <div class="admin-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-4 w-full sm:w-auto">
          <img src="${p.image}" alt="${p.title}" class="w-16 h-12 object-cover rounded-lg border border-purple-500/30 flex-shrink-0" />
          <div>
            <h4 class="font-bold text-white text-sm line-clamp-1">${p.title}</h4>
            <div class="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              <span class="text-pink-400 font-semibold">${p.category}</span>
              <span>•</span>
              <span>${(p.tags || []).slice(0, 3).join(', ')}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 self-end sm:self-center">
          <button onclick="adminApp.editProject(${index})" class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold border border-purple-500/20">
            Edit
          </button>
          <button onclick="adminApp.deleteProject(${index})" class="px-3 py-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold border border-red-500/30">
            Delete
          </button>
        </div>
      </div>
    `).join('');
  }

  addProject() {
    const title = prompt('Project Title:');
    if (!title) return;
    const category = prompt('Category (Full Stack, AI Tools, Frontend):', 'Full Stack');
    const tags = prompt('Tags (comma separated):', 'Next.js, TypeScript, Tailwind');
    const desc = prompt('Description:', 'Scalable web application with modern architecture.');
    const githubUrl = prompt('GitHub URL:', 'https://github.com/anup-dev/project');
    const liveUrl = prompt('Live Demo URL:', 'https://demo.example.com');
    const image = prompt('Image URL:', 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80');

    siteData.projects.unshift({
      id: 'p_' + Date.now(),
      title,
      category: category || 'Full Stack',
      tags: tags ? tags.split(',').map(t => t.trim()) : ['React'],
      description: desc || '',
      githubUrl: githubUrl || '#',
      liveUrl: liveUrl || '#',
      image: image || 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
      featured: true
    });

    this.renderProjectsList();
    this.updateSummaryCounts();
    showAdminToast('Project added! Click "Save All Changes" to persist.');
  }

  editProject(index) {
    const p = siteData.projects[index];
    if (!p) return;
    const title = prompt('Edit Title:', p.title);
    if (title === null) return;
    const category = prompt('Edit Category:', p.category);
    const tags = prompt('Edit Tags (comma separated):', (p.tags || []).join(', '));
    const desc = prompt('Edit Description:', p.description);
    const githubUrl = prompt('Edit GitHub URL:', p.githubUrl);
    const liveUrl = prompt('Edit Live URL:', p.liveUrl);

    siteData.projects[index] = {
      ...p,
      title: title || p.title,
      category: category || p.category,
      tags: tags ? tags.split(',').map(t => t.trim()) : p.tags,
      description: desc || p.description,
      githubUrl: githubUrl || p.githubUrl,
      liveUrl: liveUrl || p.liveUrl
    };

    this.renderProjectsList();
    showAdminToast('Project updated!');
  }

  deleteProject(index) {
    if (confirm('Delete this project?')) {
      siteData.projects.splice(index, 1);
      this.renderProjectsList();
      this.updateSummaryCounts();
      showAdminToast('Project removed.');
    }
  }

  renderNotesList() {
    const list = document.getElementById('admin-notes-list');
    if (!list || !siteData.notes) return;

    list.innerHTML = siteData.notes.map((n, index) => `
      <div class="admin-card p-4 flex items-center justify-between gap-4">
        <div>
          <h4 class="font-bold text-white text-sm">${n.title}</h4>
          <p class="text-xs text-gray-400 mt-0.5">${n.category} • ${n.pages || 'PDF'} • ${n.downloads || '10k+'} Downloads</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="adminApp.editNote(${index})" class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold border border-purple-500/20">
            Edit
          </button>
          <button onclick="adminApp.deleteNote(${index})" class="px-3 py-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold border border-red-500/30">
            Delete
          </button>
        </div>
      </div>
    `).join('');
  }

  addNote() {
    const title = prompt('Notes Title (e.g. C++ OOP Handwritten Notes):');
    if (!title) return;
    const category = prompt('Category:', 'Core CS');
    const pages = prompt('Page count (e.g. 50 Pages):', '50 Pages');
    const desc = prompt('Description:', 'Color-coded revision notes for exams and interviews.');

    siteData.notes.push({
      id: 'n_' + Date.now(),
      title,
      category: category || 'CS',
      pages: pages || '50 Pages',
      downloads: '1,000+',
      description: desc || '',
      fileUrl: '#'
    });

    this.renderNotesList();
    this.updateSummaryCounts();
    showAdminToast('Notes item added!');
  }

  editNote(index) {
    const n = siteData.notes[index];
    if (!n) return;
    const title = prompt('Edit Title:', n.title);
    if (!title) return;
    const pages = prompt('Edit Pages:', n.pages);
    const desc = prompt('Edit Description:', n.description);

    siteData.notes[index] = {
      ...n,
      title,
      pages: pages || n.pages,
      description: desc || n.description
    };

    this.renderNotesList();
    showAdminToast('Notes updated!');
  }

  deleteNote(index) {
    if (confirm('Delete this notes resource?')) {
      siteData.notes.splice(index, 1);
      this.renderNotesList();
      this.updateSummaryCounts();
      showAdminToast('Note deleted.');
    }
  }

  renderBlogsList() {
    const list = document.getElementById('admin-blogs-list');
    if (!list || !siteData.blogs) return;

    list.innerHTML = siteData.blogs.map((b, index) => `
      <div class="admin-card p-4 flex items-center justify-between gap-4">
        <div>
          <h4 class="font-bold text-white text-sm">${b.title}</h4>
          <p class="text-xs text-gray-400 mt-0.5">${b.category} • ${b.date} • ${b.readTime}</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="adminApp.editBlog(${index})" class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold border border-purple-500/20">
            Edit
          </button>
          <button onclick="adminApp.deleteBlog(${index})" class="px-3 py-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold border border-red-500/30">
            Delete
          </button>
        </div>
      </div>
    `).join('');
  }

  addBlog() {
    const title = prompt('Blog Title:');
    if (!title) return;
    const category = prompt('Category:', 'Web Dev');
    const readTime = prompt('Read time (e.g. 7 min read):', '5 min read');
    const excerpt = prompt('Short Excerpt:', 'Key architectural insights for modern web development.');
    const image = prompt('Cover Image URL:', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80');

    siteData.blogs.unshift({
      id: 'b_' + Date.now(),
      title,
      category: category || 'Web Dev',
      date: 'Today',
      readTime: readTime || '5 min read',
      excerpt: excerpt || '',
      image: image || 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80',
      link: '#blog'
    });

    this.renderBlogsList();
    this.updateSummaryCounts();
    showAdminToast('Blog added!');
  }

  editBlog(index) {
    const b = siteData.blogs[index];
    if (!b) return;
    const title = prompt('Edit Title:', b.title);
    if (!title) return;
    const excerpt = prompt('Edit Excerpt:', b.excerpt);

    siteData.blogs[index] = {
      ...b,
      title,
      excerpt: excerpt || b.excerpt
    };

    this.renderBlogsList();
    showAdminToast('Blog updated!');
  }

  deleteBlog(index) {
    if (confirm('Delete this article?')) {
      siteData.blogs.splice(index, 1);
      this.renderBlogsList();
      this.updateSummaryCounts();
      showAdminToast('Blog deleted.');
    }
  }

  populateStatsSkills() {
    const p = siteData.profile || {};
    const studentsInput = document.getElementById('input-students');
    const coursesCountInput = document.getElementById('input-courses-count');
    const projectsCountInput = document.getElementById('input-projects-count');
    const expInput = document.getElementById('input-experience');

    if (studentsInput) studentsInput.value = p.students || '';
    if (coursesCountInput) coursesCountInput.value = p.coursesCount || '';
    if (projectsCountInput) projectsCountInput.value = p.projectsCount || '';
    if (expInput) expInput.value = p.experience || '';
  }

  populateSocialLinks() {
    const sl = siteData.socialLinks || {};
    const yt = document.getElementById('input-yt');
    const gh = document.getElementById('input-gh');
    const li = document.getElementById('input-li');
    const tw = document.getElementById('input-tw');
    const dc = document.getElementById('input-dc');
    const em = document.getElementById('input-em');

    if (yt) yt.value = sl.youtube || '';
    if (gh) gh.value = sl.github || '';
    if (li) li.value = sl.linkedin || '';
    if (tw) tw.value = sl.twitter || '';
    if (dc) dc.value = sl.discord || '';
    if (em) em.value = sl.email || '';
  }

  async loadMessages() {
    const container = document.getElementById('admin-messages-list');
    if (!container) return;
    try {
      const res = await fetch('/api/messages');
      const messages = await res.json();
      if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="text-sm text-gray-400 p-6 text-center">No messages received yet. Submit one from the portfolio contact form to test!</div>';
        return;
      }
      container.innerHTML = messages.map(m => `
        <div class="admin-card p-5 border-purple-500/20">
          <div class="flex items-center justify-between mb-2">
            <div>
              <span class="font-bold text-white text-base">${m.name}</span>
              <span class="text-xs text-purple-400 ml-2">&lt;${m.email}&gt;</span>
            </div>
            <span class="text-xs text-gray-400 font-mono">${new Date(m.date).toLocaleDateString()}</span>
          </div>
          <div class="text-xs font-semibold text-gray-300 mb-2">Subject: ${m.subject}</div>
          <p class="text-sm text-gray-300 bg-slate-900/60 p-3 rounded-lg border border-purple-500/10 leading-relaxed">${m.message}</p>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = '<div class="text-sm text-red-400 p-4">Error loading messages.</div>';
    }
  }

  async saveAllChanges() {
    if (!siteData) return;

    // Collect Profile Form Data
    siteData.profile.name = document.getElementById('input-name').value;
    siteData.profile.brandName = document.getElementById('input-brand').value;
    siteData.profile.title = document.getElementById('input-title').value;
    siteData.profile.tagline = document.getElementById('input-tagline').value;
    siteData.profile.bio = document.getElementById('input-bio').value;

    const phrasesRaw = document.getElementById('input-phrases').value;
    siteData.profile.typingPhrases = phrasesRaw ? phrasesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Full Background Form Data
    siteData.background.customImage = document.getElementById('input-bg-image').value;
    siteData.background.type = document.getElementById('input-bg-type').value;
    siteData.background.overlayOpacity = parseFloat(document.getElementById('input-bg-opacity').value);
    siteData.background.blur = parseInt(document.getElementById('input-bg-blur').value, 10);
    siteData.background.photoAnimation = document.getElementById('input-photo-anim').value;

    // Stats
    siteData.profile.students = document.getElementById('input-students').value;
    siteData.profile.coursesCount = document.getElementById('input-courses-count').value;
    siteData.profile.projectsCount = document.getElementById('input-projects-count').value;
    siteData.profile.experience = document.getElementById('input-experience').value;

    // Social Links
    siteData.socialLinks.youtube = document.getElementById('input-yt').value;
    siteData.socialLinks.github = document.getElementById('input-gh').value;
    siteData.socialLinks.linkedin = document.getElementById('input-li').value;
    siteData.socialLinks.twitter = document.getElementById('input-tw').value;
    siteData.socialLinks.discord = document.getElementById('input-dc').value;
    siteData.socialLinks.email = document.getElementById('input-em').value;

    try {
      const saveBtn = document.getElementById('save-all-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Saving...';
      }

      const res = await fetch('/api/site-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteData)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save');

      showAdminToast('✨ All changes saved successfully to backend!');
    } catch (err) {
      showAdminToast('Save failed: ' + err.message, 'error');
    } finally {
      const saveBtn = document.getElementById('save-all-btn');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '💾 Save All Changes';
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.adminApp = new AdminApp();
});
