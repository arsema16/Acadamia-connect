// ===== TELEGRAM-STYLE CHAT SYSTEM =====
// Real-time messaging with delivered/seen indicators, typing indicators,
// emoji picker, reply, pin, star, delete, and message search.

const Chat = (() => {
  let socket = null;
  let activeConversation = null; // { id, role, name }
  let typingTimer = null;
  let replyingTo = null;
  let emojiPickerOpen = false;

  // ===== SOCKET SETUP =====
  function initSocket(io, userId, userRole) {
    socket = io;
    if (!socket) return;

    socket.emit('join', { userId, role: userRole });

    socket.on('new_message', (msg) => {
      if (activeConversation &&
        ((msg.sender_id == activeConversation.id && msg.sender_role === activeConversation.role) ||
         (msg.receiver_id == activeConversation.id && msg.receiver_role === activeConversation.role))) {
        appendMessage(msg);
        // Mark as read immediately if conversation is open
        API.post('/api/common/mark-read', { messageIds: [msg.id] }).catch(() => {});
      }
      updateUnreadBadge();
    });

    socket.on('user_typing', ({ senderId, senderRole }) => {
      if (activeConversation && senderId == activeConversation.id && senderRole === activeConversation.role) {
        showTypingIndicator();
      }
    });

    socket.on('user_stopped_typing', ({ senderId, senderRole }) => {
      if (activeConversation && senderId == activeConversation.id && senderRole === activeConversation.role) {
        hideTypingIndicator();
      }
    });

    socket.on('message_read', ({ readBy, readByRole }) => {
      if (activeConversation && readBy == activeConversation.id) {
        document.querySelectorAll('.msg-status').forEach(el => {
          el.textContent = '✓✓';
          el.classList.add('seen');
        });
      }
    });
  }

  // ===== RENDER CHAT UI =====
  function renderChatPanel(container, contacts, currentUser) {
    container.innerHTML = `
      <div class="chat-layout">
        <div class="chat-sidebar" id="chat-sidebar">
          <div class="chat-sidebar-header">
            <h3>Messages</h3>
            <input type="text" class="chat-search-input" placeholder="Search contacts..." oninput="Chat.filterContacts(this.value)" />
          </div>
          <div class="chat-contact-list" id="chat-contact-list">
            ${renderContactList(contacts)}
          </div>
        </div>
        <div class="chat-main" id="chat-main">
          <div class="chat-empty-state">
            <div style="font-size:3rem;">💬</div>
            <p>Select a conversation to start messaging</p>
          </div>
        </div>
      </div>`;
  }

  function renderContactList(contacts) {
    if (!contacts || contacts.length === 0) {
      return '<div class="chat-empty-contacts">No contacts available</div>';
    }
    return contacts.map(c => `
      <div class="chat-contact" onclick="Chat.openConversation(${c.id}, '${c.role}', '${escapeHtml(c.full_name || c.name)}')" id="contact-${c.id}-${c.role}">
        <div class="chat-contact-avatar">${(c.full_name || c.name || '?')[0].toUpperCase()}</div>
        <div class="chat-contact-info">
          <div class="chat-contact-name">${escapeHtml(c.full_name || c.name)}</div>
          <div class="chat-contact-role">${c.role || ''}</div>
        </div>
        <div class="chat-contact-meta" id="contact-meta-${c.id}-${c.role}"></div>
      </div>`).join('');
  }

  async function openConversation(id, role, name) {
    activeConversation = { id, role, name };
    replyingTo = null;

    const mainEl = document.getElementById('chat-main');
    if (!mainEl) return;

    mainEl.innerHTML = `
      <div class="chat-header">
        <button class="chat-back-btn" onclick="Chat.closeConversation()">←</button>
        <div class="chat-header-avatar">${name[0].toUpperCase()}</div>
        <div class="chat-header-info">
          <div class="chat-header-name">${escapeHtml(name)}</div>
          <div class="chat-header-status" id="chat-status">Online</div>
        </div>
      </div>
      <div class="chat-pinned" id="chat-pinned" style="display:none;"></div>
      <div class="chat-messages" id="chat-messages">
        <div class="chat-loading">Loading messages...</div>
      </div>
      <div class="chat-typing" id="chat-typing" style="display:none;">
        <span>${escapeHtml(name)} is typing...</span>
      </div>
      <div class="chat-reply-preview" id="chat-reply-preview" style="display:none;"></div>
      <div class="chat-input-area">
        <div class="chat-input-row">
          <button class="chat-emoji-btn" onclick="Chat.toggleEmojiPicker()" title="Emoji">😊</button>
          <label class="chat-attach-btn" title="Attach file">
            📎
            <input type="file" id="chat-file-input" style="display:none;" onchange="Chat.handleFileSelect(this)" accept="image/*,.pdf,.doc,.docx,.mp3,.ogg">
          </label>
          <input type="text" class="chat-input" id="chat-input" 
            placeholder="Type a message..." 
            oninput="Chat.onTyping()"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();Chat.sendMessage()}" />
          <button class="chat-send-btn" onclick="Chat.sendMessage()">➤</button>
        </div>
        <div class="chat-emoji-picker" id="chat-emoji-picker" style="display:none;">
          ${renderEmojiPicker()}
        </div>
      </div>
      <div class="chat-search-bar" id="chat-search-bar" style="display:none;">
        <input type="text" placeholder="Search messages..." oninput="Chat.searchMessages(this.value)" />
        <button onclick="Chat.toggleSearch()">✕</button>
      </div>`;

    // Load messages
    try {
      const res = await API.get(`/api/common/messages/${id}_${role}`);
      if (res.success) {
        renderMessages(res.messages);
        loadPinnedMessages(res.messages);
      }
    } catch (e) {
      document.getElementById('chat-messages').innerHTML = '<div class="chat-error">Failed to load messages</div>';
    }
  }

  function renderMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    if (!messages || messages.length === 0) {
      container.innerHTML = '<div class="chat-no-messages">No messages yet. Say hello! 👋</div>';
      return;
    }

    container.innerHTML = messages.map(m => renderMessageBubble(m)).join('');
    container.scrollTop = container.scrollHeight;
  }

  function renderMessageBubble(msg, isMine = null) {
    const userId = AppState?.user?.id;
    const userRole = AppState?.role;
    const mine = isMine !== null ? isMine : (msg.sender_id == userId && msg.sender_role === userRole);
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="msg-wrapper ${mine ? 'mine' : 'theirs'}" id="msg-${msg.id}" 
        oncontextmenu="Chat.showMsgMenu(event, ${msg.id}, ${mine})" 
        ontouchstart="Chat.startLongPress(${msg.id}, ${mine})"
        ontouchend="Chat.cancelLongPress()">
        ${msg.pinned ? '<div class="msg-pin-indicator">📌</div>' : ''}
        ${msg.reply_to ? renderReplyContext(msg.reply_context) : ''}
        <div class="msg-bubble ${mine ? 'mine' : 'theirs'} ${msg.starred ? 'starred' : ''}">
          ${msg.media_url ? renderMediaAttachment(msg) : ''}
          ${msg.content ? `<div class="msg-text">${escapeHtml(msg.content)}</div>` : ''}
          <div class="msg-meta">
            <span class="msg-time">${time}</span>
            ${mine ? `<span class="msg-status ${msg.read_status ? 'seen' : ''}">${msg.read_status ? '✓✓' : '✓'}</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  function renderReplyContext(ctx) {
    if (!ctx) return '';
    return `<div class="msg-reply-context">
      <div class="msg-reply-bar"></div>
      <div class="msg-reply-text">${escapeHtml(ctx.content || '[Media]').substring(0, 60)}</div>
    </div>`;
  }

  function renderMediaAttachment(msg) {
    if (msg.media_type === 'image') {
      return `<img src="${msg.media_url}" class="msg-image" onclick="window.open('${msg.media_url}','_blank')" />`;
    }
    if (msg.media_type === 'audio') {
      return `<audio controls src="${msg.media_url}" class="msg-audio"></audio>`;
    }
    return `<a href="${msg.media_url}" target="_blank" class="msg-file">📎 ${msg.media_url.split('/').pop()}</a>`;
  }

  function appendMessage(msg) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const noMsg = container.querySelector('.chat-no-messages');
    if (noMsg) noMsg.remove();
    container.insertAdjacentHTML('beforeend', renderMessageBubble(msg));
    container.scrollTop = container.scrollHeight;
  }

  // ===== SEND MESSAGE =====
  async function sendMessage() {
    const input = document.getElementById('chat-input');
    const content = input?.value?.trim();
    const fileInput = document.getElementById('chat-file-input');

    if (!content && !fileInput?.files?.length) return;
    if (!activeConversation) return;

    const formData = new FormData();
    formData.append('receiver_id', activeConversation.id);
    formData.append('receiver_role', activeConversation.role);
    if (content) formData.append('content', content);
    if (replyingTo) formData.append('reply_to', replyingTo.id);
    if (fileInput?.files?.length) formData.append('media', fileInput.files[0]);

    // Clear input immediately
    if (input) input.value = '';
    if (fileInput) fileInput.value = '';
    clearReply();

    // Emit stop typing
    if (socket) {
      socket.emit('stop_typing', {
        senderId: AppState?.user?.id,
        senderRole: AppState?.role,
        receiverId: activeConversation.id,
        receiverRole: activeConversation.role
      });
    }

    try {
      const res = await fetch('/api/common/send-message', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      }).then(r => r.json());

      if (res.success) {
        appendMessage(res.message);
      }
    } catch (e) {
      showToast('Failed to send message', 'error');
    }
  }

  // ===== TYPING INDICATOR =====
  function onTyping() {
    if (!socket || !activeConversation) return;

    socket.emit('typing', {
      senderId: AppState?.user?.id,
      senderRole: AppState?.role,
      receiverId: activeConversation.id,
      receiverRole: activeConversation.role
    });

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.emit('stop_typing', {
        senderId: AppState?.user?.id,
        senderRole: AppState?.role,
        receiverId: activeConversation.id,
        receiverRole: activeConversation.role
      });
    }, 3000);
  }

  function showTypingIndicator() {
    const el = document.getElementById('chat-typing');
    if (el) {
      el.style.display = 'block';
      clearTimeout(el._hideTimer);
      el._hideTimer = setTimeout(() => hideTypingIndicator(), 3000);
    }
  }

  function hideTypingIndicator() {
    const el = document.getElementById('chat-typing');
    if (el) el.style.display = 'none';
  }

  // ===== MESSAGE CONTEXT MENU =====
  let longPressTimer = null;

  function startLongPress(msgId, isMine) {
    longPressTimer = setTimeout(() => showMsgMenu(null, msgId, isMine), 600);
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer);
  }

  function showMsgMenu(e, msgId, isMine) {
    if (e) e.preventDefault();
    removeExistingMenu();

    const menu = document.createElement('div');
    menu.className = 'msg-context-menu';
    menu.id = 'msg-context-menu';
    menu.innerHTML = `
      <button onclick="Chat.replyToMessage(${msgId})">↩ Reply</button>
      <button onclick="Chat.pinMessage(${msgId})">📌 Pin</button>
      <button onclick="Chat.starMessage(${msgId})">⭐ Star</button>
      ${isMine ? `<button onclick="Chat.deleteMessage(${msgId})" class="danger">🗑 Delete</button>` : ''}
      <button onclick="Chat.removeExistingMenu()">Cancel</button>`;

    if (e) {
      menu.style.left = Math.min(e.clientX, window.innerWidth - 160) + 'px';
      menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
    } else {
      menu.style.left = '50%';
      menu.style.top = '50%';
      menu.style.transform = 'translate(-50%, -50%)';
    }

    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', removeExistingMenu, { once: true }), 100);
  }

  function removeExistingMenu() {
    document.getElementById('msg-context-menu')?.remove();
  }

  async function replyToMessage(msgId) {
    removeExistingMenu();
    const msgEl = document.getElementById(`msg-${msgId}`);
    const textEl = msgEl?.querySelector('.msg-text');
    const content = textEl?.textContent || '[Media]';

    replyingTo = { id: msgId, content };

    const preview = document.getElementById('chat-reply-preview');
    if (preview) {
      preview.style.display = 'flex';
      preview.innerHTML = `
        <div class="reply-preview-bar"></div>
        <div class="reply-preview-text">${escapeHtml(content.substring(0, 80))}</div>
        <button onclick="Chat.clearReply()">✕</button>`;
    }
    document.getElementById('chat-input')?.focus();
  }

  function clearReply() {
    replyingTo = null;
    const preview = document.getElementById('chat-reply-preview');
    if (preview) preview.style.display = 'none';
  }

  async function pinMessage(msgId) {
    removeExistingMenu();
    const msgEl = document.getElementById(`msg-${msgId}`);
    const isPinned = msgEl?.querySelector('.msg-pin-indicator');
    await API.post('/api/common/pin-message', { messageId: msgId, pinned: !isPinned });
    // Reload conversation
    if (activeConversation) openConversation(activeConversation.id, activeConversation.role, activeConversation.name);
  }

  async function starMessage(msgId) {
    removeExistingMenu();
    const msgEl = document.getElementById(`msg-${msgId}`);
    const bubble = msgEl?.querySelector('.msg-bubble');
    const isStarred = bubble?.classList.contains('starred');
    await API.post('/api/common/star-message', { messageId: msgId, starred: !isStarred });
    bubble?.classList.toggle('starred', !isStarred);
  }

  async function deleteMessage(msgId) {
    removeExistingMenu();
    if (!confirm('Delete this message?')) return;
    const res = await API.delete(`/api/common/message/${msgId}`);
    if (res.success) {
      document.getElementById(`msg-${msgId}`)?.remove();
    }
  }

  // ===== PINNED MESSAGES =====
  function loadPinnedMessages(messages) {
    const pinned = messages.filter(m => m.pinned);
    const pinnedEl = document.getElementById('chat-pinned');
    if (!pinnedEl) return;

    if (pinned.length > 0) {
      pinnedEl.style.display = 'block';
      pinnedEl.innerHTML = `
        <div class="pinned-bar">
          📌 <strong>Pinned:</strong> ${escapeHtml(pinned[pinned.length - 1].content?.substring(0, 60) || '[Media]')}
        </div>`;
    }
  }

  // ===== EMOJI PICKER =====
  const EMOJIS = ['😀','😂','😍','🥰','😎','🤔','😢','😡','👍','👎','❤️','🔥','✨','🎉','🙏','💪','📚','✅','❌','⭐','🌟','💡','🎯','🏆','📝','💬','🤝','👋','😊','🥳'];

  function renderEmojiPicker() {
    return `<div class="emoji-grid">${EMOJIS.map(e => `<button class="emoji-btn" onclick="Chat.insertEmoji('${e}')">${e}</button>`).join('')}</div>`;
  }

  function toggleEmojiPicker() {
    const picker = document.getElementById('chat-emoji-picker');
    if (!picker) return;
    emojiPickerOpen = !emojiPickerOpen;
    picker.style.display = emojiPickerOpen ? 'block' : 'none';
  }

  function insertEmoji(emoji) {
    const input = document.getElementById('chat-input');
    if (input) {
      const pos = input.selectionStart;
      input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
      input.selectionStart = input.selectionEnd = pos + emoji.length;
      input.focus();
    }
    toggleEmojiPicker();
  }

  // ===== FILE ATTACHMENT =====
  function handleFileSelect(input) {
    if (input.files.length > 0) {
      const fileName = input.files[0].name;
      showToast(`File selected: ${fileName}`, 'info');
    }
  }

  // ===== SEARCH =====
  function toggleSearch() {
    const bar = document.getElementById('chat-search-bar');
    if (bar) bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
  }

  async function searchMessages(query) {
    if (!query || !activeConversation) return;
    if (query.length < 2) {
      // Restore all messages
      const res = await API.get(`/api/common/messages/${activeConversation.id}_${activeConversation.role}`);
      if (res.success) renderMessages(res.messages);
      return;
    }

    try {
      const res = await API.get(`/api/common/search-messages?conversationId=${activeConversation.id}_${activeConversation.role}&query=${encodeURIComponent(query)}`);
      if (res.success) renderMessages(res.messages);
    } catch (e) { /* silent */ }
  }

  // ===== CONTACT FILTER =====
  function filterContacts(query) {
    const contacts = document.querySelectorAll('.chat-contact');
    contacts.forEach(c => {
      const name = c.querySelector('.chat-contact-name')?.textContent?.toLowerCase() || '';
      c.style.display = name.includes(query.toLowerCase()) ? '' : 'none';
    });
  }

  // ===== NOTIFICATIONS =====
  function updateUnreadBadge() {
    API.get('/api/common/notifications').then(res => {
      if (res.success) {
        const badge = document.querySelector('.notif-badge');
        if (res.unreadCount > 0) {
          if (badge) badge.textContent = res.unreadCount;
          else {
            const bell = document.querySelector('.notif-bell');
            if (bell) bell.insertAdjacentHTML('beforeend', `<span class="notif-badge">${res.unreadCount}</span>`);
          }
        } else if (badge) {
          badge.remove();
        }
      }
    }).catch(() => {});
  }

  function closeConversation() {
    activeConversation = null;
    const mainEl = document.getElementById('chat-main');
    if (mainEl) {
      mainEl.innerHTML = `<div class="chat-empty-state">
        <div style="font-size:3rem;">💬</div>
        <p>Select a conversation to start messaging</p>
      </div>`;
    }
  }

  // ===== HELPERS =====
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    initSocket, renderChatPanel, openConversation, closeConversation,
    sendMessage, onTyping, showMsgMenu, removeExistingMenu,
    replyToMessage, clearReply, pinMessage, starMessage, deleteMessage,
    toggleEmojiPicker, insertEmoji, handleFileSelect,
    toggleSearch, searchMessages, filterContacts, updateUnreadBadge,
    startLongPress, cancelLongPress
  };
})();

// ===== LEGACY NOTIFICATION HELPERS (kept for backward compat) =====
function renderNotifList(notifications) {
  if (!notifications || notifications.length === 0) {
    return `<div class="empty-state"><p>${typeof t === 'function' ? t('noNotifications') : 'No notifications'}</p></div>`;
  }
  return notifications.map(n => `
<div class="notif-item ${!n.read_status ? 'unread' : ''}">
  <div class="notif-item-title">${n.title}</div>
  <div class="notif-item-body">${n.body}</div>
  <div class="notif-item-time">${typeof timeAgo === 'function' ? timeAgo(n.created_at) : n.created_at}</div>
</div>`).join('');
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (panel) panel.classList.toggle('open');
}

async function markAllRead() {
  await API.put('/api/common/notifications/read-all', {});
  const badge = document.querySelector('.notif-badge');
  if (badge) badge.remove();
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
}

function openSidebar(id) {
  const sidebar = document.getElementById(id);
  const overlay = document.getElementById('sidebar-overlay') || document.querySelector('.sidebar-overlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.style.display = 'block';
}

function closeSidebar() {
  document.querySelectorAll('.sidebar').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.sidebar-overlay').forEach(o => o.style.display = 'none');
}
