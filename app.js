const CONFIG = window.CHAT_CONFIG || {};
const API_BASE = (CONFIG.API_BASE_URL || '').trim();

const state = {
  users: [],
  friends: [],
  rooms: [],
  roomMembers: [],
  messages: [],
  currentUserId: localStorage.getItem('sheettalk.currentUserId') || '',
  currentRoomId: localStorage.getItem('sheettalk.currentRoomId') || '',
  pollingTimer: null
};

const el = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  bindEvents();
  if (!API_BASE || API_BASE.includes('PUT_YOUR_')) {
    alert('config.js에 Apps Script 웹앱 URL을 먼저 넣어주세요.');
  }
  bootstrap();
  startPolling();
});

function cacheElements() {
  el.senderSelect = document.getElementById('senderSelect');
  el.friendList = document.getElementById('friendList');
  el.roomList = document.getElementById('roomList');
  el.roomTitle = document.getElementById('roomTitle');
  el.roomMeta = document.getElementById('roomMeta');
  el.roomTypeBadge = document.getElementById('roomTypeBadge');
  el.messageList = document.getElementById('messageList');
  el.messageWrap = document.getElementById('messageWrap');
  el.messageInput = document.getElementById('messageInput');
  el.emptyState = document.getElementById('emptyState');
  el.memberList = document.getElementById('memberList');
  el.memberCount = document.getElementById('memberCount');
  el.modalBackdrop = document.getElementById('modalBackdrop');
  el.existingUserSelect = document.getElementById('existingUserSelect');
  el.newFriendName = document.getElementById('newFriendName');
  el.roomFriendChecklist = document.getElementById('roomFriendChecklist');
  el.inviteChecklist = document.getElementById('inviteChecklist');
  el.roomNameInput = document.getElementById('roomNameInput');
  el.newUserName = document.getElementById('newUserName');
}

function bindEvents() {
  document.getElementById('refreshBtn').addEventListener('click', () => bootstrap(true));
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('newRoomBtn').addEventListener('click', openRoomModal);
  document.getElementById('inviteBtn').addEventListener('click', openInviteModal);
  document.getElementById('addFriendBtn').addEventListener('click', openFriendModal);
  document.getElementById('createUserBtn').addEventListener('click', () => openModal('createUserModal'));
  document.getElementById('saveUserBtn').addEventListener('click', createUser);
  document.getElementById('saveFriendBtn').addEventListener('click', addFriend);
  document.getElementById('saveRoomBtn').addEventListener('click', createRoom);
  document.getElementById('saveInviteBtn').addEventListener('click', inviteMembers);
  el.senderSelect.addEventListener('change', handleSenderChange);
  el.messageInput.addEventListener('keydown', handleComposerKeydown);
  el.messageInput.addEventListener('input', autoResizeTextarea);

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  el.modalBackdrop.addEventListener('click', closeAllModals);
}

async function bootstrap(silent = false) {
  try {
    const params = new URLSearchParams({ action: 'bootstrap' });
    if (state.currentUserId) params.set('userId', state.currentUserId);
    if (state.currentRoomId) params.set('roomId', state.currentRoomId);

    const result = await apiGet(params);
    state.users = result.users || [];
    state.currentUserId = result.currentUserId || state.currentUserId || '';
    state.friends = result.friends || [];
    state.rooms = result.rooms || [];
    state.roomMembers = result.roomMembers || [];

    if (!state.currentUserId && state.users[0]) {
      state.currentUserId = state.users[0].userId;
    }

    if (!state.currentRoomId || !state.rooms.some(room => room.roomId === state.currentRoomId)) {
      state.currentRoomId = result.selectedRoomId || (state.rooms[0]?.roomId || '');
    }

    persistSelections();
    renderAll();

    if (state.currentRoomId) {
      await loadMessages(silent);
    } else {
      state.messages = [];
      renderMessages();
    }
  } catch (error) {
    if (!silent) {
      alert(error.message || '데이터를 불러오지 못했습니다.');
    }
  }
}

