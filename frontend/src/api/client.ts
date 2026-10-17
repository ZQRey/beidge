import type {
  Department,
  Employee,
  Badge,
  BadgePreviewRequest,
  BatchPrintRequest,
  BatchImportResult,
  BatchBadgeCreateRequest,
  BatchBadgeCreateResponse,
  BatchSubmitToGlpiResponse
} from '../types';

const API_BASE = '/api';

export const api = {
  // Departments
  async getDepartments(): Promise<Department[]> {
    const res = await fetch(`${API_BASE}/departments`);
    if (!res.ok) throw new Error('Не удалось загрузить отделения');
    return res.json();
  },

  async createDepartment(name: string): Promise<Department> {
    const res = await fetch(`${API_BASE}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Ошибка создания отделения');
    return res.json();
  },

  // Employees
  async getEmployees(params?: { search?: string; department_id?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.department_id) q.append('department_id', params.department_id);
    if (params?.page) q.append('page', params.page.toString());
    if (params?.limit) q.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/employees?${q.toString()}`);
    if (!res.ok) throw new Error('Не удалось загрузить сотрудников');
    return res.json() as Promise<{
      items: Employee[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>;
  },

  async createEmployee(data: { full_name: string; position: string; department_name?: string }) {
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка создания сотрудника');
    return res.json() as Promise<Employee>;
  },

  async updateEmployee(id: string, data: { full_name?: string; position?: string; department_name?: string }) {
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка обновления сотрудника');
    return res.json() as Promise<Employee>;
  },

  async deleteEmployee(id: string) {
    const res = await fetch(`${API_BASE}/employees/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка удаления сотрудника');
    return res.json();
  },

  // Badges
  async getBadges(params?: { search?: string; department_id?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.department_id) q.append('department_id', params.department_id);
    if (params?.page) q.append('page', params.page.toString());
    if (params?.limit) q.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/badges?${q.toString()}`);
    if (!res.ok) throw new Error('Не удалось загрузить бейджи');
    return res.json() as Promise<{
      items: Badge[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>;
  },

  async uploadBackground(file: File): Promise<{ url: string; filename: string; path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/badges/upload-background`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка загрузки фонового изображения');
    }
    return res.json();
  },

  async createBadge(data: {
    full_name: string;
    position: string;
    department_name?: string;
    employee_id?: string;
    background_image?: string;
    layout_config?: any;
    safety_codes?: any;
  }) {
    const res = await fetch(`${API_BASE}/badges/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка генерации бейджа');
    return res.json() as Promise<Badge>;
  },

  async deleteBadge(id: string) {
    const res = await fetch(`${API_BASE}/badges/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка удаления бейджа');
    return res.json();
  },

  async getPreview(data: BadgePreviewRequest): Promise<{ side: string; html: string }> {
    const res = await fetch(`${API_BASE}/badges/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка получения предпросмотра');
    return res.json();
  },

  async downloadBadgePdf(badgeId: string, filename = 'badge.pdf') {
    const res = await fetch(`${API_BASE}/badges/${badgeId}/download`);
    if (!res.ok) throw new Error('Ошибка скачивания бейджа');
    const rawBlob = await res.blob();
    // Explicitly enforce application/pdf MIME type
    const blob = new Blob([rawBlob], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Ensure .pdf extension is always present
    let finalName = filename || 'badge.pdf';
    if (!finalName.toLowerCase().endsWith('.pdf')) {
      finalName += '.pdf';
    }
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Delay revoking URL so browser has time to finish saving the file
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 30000);
  },

  async printBatchSheet(req: BatchPrintRequest) {
    const res = await fetch(`${API_BASE}/badges/print-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('Ошибка формирования листа А4');
    const rawBlob = await res.blob();
    const blob = new Blob([rawBlob], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hospital_badges_sheet_A4.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 30000);
  },

  async importCsv(file: File): Promise<BatchImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/employees/import-csv`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка импорта файла');
    }
    return res.json();
  },

  async submitToGlpi(data: {
    full_name: string;
    position: string;
    department_name?: string;
    employee_id?: string;
    background_image?: string;
    layout_config?: any;
    safety_codes?: any;
  }): Promise<{
    success: boolean;
    ticket_id: number;
    ticket_url: string;
    requester?: string;
    machine?: string;
    room?: string;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/badges/submit-to-glpi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка отправки заявки в GLPI');
    }
    return res.json();
  },

  async createBatchBadges(data: BatchBadgeCreateRequest): Promise<BatchBadgeCreateResponse> {
    const res = await fetch(`${API_BASE}/badges/create-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка генерации пакета бейджей');
    }
    return res.json();
  },

  async downloadBatchSheet(batchId: string, filename = 'hospital_badges_sheet_A4.pdf') {
    const res = await fetch(`${API_BASE}/badges/batch/${batchId}/download`);
    if (!res.ok) throw new Error('Ошибка скачивания листа бейджей');
    const rawBlob = await res.blob();
    const blob = new Blob([rawBlob], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    let finalName = filename || 'hospital_badges_sheet_A4.pdf';
    if (!finalName.toLowerCase().endsWith('.pdf')) {
      finalName += '.pdf';
    }
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 30000);
  },

  async submitBatchToGlpi(data: BatchBadgeCreateRequest): Promise<BatchSubmitToGlpiResponse> {
    const res = await fetch(`${API_BASE}/badges/submit-batch-to-glpi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка отправки групповой заявки в GLPI');
    }
    return res.json();
  },

  // Auth & SSO
  async getCurrentUser(): Promise<{
    sso_enabled: boolean;
    authenticated: boolean;
    username: string;
    full_name: string;
    machine_name: string;
    room?: string;
    ip: string;
    department?: string;
    position?: string;
    is_domain_admin?: boolean;
    is_local_admin?: boolean;
    can_edit_design?: boolean;
  }> {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/auth/current-user`, { headers });
    if (!res.ok) throw new Error('Не удалось получить данные пользователя');
    return res.json();
  },

  // Local Admin API
  async adminLogin(username: string, password: string): Promise<{ success: boolean; token: string; username: string }> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Неверный логин или пароль');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('admin_token', data.token);
    }
    return data;
  },

  async adminLogout(): Promise<{ success: boolean }> {
    localStorage.removeItem('admin_token');
    const res = await fetch(`${API_BASE}/admin/logout`, { method: 'POST' });
    return res.json();
  },

  async adminMe(): Promise<{ authenticated: boolean; username: string }> {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/me`, { headers });
    if (!res.ok) throw new Error('Не авторизован');
    return res.json();
  },

  async adminChangePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/change-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка смены пароля');
    }
    return res.json();
  },

  async getAdminSettings(): Promise<{
    sso_enabled: boolean;
    ldap: any;
    glpi: any;
  }> {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/settings`, { headers });
    if (!res.ok) throw new Error('Ошибка загрузки настроек');
    return res.json();
  },

  async updateAdminSettings(settings: any): Promise<{ success: boolean; message: string }> {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка сохранения настроек');
    }
    return res.json();
  },

  async testLdap(ldapConfig: any): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/test-ldap`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ldapConfig),
    });
    return res.json();
  },

  async testGlpi(glpiConfig: any): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/test-glpi`, {
      method: 'POST',
      headers,
      body: JSON.stringify(glpiConfig),
    });
    return res.json();
  },

  downloadTemplate() {
    window.open(`${API_BASE}/employees/export-template`, '_blank');
  }
};

