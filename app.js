const CONFIG = window.CHAT_CONFIG || {};
const API_BASE = (CONFIG.API_BASE_URL || '').trim();

const state = {
  sessionToken: localStorage.getItem('sheettalk.sessionToken') || '',
  currentRoomId: localStorage.getItem('sheettalk.currentRoomId') || '',
  currentUser: null,
  friendSearchResults: [],
  friendSearchKeyword: '',
  friends: [],
  rooms: [],
  roomMembers: [],
  messages: [],
  pollingTimer: null,
  bootstrapBusy: false,
  messagesBusy: false,
  tick: 0,
  authMode: 'login',
  selectedFriendCandidateId: '',
  toastTimer: null
};

const el = {};

document.addEventListener('DOMContentLoaded', function() {
  cacheElements();
  bindEvents();
  if (!API_BASE || API_BASE.indexOf('PUT_YOUR_') !== -1) {
    alert('config.js에 Apps Script 웹앱 URL을 먼저 넣어주세요.');
  }
  init();
});

function cacheElements() {
  el.authScreen = document.getElementById('authScreen');
  el.appScreen = document.getElementById('appScreen');
  el.loginTabBtn = document.getElementById('loginTabBtn');
  el.signupTabBtn = document.getElementById('signupTabBtn');
  el.loginForm = document.getElementById('loginForm');
  el.signupForm = document.getElementById('signupForm');
  el.authHelpText = document.getElementById('authHelpText');
  el.loginIdInput = document.getElementById('loginIdInput');
  el.loginPasswordInput = document.getElementById('loginPasswordInput');
  el.signupIdInput = document.getElementById('signupIdInput');
  el.signupPasswordInput = document.getElementById('signupPasswordInput');
  el.signupNameInput = document.getElementById('signupNameInput');
  el.signupPhoneInput = document.getElementById('signupPhoneInput');
  el.profileAvatar = document.getElementById('profileAvatar');
  el.profileName = document.getElementById('profileName');
  el.profileMeta = document.getElementById('profileMeta');
  el.friendList = document.getElementById('friendList');
  el.roomList = document.getElementById('roomList');
  el.roomTitle = document.getElementById('roomTitle');
  el.roomMeta = document.getElementById('roomMeta');
  el.roomTypeBadge = document.getElementById('roomTypeBadge');
  el.messageWrap = document.getElementById('messageWrap');
  el.messageList = document.getElementById('messageList');
  el.emptyState = document.getElementById('emptyState');
  el.messageInput = document.getElementById('messageInput');
  el.memberList = document.getElementById('memberList');
  el.memberCount = document.getElementById('memberCount');
  el.modalBackdrop = document.getElementById('modalBackdrop');
  el.friendModal = document.getElementById('friendModal');
  el.roomModal = document.getElementById('roomModal');
  el.inviteModal = document.getElementById('inviteModal');
  el.friendSearchInput = document.getElementById('friendSearchInput');
  el.friendSearchBtn = document.getElementById('friendSearchBtn');
  el.friendSearchHint = document.getElementById('friendSearchHint');
  el.friendCandidateList = document.getElementById('friendCandidateList');
  el.roomFriendChecklist = document.getElementById('roomFriendChecklist');
  el.roomNameInput = document.getElementById('roomNameInput');
  el.inviteChecklist = document.getElementById('inviteChecklist');
}

function bindEvents() {
  el.loginTabBtn.addEventListener('click', function() { setAuthMode('login'); });
  el.signupTabBtn.addEventListener('click', function() { setAuthMode('signup'); });
  el.loginForm.addEventListener('submit', handleLogin);
  el.signupForm.addEventListener('submit', handleSignUp);

  document.getElementById('refreshBtn').addEventListener('click', function() {
    bootstrap(true);
  });
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('addFriendBtn').addEventListener('click', openFriendModal);
  document.getElementById('saveFriendBtn').addEventListener('click', saveFriend);
  document.getElementById('newRoomBtn').addEventListener('click', openRoomModal);
  document.getElementById('saveRoomBtn').addEventListener('click', saveRoom);
  document.getElementById('inviteBtn').addEventListener('click', openInviteModal);
  document.getElementById('saveInviteBtn').addEventListener('click', saveInvite);
  document.getElementById('sendBtn').addEventListener('click', sendMessage);

  el.friendSearchBtn.addEventListener('click', searchFriendCandidates);
  el.friendSearchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchFriendCandidates();
    }
  });
  el.messageInput.addEventListener('input', autoResizeTextarea);
  el.messageInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  el.modalBackdrop.addEventListener('click', closeAllModals);
  document.querySelectorAll('[data-close]').forEach(function(button) {
    button.addEventListener('click', function() {
      closeModal(button.getAttribute('data-close'));
    });
  });
}

