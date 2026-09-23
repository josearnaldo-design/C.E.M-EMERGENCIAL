// ==========================================
// CONFIGURAÇÃO DO FIREBASE (SUBSTITUA PELOS SEUS DADOS)
// ==========================================
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "seu_id",
  appId: "seu_app_id"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentUser = null;
let whatsappAutoMessage = "Olá! Entramos em contato a respeito da ficha escolar do aluno no C.E.M Emergencial.";
let extraRespCount = 0;

const gradeOrder = ["1º Ano", "2º Ano", "3º Ano"];
const classroomOptionsMap = {
  "1º Ano": ["100", "101", "102", "103"],
  "2º Ano": ["200-ADM", "201-ADM", "200-INT", "201-INT"],
  "3º Ano": ["300-ADM", "301-ADM", "300-INT", "301-INT"]
};

const users = [
  { username: "dev", password: "123", role: "dev", defaultTab: "dev" },
  { username: "gestor", password: "123", role: "gestao", defaultTab: "gestao" },
  { username: "sec", password: "123", role: "sec", defaultTab: "turmas" }
];

let students = [];

// Ouve alterações no banco de dados do Firebase em tempo real
db.ref('students').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    // Converte o objeto do Firebase de volta para um array
    students = Object.keys(data).map(key => ({
      firebaseId: key,
      ...data[key]
    }));
  } else {
    students = [];
  }
  renderStudents();
});

// ==========================================
// 1. AUTENTICAÇÃO E NÍVEIS DE ACESSO
// ==========================================

function handleLogin(e) {
  e.preventDefault();
  const userIn = document.getElementById('username').value.trim();
  const passIn = document.getElementById('password').value.trim();
  const errorMsg = document.getElementById('loginError');

  const foundUser = users.find(u => u.username === userIn && u.password === passIn);

  if (foundUser) {
    currentUser = foundUser;
    if (errorMsg) errorMsg.style.display = 'none';

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';

    applyPermissions();
    switchTab(currentUser.defaultTab);
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
  }
}

function applyPermissions() {
  document.querySelectorAll('nav button').forEach(btn => {
    if (!btn.onclick || btn.innerText === 'Sair') return;
    
    if (btn.classList.contains(`role-${currentUser.role}`)) {
      btn.style.display = 'inline-block';
    } else {
      btn.style.display = 'none';
    }
  });
}

function handleLogout() {
  currentUser = null;
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

// ==========================================
// 2. NAVEGAÇÃO E UTILITÁRIOS
// ==========================================

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));

  const activeTab = document.getElementById(tabId);
  const activeBtn = document.getElementById(`btn-${tabId}`);

  if (activeTab) activeTab.classList.add('active');
  if (activeBtn) activeBtn.classList.add('active');
}

function togglePhotoInput() {
  const photoType = document.getElementById('photoType').value;
  const fileGroup = document.getElementById('photoFileGroup');
  const urlGroup = document.getElementById('photoUrlGroup');

  if (photoType === 'file') {
    fileGroup.style.display = 'block';
    urlGroup.style.display = 'none';
  } else {
    fileGroup.style.display = 'none';
    urlGroup.style.display = 'block';
  }
}

function updateClassroomOptions() {
  const gradeSelect = document.getElementById('stuGrade');
  const classroomSelect = document.getElementById('stuClassroom');

  if (!gradeSelect || !classroomSelect) return;

  const selectedGrade = gradeSelect.value;
  classroomSelect.innerHTML = '<option value="">Selecione a Turma...</option>';

  if (selectedGrade && classroomOptionsMap[selectedGrade]) {
    classroomSelect.disabled = false;
    classroomOptionsMap[selectedGrade].forEach(turma => {
      const option = document.createElement('option');
      option.value = turma;
      option.innerText = turma;
      classroomSelect.appendChild(option);
    });
  } else {
    classroomSelect.disabled = true;
    classroomSelect.innerHTML = '<option value="">Selecione primeiro o Ano...</option>';
  }
}

function addResponsibleField() {
  if (extraRespCount >= 2) return;
  extraRespCount++;

  const container = document.getElementById('extraResponsiblesContainer');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'extra-resp';
  div.id = `respExtraBlock_${extraRespCount}`;

  div.innerHTML = `
    <h3>Responsável Adicional ${extraRespCount}</h3>
    <div class="grid-2">
      <div class="form-group">
        <label>Nome:</label>
        <input type="text" class="respExtraName" required>
      </div>
      <div class="form-group">
        <label>Telefone (DDD):</label>
        <input type="tel" class="respExtraPhone" placeholder="Ex: 98999999999" required>
      </div>
    </div>
  `;

  container.appendChild(div);

  const btnAddResp = document.getElementById('btnAddResp');
  if (extraRespCount === 2 && btnAddResp) {
    btnAddResp.style.display = 'none';
  }
}

