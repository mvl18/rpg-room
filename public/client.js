// public/client.js
const socket = io();

const btnMaster = document.getElementById('btn-master');
const btnPlayer = document.getElementById('btn-player');
const masterPanel = document.getElementById('master-panel');
const playerPanel = document.getElementById('player-panel');
const roomIdSpan = document.getElementById('room-id');
const inputRoom = document.getElementById('input-room');
const btnJoin = document.getElementById('btn-join');
const chat = document.getElementById('chat');
const inputMsg = document.getElementById('input-msg');
const btnSend = document.getElementById('btn-send');

let role = null;
let currentRoom = null;

function appendLine(text) {
  const p = document.createElement('div');
  p.textContent = text;
  chat.appendChild(p);
  chat.scrollTop = chat.scrollHeight;
}

btnMaster.onclick = () => {
  socket.emit('create_room', (res) => {
    if (res && res.ok) {
      role = 'master';
      currentRoom = res.roomId;
      roomIdSpan.textContent = currentRoom;
      masterPanel.classList.remove('hidden');
      document.getElementById('role-select').classList.add('hidden');
      appendLine('Sala criada. Código: ' + currentRoom);
    } else {
      appendLine('Erro ao criar sala');
    }
  });
};

btnPlayer.onclick = () => {
  role = 'player';
  playerPanel.classList.remove('hidden');
  document.getElementById('role-select').classList.add('hidden');
};

btnJoin.onclick = () => {
  const code = inputRoom.value.trim().toUpperCase();
  if (!code) return;
  socket.emit('join_room', { roomId: code, role: 'player' }, (res) => {
    if (res && res.ok) {
      currentRoom = code;
      appendLine('Entrou na sala ' + code);
      playerPanel.classList.add('hidden');
    } else {
      appendLine('Erro ao entrar: ' + (res.error || ''));
    }
  });
};

btnSend.onclick = () => {
  const txt = inputMsg.value.trim();
  if (!txt) return;
  inputMsg.value = '';
  if (role === 'master') {
    socket.emit('master_message', { text: txt });
    appendLine('Eu (mestre): ' + txt);
  } else if (role === 'player') {
    socket.emit('player_message', { text: txt });
    appendLine('Eu (jogador): ' + txt);
  } else {
    appendLine('Escolha um papel primeiro');
  }
};

socket.on('chat', (msg) => {
  if (msg.from === 'master') {
    appendLine('Mestre: ' + msg.text);
  } else if (msg.from === 'player') {
    appendLine('Jogador [' + msg.playerId + ']: ' + msg.text);
  }
});

socket.on('system', (data) => {
  appendLine('[sistema] ' + data.text);
});