async function init() {
  setAuthMode('login');
  if (state.sessionToken) {
    const ok = await bootstrap(false);
    if (ok) {
      showAppScreen();
      startPolling();
      return;
    }
  }
  showAuthScreen();
}

function setAuthMode(mode) {
  state.authMode = mode === 'signup' ? 'signup' : 'login';
  el.loginTabBtn.classList.toggle('active', state.authMode === 'login');
  el.signupTabBtn.classList.toggle('active', state.authMode === 'signup');
  el.loginForm.classList.toggle('hidden', state.authMode !== 'login');
  el.signupForm.classList.toggle('hidden', state.authMode !== 'signup');
  el.authHelpText.textContent = state.authMode === 'login'
    ? '로그인 후 바로 친구를 추가하고 채팅방을 만들 수 있습니다.'
    : '아이디, 비밀번호, 이름, 핸드폰번호를 입력하면 바로 가입됩니다.';
}

function showAuthScreen() {
  stopPolling();
  el.authScreen.classList.remove('hidden');
  el.appScreen.classList.add('hidden');
}

function showAppScreen() {
  el.authScreen.classList.add('hidden');
  el.appScreen.classList.remove('hidden');
}

async function handleLogin(event) {
  event.preventDefault();
  try {
    const response = await apiPost({
      action: 'login',
      loginId: el.loginIdInput.value.trim(),
      password: el.loginPasswordInput.value
    });
    applySession(response.sessionToken);
    showAppScreen();
    await bootstrap(true);
    startPolling();
    el.loginForm.reset();
    showToast('로그인되었습니다.');
  } catch (error) {
    alert(error.message);
  }
}

async function handleSignUp(event) {
  event.preventDefault();
  try {
    const response = await apiPost({
      action: 'signUp',
      loginId: el.signupIdInput.value.trim(),
      password: el.signupPasswordInput.value,
      name: el.signupNameInput.value.trim(),
      phone: el.signupPhoneInput.value.trim()
    });
    applySession(response.sessionToken);
    showAppScreen();
    await bootstrap(true);
    startPolling();
    el.signupForm.reset();
    showToast('회원가입이 완료되었습니다.');
  } catch (error) {
    alert(error.message);
  }
}

async function handleLogout() {
  try {
    if (state.sessionToken) {
      await apiPost({ action: 'logout', sessionToken: state.sessionToken });
    }
  } catch (error) {
    console.error(error);
  }

  clearSession();
  state.currentUser = null;
  state.friendSearchResults = [];
  state.friendSearchKeyword = '';
  state.friends = [];
  state.rooms = [];
  state.roomMembers = [];
  state.messages = [];
  renderAll();
  showAuthScreen();
  showToast('로그아웃되었습니다.');
}

function applySession(token) {
  state.sessionToken = token;
  localStorage.setItem('sheettalk.sessionToken', token);
}

function clearSession() {
  state.sessionToken = '';
  state.currentRoomId = '';
  localStorage.removeItem('sheettalk.sessionToken');
  localStorage.removeItem('sheettalk.currentRoomId');
}

async function bootstrap(showToastOnSuccess) {
  if (!state.sessionToken || state.bootstrapBusy) {
    return false;
  }

  state.bootstrapBusy = true;
  try {
    const data = await apiGet({
      action: 'bootstrap',
      sessionToken: state.sessionToken,
      roomId: state.currentRoomId
    });

    state.currentUser = data.currentUser;
    state.friends = data.friends || [];
    state.rooms = data.rooms || [];
    state.currentRoomId = data.selectedRoomId || '';
    state.roomMembers = data.roomMembers || [];

    if (state.currentRoomId) {
      localStorage.setItem('sheettalk.currentRoomId', state.currentRoomId);
    } else {
      localStorage.removeItem('sheettalk.currentRoomId');
    }

    renderAll();

    if (state.currentRoomId) {
      await loadMessages(false);
    }

    if (showToastOnSuccess) {
      showToast('목록을 불러왔습니다.');
    }

    return true;
  } catch (error) {
    if (String(error.message || '').indexOf('세션') !== -1 || String(error.message || '').indexOf('로그인') !== -1) {
      clearSession();
      showAuthScreen();
    } else {
      alert(error.message);
    }
    return false;
  } finally {
    state.bootstrapBusy = false;
  }
}