async function getStudentPhotoData() {
  const photoType = document.getElementById('photoType').value;

  if (photoType === 'file') {
    const fileInput = document.getElementById('stuPhotoFile');
    if (fileInput.files && fileInput.files[0]) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
          resolve(e.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
      });
    }
  } else {
    const urlInput = document.getElementById('stuPhotoUrl').value;
    if (urlInput.trim() !== '') {
      return urlInput.trim();
    }
  }

  return 'https://via.placeholder.com/80?text=Sem+Foto';
}

function getWaLink(phone) {
  if (!phone) return '#';
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
    cleanPhone = '55' + cleanPhone;
  }
  const encodedMsg = encodeURIComponent(whatsappAutoMessage);
  return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
}

// ==========================================
// 3. PERSISTÊNCIA NO FIREBASE (NUVEM)
// ==========================================

async function handleCadastrarAluno(e) {
  e.preventDefault();

  const photoData = await getStudentPhotoData();
  const extraNames = document.querySelectorAll('.respExtraName');
  const extraPhones = document.querySelectorAll('.respExtraPhone');

  const extraResponsibles = [];
  extraNames.forEach((input, index) => {
    extraResponsibles.push({
      name: input.value,
      phone: extraPhones[index] ? extraPhones[index].value.replace(/\D/g, '') : ''
    });
  });

  const newStudent = {
    id: Date.now(),
    name: document.getElementById('stuName').value,
    photo: photoData,
    grade: document.getElementById('stuGrade').value,
    classroom: document.getElementById('stuClassroom').value,
    address: {
      street: document.getElementById('stuStreet').value,
      number: document.getElementById('stuNumber').value,
      neighborhood: document.getElementById('stuNeighborhood').value,
      city: document.getElementById('stuCity').value,
      reference: document.getElementById('stuReference').value
    },
    phone: document.getElementById('stuPhone').value.replace(/\D/g, ''),
    resp1: {
      name: document.getElementById('resp1Name').value,
      phone: document.getElementById('resp1Phone').value.replace(/\D/g, '')
    },
    extraResponsibles
  };

  // Envia diretamente para o Firebase gerando uma chave única
  db.ref('students').push(newStudent)
    .then(() => {
      alert("Aluno cadastrado e salvo na nuvem com sucesso!");
      document.getElementById('studentForm').reset();
      const extraContainer = document.getElementById('extraResponsiblesContainer');
      if (extraContainer) extraContainer.innerHTML = '';
      extraRespCount = 0;

      const btnAddResp = document.getElementById('btnAddResp');
      if (btnAddResp) btnAddResp.style.display = 'inline-block';

      const classroomSelect = document.getElementById('stuClassroom');
      if (classroomSelect) {
        classroomSelect.disabled = true;
        classroomSelect.innerHTML = '<option value="">Selecione primeiro o Ano...</option>';
      }

      togglePhotoInput();
      switchTab('turmas');
    })
    .catch((error) => {
      alert("Erro ao salvar no banco de dados: " + error.message);
    });
}

function deleteStudent(firebaseId) {
  if (currentUser.role === 'sec') {
    alert("Secretários não têm permissão para excluir registros.");
    return;
  }

  if (confirm("Tem certeza que deseja excluir este aluno da nuvem?")) {
    db.ref(`students/${firebaseId}`).remove()
      .then(() => {
        alert("Registo excluído com sucesso!");
      })
      .catch((error) => {
        alert("Erro ao excluir: " + error.message);
      });
  }
}

// Funções de Edição
function abrirModalEdicao(firebaseId) {
  const student = students.find(s => s.firebaseId === firebaseId);
  if (!student) return;

  document.getElementById('editStuId').value = student.firebaseId;
  document.getElementById('editStuName').value = student.name || '';
  document.getElementById('editStuGrade').value = student.grade || '1º Ano';
  updateEditClassroomOptions();
  document.getElementById('editStuClassroom').value = student.classroom || '';
  
  document.getElementById('editStuStreet').value = student.address?.street || '';
  document.getElementById('editStuNumber').value = student.address?.number || '';
  document.getElementById('editStuNeighborhood').value = student.address?.neighborhood || '';
  document.getElementById('editStuCity').value = student.address?.city || '';
  document.getElementById('editStuPhone').value = student.phone || '';

  document.getElementById('editResp1Name').value = student.resp1?.name || '';
  document.getElementById('editResp1Phone').value = student.resp1?.phone || '';

  document.getElementById('editModal').style.display = 'flex';
}

function fecharModalEdicao() {
  document.getElementById('editModal').style.display = 'none';
}

