/**
 * TikTok-Style Vertical Video Feed for Academia Connect V2
 * Full-screen vertical video player with swipe navigation, auto-play,
 * like/comment/share controls, and school-isolated content.
 */

const VideoFeed = (() => {
  let videos = [];
  let currentIndex = 0;
  let touchStartY = 0;
  let touchStartX = 0;
  let isTransitioning = false;
  let commentPanelOpen = false;

  // ===== RENDER =====
  function render(container, videoList, startIndex = 0) {
    videos = videoList;
    currentIndex = startIndex;

    container.innerHTML = `
      <div class="vf-container" id="vf-container">
        <div class="vf-close" onclick="VideoFeed.close()">✕</div>
        <div class="vf-slides" id="vf-slides"></div>
        <div class="vf-comment-panel" id="vf-comment-panel" style="display:none;">
          <div class="vf-comment-header">
            <span>Comments</span>
            <button onclick="VideoFeed.toggleComments()" class="vf-comment-close">✕</button>
          </div>
          <div class="vf-comment-list" id="vf-comment-list"></div>
          <div class="vf-comment-input">
            <input type="text" id="vf-comment-text" placeholder="Add a comment..." />
            <button onclick="VideoFeed.submitComment()">Send</button>
          </div>
        </div>
      </div>`;

    renderSlides();
    setupSwipe();
    goTo(currentIndex, false);
  }

  function renderSlides() {
    const slidesEl = document.getElementById('vf-slides');
    if (!slidesEl) return;
    slidesEl.innerHTML = videos.map((v, i) => `
      <div class="vf-slide" id="vf-slide-${i}" data-index="${i}">
        <video class="vf-video" id="vf-video-${i}" 
          src="${v.file_url}" 
          loop playsinline muted
          preload="${Math.abs(i - currentIndex) <= 1 ? 'auto' : 'none'}"
          onended="VideoFeed.onVideoEnd(${i})">
        </video>
        <div class="vf-overlay">
          <div class="vf-info">
            <div class="vf-uploader">${v.uploader_name || 'Unknown'}</div>
            <div class="vf-title">${v.title}</div>
            ${v.description ? `<div class="vf-desc">${v.description}</div>` : ''}
          </div>
          <div class="vf-actions">
            <button class="vf-action-btn ${v.user_liked ? 'liked' : ''}" onclick="VideoFeed.toggleLike(${v.id}, this)" title="Like">
              <span class="vf-action-icon">❤️</span>
              <span class="vf-action-count" id="vf-likes-${v.id}">${v.like_count || v.likes || 0}</span>
            </button>
            <button class="vf-action-btn" onclick="VideoFeed.toggleComments(${v.id})" title="Comment">
              <span class="vf-action-icon">💬</span>
              <span class="vf-action-count">${v.comment_count || 0}</span>
            </button>
            <button class="vf-action-btn" onclick="VideoFeed.toggleMute(${i})" id="vf-mute-${i}" title="Mute/Unmute">
              <span class="vf-action-icon">🔇</span>
            </button>
          </div>
        </div>
        <div class="vf-progress-bar">
          <div class="vf-progress-fill" id="vf-progress-${i}"></div>
        </div>
      </div>`).join('');
  }

  // ===== NAVIGATION =====
  function goTo(index, animate = true) {
    if (index < 0 || index >= videos.length || isTransitioning) return;

    // Pause current video
    const prevVideo = document.getElementById(`vf-video-${currentIndex}`);
    if (prevVideo) prevVideo.pause();

    currentIndex = index;
    isTransitioning = animate;

    const slidesEl = document.getElementById('vf-slides');
    if (slidesEl) {
      slidesEl.style.transition = animate ? 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none';
      slidesEl.style.transform = `translateY(-${index * 100}%)`;
    }

    setTimeout(() => {
      isTransitioning = false;
      playCurrentVideo();
    }, animate ? 350 : 0);
  }

  function next() { goTo(currentIndex + 1); }
  function prev() { goTo(currentIndex - 1); }

  function playCurrentVideo() {
    const video = document.getElementById(`vf-video-${currentIndex}`);
    if (!video) return;

    video.play().catch(() => {});
    trackView(videos[currentIndex]?.id);
    updateProgressBar(currentIndex);
  }

  function onVideoEnd(index) {
    if (index === currentIndex && currentIndex < videos.length - 1) {
      next();
    }
  }

  // ===== PROGRESS BAR =====
  function updateProgressBar(index) {
    const video = document.getElementById(`vf-video-${index}`);
    const bar = document.getElementById(`vf-progress-${index}`);
    if (!video || !bar) return;

    const update = () => {
      if (video.duration) {
        bar.style.width = `${(video.currentTime / video.duration) * 100}%`;
      }
      if (!video.paused && !video.ended) {
        requestAnimationFrame(update);
      }
    };
    requestAnimationFrame(update);
  }

  // ===== SWIPE GESTURES =====
  function setupSwipe() {
    const container = document.getElementById('vf-container');
    if (!container) return;

    container.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    container.addEventListener('touchend', e => {
      const dy = touchStartY - e.changedTouches[0].clientY;
      const dx = Math.abs(touchStartX - e.changedTouches[0].clientX);
      if (Math.abs(dy) > 50 && dx < 80) {
        if (dy > 0) next();
        else prev();
      }
    }, { passive: true });

    // Mouse wheel support for desktop
    container.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.deltaY > 30) next();
      else if (e.deltaY < -30) prev();
    }, { passive: false });

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (!document.getElementById('vf-container')) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next();
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') close();
    });
  }

  // ===== ACTIONS =====
  async function toggleLike(videoId, btn) {
    try {
      const res = await API.post('/api/common/video-like', { video_id: videoId });
      if (res.success) {
        btn.classList.toggle('liked', res.liked);
        const countEl = document.getElementById(`vf-likes-${videoId}`);
        if (countEl) countEl.textContent = res.likes;
      }
    } catch (e) {
      showToast('Failed to update like', 'error');
    }
  }

  let activeVideoId = null;

  async function toggleComments(videoId) {
    const panel = document.getElementById('vf-comment-panel');
    if (!panel) return;

    if (commentPanelOpen && activeVideoId === videoId) {
      panel.style.display = 'none';
      commentPanelOpen = false;
      return;
    }

    activeVideoId = videoId;
    commentPanelOpen = true;
    panel.style.display = 'flex';

    const listEl = document.getElementById('vf-comment-list');
    listEl.innerHTML = '<div style="padding:16px;text-align:center;color:rgba(255,255,255,0.5);">Loading...</div>';

    try {
      const res = await API.get(`/api/common/video-comments/${videoId}`);
      if (res.success) {
        listEl.innerHTML = res.comments.length
          ? res.comments.map(c => `
            <div class="vf-comment">
              <strong>${c.author_name || 'User'}</strong>
              <span>${c.content}</span>
              <small>${new Date(c.created_at).toLocaleDateString()}</small>
            </div>`).join('')
          : '<div style="padding:16px;text-align:center;color:rgba(255,255,255,0.5);">No comments yet</div>';
      }
    } catch (e) {
      listEl.innerHTML = '<div style="padding:16px;color:#ff4444;">Failed to load comments</div>';
    }
  }

  async function submitComment() {
    const input = document.getElementById('vf-comment-text');
    const content = input?.value?.trim();
    if (!content || !activeVideoId) return;

    try {
      const res = await API.post('/api/common/video-comment', { video_id: activeVideoId, content });
      if (res.success) {
        input.value = '';
        const listEl = document.getElementById('vf-comment-list');
        const c = res.comment;
        const div = document.createElement('div');
        div.className = 'vf-comment';
        div.innerHTML = `<strong>${c.author_name || 'You'}</strong><span>${c.content}</span><small>Just now</small>`;
        listEl.appendChild(div);
        listEl.scrollTop = listEl.scrollHeight;
      }
    } catch (e) {
      showToast('Failed to post comment', 'error');
    }
  }

  function toggleMute(index) {
    const video = document.getElementById(`vf-video-${index}`);
    const btn = document.getElementById(`vf-mute-${index}`);
    if (!video || !btn) return;
    video.muted = !video.muted;
    btn.querySelector('.vf-action-icon').textContent = video.muted ? '🔇' : '🔊';
  }

  async function trackView(videoId) {
    if (!videoId) return;
    try {
      await API.post('/api/common/video-view', { video_id: videoId });
    } catch (e) { /* silent */ }
  }

  function close() {
    const container = document.getElementById('vf-container');
    if (container) {
      const video = document.getElementById(`vf-video-${currentIndex}`);
      if (video) video.pause();
      container.remove();
    }
    commentPanelOpen = false;
  }

  return { render, next, prev, goTo, onVideoEnd, toggleLike, toggleComments, submitComment, toggleMute, close };
})();