async function loadMessages(forceScrollBottom) {
  if (!state.sessionToken || !state.currentRoomId || state.messagesBusy) {
    return;
  }

  state.messagesBusy = true;
  const shouldStickBottom = forceScrollBottom || isNearBottom(el.messageWrap);

  try {
    const data = await apiGet({
      action: 'messages',
      sessionToken: state.sessionToken,
      roomId: state.currentRoomId,
      limit: 250
    });

    state.messages = data.messages || [];
    state.roomMembers = data.roomMembers || [];

    if (data.room) {
      const roomIndex = state.rooms.findIndex(function(room) {
        return room.roomId === data.room.roomId;
      });
      if (roomIndex !== -1) {
        state.rooms[roomIndex] = data.room;
      }
    }

    renderMessages();
    renderMembers();
    renderRoomHeader();

    if (shouldStickBottom) {
      requestAnimationFrame(scrollMessagesToBottom);
    }
  } catch (error) {
    console.error(error);
  } finally {
    state.messagesBusy = false;
  }
}

function startPolling() {
  stopPolling();
  state.tick = 0;
  state.pollingTimer = window.setInterval(async function() {
    if (!state.sessionToken) return;
    state.tick += 1;

    if (state.currentRoomId) {
      await loadMessages(false);
    }

    if (state.tick % 3 === 0) {
      await bootstrap(false);
    }
  }, 4000);
}

function stopPolling() {
  if (state.pollingTimer) {
    clearInterval(state.pollingTimer);
    state.pollingTimer = null;
  }
}

function renderAll() {
  renderProfile();
  renderFriends();
  renderRooms();
  renderRoomHeader();
  renderMembers();
  renderMessages();
}

function renderProfile() {
  if (!state.currentUser) {
    el.profileAvatar.textContent = '?';
    el.profileName.textContent = '-';
    el.profileMeta.textContent = '-';
    return;
  }

  el.profileAvatar.textContent = state.currentUser.avatar || '?';
  el.profileName.textContent = state.currentUser.name;
  el.profileMeta.textContent = state.currentUser.loginId + ' · ' + (state.currentUser.phoneMasked || '');
}

function renderFriends() {
  if (!state.friends.length) {
    el.friendList.innerHTML = '<div class="muted">아직 친구가 없습니다. 먼저 친구를 추가하세요.</div>';
    return;
  }

  el.friendList.innerHTML = state.friends.map(function(friend) {
    return [
      '<div class="friend-chip">',
      '<div class="avatar">', escapeHtml(friend.avatar || '?'), '</div>',
      '<div class="name-row">',
      '<strong>', escapeHtml(friend.name), '</strong>',
      '<span>@', escapeHtml(friend.loginId || ''), ' · ', escapeHtml(friend.phoneMasked || ''), '</span>',
      '</div>',
      '</div>'
    ].join('');
  }).join('');
}

function renderRooms() {
  if (!state.rooms.length) {
    el.roomList.innerHTML = '<div class="muted">아직 채팅방이 없습니다.</div>';
    return;
  }

  el.roomList.innerHTML = state.rooms.map(function(room) {
    return [
      '<button class="room-item', room.roomId === state.currentRoomId ? ' active' : '', '" type="button" data-room-id="', escapeAttr(room.roomId), '">',
      '<div class="room-title-row">',
      '<strong>', escapeHtml(room.displayName || '채팅방'), '</strong>',
      room.unreadCount ? '<span class="unread-badge">' + escapeHtml(String(room.unreadCount)) + '</span>' : '',
      '</div>',
      '<div class="room-preview">', escapeHtml(room.lastMessage || '아직 메시지가 없습니다.'), '</div>',
      '<div class="room-meta-row">',
      '<span class="room-meta">', room.roomType === 'direct' ? '1:1 채팅' : '단체 채팅', ' · ', escapeHtml(String(room.memberCount || 0)), '명</span>',
      '<span class="room-meta">', escapeHtml(formatDateTime(room.lastMessageAt || room.createdAt)), '</span>',
      '</div>',
      '</button>'
    ].join('');
  }).join('');

  el.roomList.querySelectorAll('[data-room-id]').forEach(function(button) {
    button.addEventListener('click', function() {
      selectRoom(button.getAttribute('data-room-id'));
    });
  });
}