function updateEditClassroomOptions() {
  const gradeSelect = document.getElementById('editStuGrade');
  const classroomSelect = document.getElementById('editStuClassroom');
  if (!gradeSelect || !classroomSelect) return;

  const selectedGrade = gradeSelect.value;
  classroomSelect.innerHTML = '';

  if (classroomOptionsMap[selectedGrade]) {
    classroomOptionsMap[selectedGrade].forEach(turma => {
      const option = document.createElement('option');
      option.value = turma;
      option.innerText = turma;
      classroomSelect.appendChild(option);
    });
  }
}

function handleSalvarEdicao(e) {
  e.preventDefault();
  const firebaseId = document.getElementById('editStuId').value;

  const updatedData = {
    name: document.getElementById('editStuName').value,
    grade: document.getElementById('editStuGrade').value,
    classroom: document.getElementById('editStuClassroom').value,
    phone: document.getElementById('editStuPhone').value.replace(/\D/g, ''),
    address: {
      street: document.getElementById('editStuStreet').value,
      number: document.getElementById('editStuNumber').value,
      neighborhood: document.getElementById('editStuNeighborhood'].value,
      city: document.getElementById('editStuCity').value
    },
    resp1: {
      name: document.getElementById('editResp1Name').value,
      phone: document.getElementById('editResp1Phone').value.replace(/\D/g, '')
    }
  };

  db.ref(`students/${firebaseId}`).update(updatedData)
    .then(() => {
      fecharModalEdicao();
      alert("Dados atualizados na nuvem com sucesso!");
    })
    .catch((error) => {
      alert("Erro ao atualizar: " + error.message);
    });
}

// ==========================================
// 4. RENDERIZAÇÃO
// ==========================================