async function loadMessages(silent = false) {
  if (!state.currentRoomId) {
    state.messages = [];
    renderMessages();
    return;
  }

  try {
    const params = new URLSearchParams({
      action: 'messages',
      roomId: state.currentRoomId,
      limit: 200
    });
    const result = await apiGet(params);
    state.messages = result.messages || [];
    state.roomMembers = result.roomMembers || [];
    renderRoomHeader();
    renderMembers();
    renderMessages();
  } catch (error) {
    if (!silent) {
      alert(error.message || '메시지를 불러오지 못했습니다.');
    }
  }
}

async function createUser() {
  const name = el.newUserName.value.trim();
  if (!name) return alert('이름을 입력하세요.');

  try {
    const result = await apiPost({ action: 'createUser', name });
    closeModal('createUserModal');
    el.newUserName.value = '';
    state.currentUserId = result.userId;
    await bootstrap();
  } catch (error) {
    alert(error.message || '사용자 추가에 실패했습니다.');
  }
}

async function addFriend() {
  const existingUserId = el.existingUserSelect.value;
  const newFriendName = el.newFriendName.value.trim();

  if (!state.currentUserId) return alert('먼저 보내는 사람을 선택하세요.');
  if (!existingUserId && !newFriendName) return alert('기존 사용자를 고르거나 새 친구 이름을 입력하세요.');

  try {
    await apiPost({
      action: 'addFriend',
      userId: state.currentUserId,
      friendUserId: existingUserId || '',
      friendName: newFriendName || ''
    });
    closeModal('friendModal');
    el.newFriendName.value = '';
    await bootstrap();
  } catch (error) {
    alert(error.message || '친구 추가에 실패했습니다.');
  }
}

async function createRoom() {
  const memberIds = getCheckedValues('#roomFriendChecklist input[type="checkbox"]');
  const roomName = el.roomNameInput.value.trim();

  if (!state.currentUserId) return alert('보내는 사람을 먼저 선택하세요.');
  if (!memberIds.length) return alert('최소 1명 이상 선택해야 합니다.');

  try {
    const result = await apiPost({
      action: 'createRoom',
      createdBy: state.currentUserId,
      memberIds,
      roomName
    });
    closeModal('roomModal');
    el.roomNameInput.value = '';
    state.currentRoomId = result.room.roomId;
    await bootstrap();
  } catch (error) {
    alert(error.message || '방 생성에 실패했습니다.');
  }
}

async function inviteMembers() {
  const memberIds = getCheckedValues('#inviteChecklist input[type="checkbox"]');
  if (!state.currentRoomId) return alert('먼저 채팅방을 선택하세요.');
  if (!memberIds.length) return alert('초대할 친구를 선택하세요.');

  try {
    await apiPost({
      action: 'inviteToRoom',
      roomId: state.currentRoomId,
      inviterUserId: state.currentUserId,
      memberIds
    });
    closeModal('inviteModal');
    await bootstrap();
  } catch (error) {
    alert(error.message || '초대에 실패했습니다.');
  }
}

async function sendMessage() {
  const text = el.messageInput.value.trim();
  if (!state.currentUserId) return alert('보내는 사람을 선택하세요.');
  if (!state.currentRoomId) return alert('먼저 채팅방을 선택하세요.');
  if (!text) return;

  try {
    await apiPost({
      action: 'sendMessage',
      roomId: state.currentRoomId,
      userId: state.currentUserId,
      text
    });
    el.messageInput.value = '';
    autoResizeTextarea();
    await bootstrap(true);
    scrollMessagesToBottom();
  } catch (error) {
    alert(error.message || '메시지 전송에 실패했습니다.');
  }
}

function handleSenderChange(event) {
  state.currentUserId = event.target.value;
  state.currentRoomId = '';
  persistSelections();
  bootstrap();
}

function handleComposerKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function autoResizeTextarea() {
  const ta = el.messageInput;
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
}

function renderAll() {
  renderSenderSelect();
  renderFriends();
  renderRooms();
  renderRoomHeader();
  renderMembers();
  renderExistingUserOptions();
}