function renderRoomHeader() {
  const room = state.rooms.find(function(item) { return item.roomId === state.currentRoomId; });
  if (!room) {
    el.roomTypeBadge.textContent = 'ROOM';
    el.roomTitle.textContent = '채팅방을 선택해 주세요.';
    el.roomMeta.textContent = '친구를 추가한 뒤 1:1 또는 단체방을 만들 수 있습니다.';
    return;
  }

  el.roomTypeBadge.textContent = room.roomType === 'direct' ? 'DIRECT MESSAGE' : 'GROUP ROOM';
  el.roomTitle.textContent = room.displayName || '채팅방';
  el.roomMeta.textContent = (room.roomType === 'direct' ? '1:1 채팅' : '단체 채팅') + ' · ' + String(room.memberCount || 0) + '명 참여';
}

function renderMembers() {
  el.memberCount.textContent = String(state.roomMembers.length || 0) + '명';
  if (!state.roomMembers.length) {
    el.memberList.innerHTML = '<div class="muted">참여 멤버가 없습니다.</div>';
    return;
  }

  el.memberList.innerHTML = state.roomMembers.map(function(member) {
    return [
      '<div class="member-chip">',
      '<div class="avatar">', escapeHtml(member.avatar || '?'), '</div>',
      '<div class="name-row">',
      '<strong>', escapeHtml(member.name), '</strong>',
      '<span>@', escapeHtml(member.loginId || ''), ' · ', escapeHtml(member.phoneMasked || ''), '</span>',
      '</div>',
      '</div>'
    ].join('');
  }).join('');
}

function renderMessages() {
  const room = state.rooms.find(function(item) { return item.roomId === state.currentRoomId; });
  if (!room) {
    el.emptyState.classList.remove('hidden');
    el.messageList.classList.add('hidden');
    el.messageList.innerHTML = '';
    return;
  }

  el.emptyState.classList.add('hidden');
  el.messageList.classList.remove('hidden');

  if (!state.messages.length) {
    el.messageList.innerHTML = '<div class="muted">아직 메시지가 없습니다. 첫 메시지를 보내보세요.</div>';
    return;
  }

  el.messageList.innerHTML = state.messages.map(function(message) {
    const readLabel = buildReadLabel(message);
    return [
      '<div class="message-item', message.mine ? ' mine' : '', '">',
      '<div class="avatar">', escapeHtml(message.userName ? message.userName.slice(0, 1).toUpperCase() : '?'), '</div>',
      '<div class="message-bubble">',
      message.mine ? '' : '<div class="message-user">' + escapeHtml(message.userName || '알 수 없음') + '</div>',
      '<div class="message-text">', escapeHtml(message.text || '').replace(/\n/g, '<br>'), '</div>',
      '<div class="message-foot">',
      message.mine && readLabel ? '<span class="read-state">' + escapeHtml(readLabel) + '</span>' : '',
      '<span class="message-time">' + escapeHtml(formatDateTime(message.createdAt)) + '</span>',
      '</div>',
      '</div>',
      '</div>'
    ].join('');
  }).join('');
}

function buildReadLabel(message) {
  if (!message || !message.mine) return '';
  if (!message.recipientCount || message.recipientCount < 1) return '';
  if (message.recipientCount === 1) {
    return message.allRead ? '읽음' : '미확인';
  }
  return message.readCount > 0 ? ('읽음 ' + message.readCount) : '미확인';
}

async function selectRoom(roomId) {
  state.currentRoomId = String(roomId || '');
  localStorage.setItem('sheettalk.currentRoomId', state.currentRoomId);
  renderRooms();
  renderRoomHeader();
  await loadMessages(true);
  await bootstrap(false);
}