function renderStudents() {
  const list = document.getElementById('studentsList');
  if (!list) return;

  const globalSearchInput = document.getElementById('searchInput');
  const globalQuery = globalSearchInput ? globalSearchInput.value.toLowerCase().trim() : '';

  list.innerHTML = '';

  if (students.length === 0) {
    list.innerHTML = '<p style="color: #64748b; padding: 20px;">Nenhum aluno cadastrado no momento.</p>';
    return;
  }

  const groups = {};
  students.forEach(s => {
    const groupKey = (s.grade && s.classroom) ? `${s.grade} - Turma ${s.classroom}` : 'Sem Turma / Não Informado';
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(s);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const gradeA = gradeOrder.findIndex(g => a.startsWith(g));
    const gradeB = gradeOrder.findIndex(g => b.startsWith(g));
    if (gradeA !== -1 && gradeB !== -1 && gradeA !== gradeB) {
      return gradeA - gradeB;
    }
    return a.localeCompare(b);
  });

  const visibleKeys = sortedKeys.filter(groupName => {
    if (!globalQuery) return true;
    if (groupName.toLowerCase().includes(globalQuery)) return true;
    return groups[groupName].some(s => s.name && s.name.toLowerCase().includes(globalQuery));
  });

  if (visibleKeys.length === 0) {
    list.innerHTML = `<p style="color: #64748b; padding: 20px;">Nenhuma turma encontrada para "${globalQuery}".</p>`;
    return;
  }

  visibleKeys.forEach(groupName => {
    const folderId = `folder_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const studentsInGroup = groups[groupName];

    const folderContainer = document.createElement('div');
    folderContainer.style.background = '#f8fafc';
    folderContainer.style.border = '1px solid #cbd5e1';
    folderContainer.style.borderRadius = '8px';
    folderContainer.style.marginBottom = '16px';
    folderContainer.style.overflow = 'hidden';

    const folderHeader = document.createElement('div');
    folderHeader.style.background = '#1e3a8a';
    folderHeader.style.color = '#ffffff';
    folderHeader.style.padding = '12px 16px';
    folderHeader.style.fontSize = '16px';
    folderHeader.style.fontWeight = 'bold';
    folderHeader.style.display = 'flex';
    folderHeader.style.justifyContent = 'space-between';
    folderHeader.style.alignItems = 'center';
    folderHeader.style.cursor = 'pointer';
    folderHeader.innerHTML = `
      <span>📁 Turma: ${groupName}</span>
      <div style="display: flex; gap: 10px; align-items: center;">
        <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px; font-size: 12px;">
          ${studentsInGroup.length} aluno(s)
        </span>
        <span id="${folderId}_icon" style="font-size: 14px;">▼</span>
      </div>
    `;

    const folderBody = document.createElement('div');
    folderBody.id = `${folderId}_body`;
    folderBody.style.padding = '16px';
    folderBody.style.display = 'none';

    folderHeader.onclick = () => {
      const isClosed = folderBody.style.display === 'none';
      folderBody.style.display = isClosed ? 'block' : 'none';
      document.getElementById(`${folderId}_icon`).innerText = isClosed ? '▲' : '▼';
    };

    const searchContainer = document.createElement('div');
    searchContainer.style.marginBottom = '16px';
    searchContainer.innerHTML = `
      <input type="text" id="${folderId}_search" placeholder="🔍 Pesquisar aluno nesta turma..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;">
    `;
    folderBody.appendChild(searchContainer);

    const cardsContainer = document.createElement('div');
    folderBody.appendChild(cardsContainer);

    const renderFolderCards = (filterText = '') => {
      cardsContainer.innerHTML = '';
      const queryLower = filterText.toLowerCase().trim();

      const filteredStudentsInGroup = studentsInGroup.filter(s => {
        if (!queryLower) return true;
        return (s.name && s.name.toLowerCase().includes(queryLower)) || 
               (s.phone && s.phone.includes(queryLower));
      });

      if (filteredStudentsInGroup.length === 0) {
        cardsContainer.innerHTML = '<p style="color: #64748b; font-size: 14px;">Nenhum aluno encontrado com esse termo nesta turma.</p>';
        return;
      }

      filteredStudentsInGroup.forEach(s => {
        let extraHtml = '';
        if (s.extraResponsibles) {
          s.extraResponsibles.forEach((r, idx) => {
            if (r.name) {
              extraHtml += `
                <div style="margin-top: 8px;">
                  <p><strong>Resp. Extra ${idx + 1}:</strong> ${r.name}</p>
                  <div class="actions-group">
                    <a href="${getWaLink(r.phone)}" target="_blank" class="action-link link-wa">WhatsApp</a>
                    <a href="tel:${r.phone}" class="action-link link-call">Ligar (${r.phone})</a>
                  </div>
                </div>
              `;
            }
          });
        }

        const addressDisplay = (s.address && typeof s.address === 'object')
          ? `${s.address.street}, Nº ${s.address.number} - ${s.address.neighborhood}, ${s.address.city}`
          : (s.address || 'Não informado');

        const referenceDisplay = (s.address && typeof s.address === 'object' && s.address.reference)
          ? `<p><strong>Ponto de Ref.:</strong> ${s.address.reference}</p>`
          : '';

        let adminButtonsHtml = `<div style="display: flex; gap: 5px; flex-direction: column;">`;
        adminButtonsHtml += `<button class="btn" style="padding: 6px 12px; font-size: 0.85rem; background-color: #0284c7;" onclick="abrirModalEdicao('${s.firebaseId}')">Editar</button>`;
        
        if (currentUser && currentUser.role !== 'sec') {
          adminButtonsHtml += `<button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.85rem;" onclick="deleteStudent('${s.firebaseId}')">Excluir</button>`;
        }
        adminButtonsHtml += `</div>`;

        const card = document.createElement('div');
        card.className = 'student-card';
        card.style.marginBottom = '12px';
        card.style.background = '#ffffff';
        card.innerHTML = `
          <img src="${s.photo}" class="student-avatar" alt="Foto" onerror="this.onerror=null;this.src='https://via.placeholder.com/80?text=Erro+Foto';">
          <div class="student-info">
            <h3>${s.name}</h3>
            <p><strong>Endereço:</strong> ${addressDisplay}</p>
            ${referenceDisplay}
            
            ${s.phone ? `
              <p><strong>Tel. Aluno:</strong> ${s.phone}</p>
              <div class="actions-group">
                <a href="${getWaLink(s.phone)}" target="_blank" class="action-link link-wa">WhatsApp Aluno</a>
                <a href="tel:${s.phone}" class="action-link link-call">Ligar</a>
              </div>
            ` : ''}

            <hr style="margin: 8px 0;">
            <p><strong>Responsável Direto:</strong> ${s.resp1 ? s.resp1.name : ''}</p>
            <div class="actions-group">
              <a href="${getWaLink(s.resp1 ? s.resp1.phone : '')}" target="_blank" class="action-link link-wa">WhatsApp Resp.</a>
              <a href="tel:${s.resp1 ? s.resp1.phone : ''}" class="action-link link-call">Ligar (${s.resp1 ? s.resp1.phone : ''})</a>
            </div>

            ${extraHtml}
          </div>
          ${adminButtonsHtml}
        `;

        cardsContainer.appendChild(card);
      });
    };

    renderFolderCards();

    setTimeout(() => {
      const internalSearchInput = document.getElementById(`${folderId}_search`);
      if (internalSearchInput) {
        internalSearchInput.oninput = (e) => {
          renderFolderCards(e.target.value);
        };
      }
    }, 100);

    folderContainer.appendChild(folderHeader);
    folderContainer.appendChild(folderBody);
    list.appendChild(folderContainer);
  });
}

function salvarAtualizacaoCodigo() {
  const editorContent = document.getElementById('code-editor').value;
  if (editorContent.trim() !== '') {
    whatsappAutoMessage = editorContent.trim();
    alert("Mensagem padrão do WhatsApp atualizada com sucesso!");
  } else {
    alert("O campo de texto não pode estar vazio.");
  }
}