function renderSenderSelect() {
  el.senderSelect.innerHTML = '';
  if (!state.users.length) {
    const opt = new Option('사용자를 먼저 추가하세요', '');
    el.senderSelect.appendChild(opt);
    return;
  }

  state.users.forEach(user => {
    const opt = new Option(user.name, user.userId);
    opt.selected = user.userId === state.currentUserId;
    el.senderSelect.appendChild(opt);
  });
}

function renderFriends() {
  if (!state.friends.length) {
    el.friendList.innerHTML = '<div class="friend-chip"><div class="name-row"><strong>친구가 없습니다</strong><span>친구를 추가하면 1:1 또는 단체방을 만들 수 있습니다.</span></div></div>';
    return;
  }

  el.friendList.innerHTML = state.friends.map(friend => `
    <div class="friend-chip">
      <div class="avatar">${escapeHtml(friend.avatar || friend.name?.[0] || '?')}</div>
      <div class="name-row">
        <strong>${escapeHtml(friend.name)}</strong>
        <span>${escapeHtml(friend.userId)}</span>
      </div>
    </div>
  `).join('');
}

function renderRooms() {
  if (!state.rooms.length) {
    el.roomList.innerHTML = '<div class="room-item"><strong>아직 채팅방이 없습니다</strong><div class="room-preview">새 방을 만들어 보세요.</div></div>';
    return;
  }

  el.roomList.innerHTML = state.rooms.map(room => `
    <button class="room-item ${room.roomId === state.currentRoomId ? 'active' : ''}" data-room-id="${escapeHtml(room.roomId)}">
      <strong>${escapeHtml(room.displayName || room.roomName || '이름 없는 방')}</strong>
      <div class="room-meta">${room.roomType === 'direct' ? '1:1 채팅' : '단체 채팅'} · ${room.memberCount}명</div>
      <div class="room-preview">${escapeHtml(room.lastMessage || '아직 메시지가 없습니다.')}</div>
    </button>
  `).join('');

  el.roomList.querySelectorAll('[data-room-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.currentRoomId = btn.dataset.roomId;
      persistSelections();
      renderRooms();
      await loadMessages();
    });
  });
}

function renderRoomHeader() {
  const room = state.rooms.find(item => item.roomId === state.currentRoomId);
  if (!room) {
    el.roomTypeBadge.textContent = '채팅방';
    el.roomTitle.textContent = '방을 선택하세요';
    el.roomMeta.textContent = '친구를 추가하고 채팅방을 만들어 주세요.';
    return;
  }

  el.roomTypeBadge.textContent = room.roomType === 'direct' ? '1:1 CHAT' : 'GROUP CHAT';
  el.roomTitle.textContent = room.displayName || room.roomName || '이름 없는 방';
  el.roomMeta.textContent = `${room.memberCount}명 참여 · 마지막 메시지 ${room.lastMessageAt ? formatDateTime(room.lastMessageAt) : '없음'}`;
}

function renderMembers() {
  el.memberCount.textContent = `${state.roomMembers.length}명`;
  if (!state.roomMembers.length) {
    el.memberList.innerHTML = '<div class="member-chip"><div class="name-row"><strong>멤버 없음</strong><span>방을 선택하면 참여자가 표시됩니다.</span></div></div>';
    return;
  }

  el.memberList.innerHTML = state.roomMembers.map(member => `
    <div class="member-chip">
      <div class="avatar">${escapeHtml(member.avatar || member.name?.[0] || '?')}</div>
      <div class="name-row">
        <strong>${escapeHtml(member.name)}</strong>
        <span>${formatDateTime(member.joinedAt)} 참여</span>
      </div>
    </div>
  `).join('');
}