function openFriendModal() {
  state.selectedFriendCandidateId = '';
  state.friendSearchResults = [];
  state.friendSearchKeyword = '';
  el.friendSearchInput.value = '';
  renderFriendCandidates();
  openModal('friendModal');
}

async function searchFriendCandidates() {
  const keyword = String(el.friendSearchInput.value || '').trim().toLowerCase();
  state.selectedFriendCandidateId = '';
  state.friendSearchKeyword = keyword;

  if (!keyword) {
    state.friendSearchResults = [];
    renderFriendCandidates();
    return;
  }

  try {
    const data = await apiGet({
      action: 'searchUsers',
      sessionToken: state.sessionToken,
      keyword: keyword
    });
    state.friendSearchResults = data.users || [];
    renderFriendCandidates();
  } catch (error) {
    alert(error.message);
  }
}

function renderFriendCandidates() {
  const keyword = String(state.friendSearchKeyword || '').trim();
  const candidates = state.friendSearchResults || [];

  if (!keyword) {
    el.friendSearchHint.textContent = '추가할 친구의 아이디를 입력한 뒤 검색해 주세요.';
    el.friendCandidateList.innerHTML = '<div class="muted">아이디 검색 결과가 여기에 표시됩니다.</div>';
    return;
  }

  if (!candidates.length) {
    el.friendSearchHint.textContent = '검색 결과가 없습니다.';
    el.friendCandidateList.innerHTML = '<div class="muted">일치하는 아이디가 없거나 이미 친구로 추가된 사용자입니다.</div>';
    return;
  }

  el.friendSearchHint.textContent = '검색 결과에서 한 명을 선택해 친구로 추가하세요.';
  el.friendCandidateList.innerHTML = candidates.map(function(user) {
    const active = state.selectedFriendCandidateId === user.userId;
    return [
      '<button class="user-pick-item', active ? ' active' : '', '" type="button" data-candidate-id="', escapeAttr(user.userId), '">',
      '<div class="avatar">', escapeHtml(user.avatar || '?'), '</div>',
      '<div class="name-row">',
      '<strong>', escapeHtml(user.name), '</strong>',
      '<span>@', escapeHtml(user.loginId || ''), ' · ', escapeHtml(user.phoneMasked || ''), '</span>',
      '</div>',
      '</button>'
    ].join('');
  }).join('');

  el.friendCandidateList.querySelectorAll('[data-candidate-id]').forEach(function(button) {
    button.addEventListener('click', function() {
      state.selectedFriendCandidateId = button.getAttribute('data-candidate-id') || '';
      renderFriendCandidates();
    });
  });
}

async function saveFriend() {
  if (!state.selectedFriendCandidateId) {
    alert('추가할 친구를 선택해 주세요.');
    return;
  }

  try {
    await apiPost({
      action: 'addFriend',
      sessionToken: state.sessionToken,
      friendUserId: state.selectedFriendCandidateId
    });
    state.friendSearchResults = [];
    state.friendSearchKeyword = '';
    closeModal('friendModal');
    await bootstrap(false);
    showToast('친구가 추가되었습니다.');
  } catch (error) {
    alert(error.message);
  }
}

function openRoomModal() {
  if (!state.friends.length) {
    alert('먼저 친구를 추가해 주세요.');
    return;
  }

  el.roomNameInput.value = '';
  el.roomFriendChecklist.innerHTML = state.friends.map(function(friend) {
    return [
      '<label class="check-item">',
      '<input type="checkbox" value="', escapeAttr(friend.userId), '">',
      '<div class="avatar">', escapeHtml(friend.avatar || '?'), '</div>',
      '<div class="name-row">',
      '<strong>', escapeHtml(friend.name), '</strong>',
      '<span>@', escapeHtml(friend.loginId || ''), '</span>',
      '</div>',
      '</label>'
    ].join('');
  }).join('');
  openModal('roomModal');
}

async function saveRoom() {
  const checked = Array.from(el.roomFriendChecklist.querySelectorAll('input:checked')).map(function(input) {
    return input.value;
  });

  if (!checked.length) {
    alert('채팅방에 넣을 친구를 하나 이상 선택해 주세요.');
    return;
  }

  try {
    const response = await apiPost({
      action: 'createRoom',
      sessionToken: state.sessionToken,
      roomName: el.roomNameInput.value.trim(),
      memberIds: checked
    });

    closeModal('roomModal');
    state.currentRoomId = response.room.roomId;
    localStorage.setItem('sheettalk.currentRoomId', state.currentRoomId);
    await bootstrap(false);
    await loadMessages(true);
    showToast('채팅방이 생성되었습니다.');
  } catch (error) {
    alert(error.message);
  }
}

