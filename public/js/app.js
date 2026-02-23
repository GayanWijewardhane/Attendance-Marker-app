// ============ STATE ============
let records = [];
let lastSyncData = null;
let viewYear, viewMonth; // for month navigation

const SYNC_INTERVAL = 5000;
const API = '/api/tasks';

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('attendance_token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth(); // 0-indexed
  document.getElementById('attDate').valueAsDate = now;

  updateMonthLabel();
  loadRecords();
  startAutoSync();
});

// ============ MONTH NAVIGATION ============
function prevMonth() {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  updateMonthLabel();
  loadRecords();
}

function nextMonth() {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  updateMonthLabel();
  loadRecords();
}

function updateMonthLabel() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('currentMonth').textContent = `${months[viewMonth]} ${viewYear}`;
}

// ============ API ============
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('attendance_token');
  if (!options.headers) options.headers = {};
  options.headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('attendance_token');
    localStorage.removeItem('attendance_user');
    window.location.href = '/login.html';
  }
  return res;
}
async function loadRecords() {
  try {
    const filterStatus = document.getElementById('filterStatus').value;
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);

    const url = params.toString() ? `${API}?${params}` : API;
    const res = await authFetch(url);
    const allRecords = await res.json();

    // Filter to current month/year
    records = allRecords.filter(r => {
      const d = new Date(r.date + 'T00:00:00');
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });

    renderTable();
    renderCards();
    renderStats();
    setSyncStatus('Synced');
  } catch (err) {
    console.error('Load failed:', err);
    setSyncStatus('Offline');
  }
}

async function createRecord(data) {
  const res = await authFetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
  return res.json();
}

async function updateRecord(id, data) {
  const res = await authFetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
  return res.json();
}

async function deleteRecord(id) {
  if (!confirm('Delete this attendance record?')) return;
  await authFetch(`${API}/${id}`, { method: 'DELETE' });
  loadRecords();
}

// ============ FORM ============
let selectedStatus = '';

function selectStatus(status) {
  selectedStatus = status;
  document.getElementById('attStatus').value = status;

  // Toggle active class
  document.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn' + status).classList.add('active');
}

async function handleSubmit(e) {
  e.preventDefault();

  if (!selectedStatus) {
    alert('Please select attendance status: Present, Absent, or Holiday');
    return;
  }

  const data = {
    date: document.getElementById('attDate').value,
    task: document.getElementById('attTask').value.trim(),
    assigned_by: document.getElementById('attAssignedBy').value.trim(),
    status: selectedStatus,
    notes: document.getElementById('attNotes').value.trim()
  };

  if (!data.date || !data.task || !data.assigned_by) {
    alert('Please fill all mandatory fields: Date, Tasks, Assigned By, and Status');
    return;
  }

  const editId = document.getElementById('editId').value;

  try {
    if (editId) {
      await updateRecord(editId, data);
    } else {
      await createRecord(data);
    }
    resetForm();
    loadRecords();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function editRecord(id) {
  const rec = records.find(r => r.id === id);
  if (!rec) return;

  document.getElementById('editId').value = rec.id;
  document.getElementById('attDate').value = rec.date;
  document.getElementById('attTask').value = rec.task;
  document.getElementById('attAssignedBy').value = rec.assigned_by;
  document.getElementById('attNotes').value = rec.notes || '';
  selectStatus(rec.status);

  document.getElementById('formTitle').textContent = 'Edit Attendance';
  document.getElementById('submitBtn').textContent = 'Update Record';
  document.getElementById('cancelBtn').style.display = 'inline-block';

  document.querySelector('.mark-section').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  resetForm();
}

function resetForm() {
  document.getElementById('attendanceForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('attDate').valueAsDate = new Date();
  document.getElementById('attStatus').value = '';
  selectedStatus = '';
  document.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById('formTitle').textContent = 'Mark Attendance';
  document.getElementById('submitBtn').textContent = 'Mark Attendance';
  document.getElementById('cancelBtn').style.display = 'none';
}

// ============ RENDER ============
function renderStats() {
  const present = records.filter(r => r.status === 'Present').length;
  const absent = records.filter(r => r.status === 'Absent').length;
  const holiday = records.filter(r => r.status === 'Holiday').length;

  document.getElementById('presentCount').textContent = present;
  document.getElementById('absentCount').textContent = absent;
  document.getElementById('holidayCount').textContent = holiday;
  document.getElementById('totalDays').textContent = records.length;
}

function renderTable() {
  const tbody = document.getElementById('recordsBody');

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">No records for this month. Mark your attendance above.</td></tr>';
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td><strong>${formatDate(r.date)}</strong></td>
      <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
      <td>${esc(r.task)}</td>
      <td>${esc(r.assigned_by)}</td>
      <td>${esc(r.notes || '-')}</td>
      <td>
        <div class="action-btns">
          <button class="btn-sm btn-edit" onclick="editRecord('${r.id}')">Edit</button>
          <button class="btn-sm btn-del" onclick="deleteRecord('${r.id}')">Del</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCards() {
  const wrap = document.getElementById('cardsWrap');

  if (records.length === 0) {
    wrap.innerHTML = '<div class="att-card"><p class="empty-msg">No records for this month.</p></div>';
    return;
  }

  wrap.innerHTML = records.map(r => `
    <div class="att-card status-${r.status.toLowerCase()}">
      <div class="card-top">
        <span class="card-date">${formatDate(r.date)}</span>
        <span class="badge badge-${r.status.toLowerCase()}">${r.status}</span>
      </div>
      <div class="card-task">${esc(r.task)}</div>
      <div class="card-meta">Assigned by: ${esc(r.assigned_by)}</div>
      ${r.notes ? `<div class="card-notes">${esc(r.notes)}</div>` : ''}
      <div class="card-actions">
        <button class="btn-sm btn-edit" onclick="editRecord('${r.id}')">Edit</button>
        <button class="btn-sm btn-del" onclick="deleteRecord('${r.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// ============ AUTO SYNC ============
function startAutoSync() {
  setInterval(async () => {
    try {
      const res = await authFetch('/api/sync');
      if (!res.ok) return;
      const data = await res.json();

      if (!lastSyncData ||
        lastSyncData.last_update !== data.last_update ||
        lastSyncData.total !== data.total) {
        lastSyncData = data;
        loadRecords();
      }
      setSyncStatus('Synced');
    } catch {
      setSyncStatus('Offline');
    }
  }, SYNC_INTERVAL);
}

function setSyncStatus(status) {
  const el = document.getElementById('syncStatus');
  el.textContent = status;
  el.className = 'sync-status';
  if (status === 'Offline') el.classList.add('offline');
}

// ============ HELPERS ============
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// ============ UTILS ============
function logout() {
  localStorage.removeItem('attendance_token');
  localStorage.removeItem('attendance_user');
  window.location.href = '/login.html';
}

function downloadCSV() {
  if (records.length === 0) {
    alert('No records to download for this month.');
    return;
  }

  const headers = ['Date', 'Status', 'Tasks', 'Assigned By', 'Notes'];
  const rows = records.map(r => [
    r.date, r.status, `"${r.task.replace(/"/g, '""')}"`, `"${r.assigned_by.replace(/"/g, '""')}"`, `"${r.notes.replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Attendance_Report_${viewYear}_${viewMonth + 1}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