function renderMessages() {
  const hasRoom = Boolean(state.currentRoomId);
  const hasMessages = state.messages.length > 0;
  el.emptyState.classList.toggle('hidden', hasRoom && hasMessages);
  el.messageList.innerHTML = '';

  if (!hasRoom || !hasMessages) {
    return;
  }

  el.messageList.innerHTML = state.messages.map(msg => {
    const mine = msg.userId === state.currentUserId;
    return `
      <div class="message-item ${mine ? 'mine' : ''}">
        <div class="avatar">${escapeHtml(msg.userName?.[0] || '?')}</div>
        <div class="message-bubble">
          <div class="message-user">${escapeHtml(msg.userName || '알 수 없음')}</div>
          <div class="message-text">${escapeHtml(msg.text)}</div>
          <div class="message-time">${formatDateTime(msg.createdAt)}</div>
        </div>
      </div>
    `;
  }).join('');

  scrollMessagesToBottom();
}

function renderExistingUserOptions() {
  const friendIds = new Set(state.friends.map(friend => friend.userId));
  const candidates = state.users.filter(user => user.userId !== state.currentUserId && !friendIds.has(user.userId));

  el.existingUserSelect.innerHTML = '<option value="">기존 사용자 선택</option>';
  candidates.forEach(user => {
    const opt = new Option(user.name, user.userId);
    el.existingUserSelect.appendChild(opt);
  });
}

function openFriendModal() {
  if (!state.currentUserId) return alert('먼저 보내는 사람을 선택하세요.');
  renderExistingUserOptions();
  openModal('friendModal');
}

function openRoomModal() {
  if (!state.currentUserId) return alert('먼저 보내는 사람을 선택하세요.');
  if (!state.friends.length) return alert('먼저 친구를 추가하세요.');

  el.roomFriendChecklist.innerHTML = state.friends.map(friend => `
    <label class="check-item">
      <input type="checkbox" value="${escapeHtml(friend.userId)}" />
      <div class="name-row">
        <strong>${escapeHtml(friend.name)}</strong>
        <span>${escapeHtml(friend.userId)}</span>
      </div>
    </label>
  `).join('');
  openModal('roomModal');
}

function openInviteModal() {
  if (!state.currentRoomId) return alert('먼저 채팅방을 선택하세요.');
  const currentMemberIds = new Set(state.roomMembers.map(member => member.userId));
  const candidates = state.friends.filter(friend => !currentMemberIds.has(friend.userId));

  if (!candidates.length) {
    return alert('초대할 수 있는 친구가 없습니다.');
  }

  el.inviteChecklist.innerHTML = candidates.map(friend => `
    <label class="check-item">
      <input type="checkbox" value="${escapeHtml(friend.userId)}" />
      <div class="name-row">
        <strong>${escapeHtml(friend.name)}</strong>
        <span>${escapeHtml(friend.userId)}</span>
      </div>
    </label>
  `).join('');
  openModal('inviteModal');
}

function openModal(id) {
  closeAllModals();
  document.getElementById(id).classList.remove('hidden');
  el.modalBackdrop.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  if (![...document.querySelectorAll('.modal')].some(node => !node.classList.contains('hidden'))) {
    el.modalBackdrop.classList.add('hidden');
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(node => node.classList.add('hidden'));
  el.modalBackdrop.classList.add('hidden');
}

function getCheckedValues(selector) {
  return [...document.querySelectorAll(selector)]
    .filter(input => input.checked)
    .map(input => input.value);
}

function persistSelections() {
  localStorage.setItem('sheettalk.currentUserId', state.currentUserId || '');
  localStorage.setItem('sheettalk.currentRoomId', state.currentRoomId || '');
}

function scrollMessagesToBottom() {
  el.messageWrap.scrollTop = el.messageWrap.scrollHeight;
}

function startPolling() {
  stopPolling();
  state.pollingTimer = setInterval(async () => {
    try {
      await bootstrap(true);
    } catch (error) {
      console.warn(error);
    }
  }, 3500);
}

function stopPolling() {
  if (state.pollingTimer) {
    clearInterval(state.pollingTimer);
    state.pollingTimer = null;
  }
}

async function apiGet(params) {
  const response = await fetch(`${API_BASE}?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store'
  });
  const json = await response.json();
  if (!json.ok) throw new Error(json.error || '요청 실패');
  return json.data;
}

async function apiPost(payload) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!json.ok) throw new Error(json.error || '요청 실패');
  return json.data;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('\n', '<br>');
}