function openInviteModal() {
  const room = state.rooms.find(function(item) { return item.roomId === state.currentRoomId; });
  if (!room) {
    alert('먼저 채팅방을 선택해 주세요.');
    return;
  }

  const memberSet = new Set(state.roomMembers.map(function(member) { return member.userId; }));
  const candidates = state.friends.filter(function(friend) {
    return !memberSet.has(friend.userId);
  });

  if (!candidates.length) {
    alert('초대할 수 있는 친구가 없습니다.');
    return;
  }

  el.inviteChecklist.innerHTML = candidates.map(function(friend) {
    return [
      '<label class="check-item">',
      '<input type="checkbox" value="', escapeAttr(friend.userId), '">',
      '<div class="avatar">', escapeHtml(friend.avatar || '?'), '</div>',
      '<div class="name-row">',
      '<strong>', escapeHtml(friend.name), '</strong>',
      '<span>@', escapeHtml(friend.loginId || ''), '</span>',
      '</div>',
      '</label>'
    ].join('');
  }).join('');

  openModal('inviteModal');
}

async function saveInvite() {
  const checked = Array.from(el.inviteChecklist.querySelectorAll('input:checked')).map(function(input) {
    return input.value;
  });

  if (!checked.length) {
    alert('초대할 친구를 선택해 주세요.');
    return;
  }

  try {
    await apiPost({
      action: 'inviteToRoom',
      sessionToken: state.sessionToken,
      roomId: state.currentRoomId,
      memberIds: checked
    });
    closeModal('inviteModal');
    await bootstrap(false);
    await loadMessages(false);
    showToast('멤버를 초대했습니다.');
  } catch (error) {
    alert(error.message);
  }
}

async function sendMessage() {
  if (!state.currentRoomId) {
    alert('먼저 채팅방을 선택해 주세요.');
    return;
  }

  const text = el.messageInput.value.replace(/\r/g, '').trim();
  if (!text) {
    el.messageInput.focus();
    return;
  }

  try {
    await apiPost({
      action: 'sendMessage',
      sessionToken: state.sessionToken,
      roomId: state.currentRoomId,
      text: text
    });
    el.messageInput.value = '';
    autoResizeTextarea();
    await loadMessages(true);
    await bootstrap(false);
  } catch (error) {
    alert(error.message);
  }
}

function openModal(id) {
  el.modalBackdrop.classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  if (document.querySelectorAll('.modal:not(.hidden)').length === 0) {
    el.modalBackdrop.classList.add('hidden');
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(function(modal) {
    modal.classList.add('hidden');
  });
  el.modalBackdrop.classList.add('hidden');
}

function autoResizeTextarea() {
  el.messageInput.style.height = 'auto';
  el.messageInput.style.height = Math.min(el.messageInput.scrollHeight, 168) + 'px';
}

function scrollMessagesToBottom() {
  el.messageWrap.scrollTop = el.messageWrap.scrollHeight;
}

function isNearBottom(container) {
  if (!container) return true;
  const remain = container.scrollHeight - container.scrollTop - container.clientHeight;
  return remain < 120;
}

function showToast(message) {
  if (!message) return;

  const old = document.querySelector('.toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(function() {
    toast.remove();
  }, 2200);
}

async function apiGet(params) {
  const url = new URL(API_BASE);
  Object.keys(params || {}).forEach(function(key) {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store'
  });
  const json = await response.json();
  if (!json.ok) {
    throw new Error(json.error || '요청에 실패했습니다.');
  }
  return json.data;
}

async function apiPost(params) {
  const body = new URLSearchParams();
  Object.keys(params || {}).forEach(function(key) {
    const value = params[key];
    if (Array.isArray(value)) {
      body.set(key, JSON.stringify(value));
    } else if (value !== undefined && value !== null) {
      body.set(key, value);
    }
  });

  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: body.toString()
  });
  const json = await response.json();
  if (!json.ok) {
    throw new Error(json.error || '요청에 실패했습니다.');
  }
  return json.data;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value || '');

  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
