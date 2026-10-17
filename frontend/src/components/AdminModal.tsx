import React, { useState, useEffect } from 'react';
import { X, Lock, Shield, Server, Key, CheckCircle, AlertCircle, RefreshCw, LogOut, Check } from 'lucide-react';
import { api } from '../api/client';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, onSettingsUpdated }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'ldap' | 'glpi' | 'security'>('ldap');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Settings state
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [ldapHost, setLdapHost] = useState('dc01.gp1.loc');
  const [ldapPort, setLdapPort] = useState(636);
  const [ldapUseSsl, setLdapUseSsl] = useState(true);
  const [ldapDomain, setLdapDomain] = useState('gp1.loc');
  const [ldapBaseDn, setLdapBaseDn] = useState('DC=gp1,DC=loc');
  const [ldapBindUser, setLdapBindUser] = useState('litlehelper@gp1.loc');
  const [ldapBindPassword, setLdapBindPassword] = useState('');
  const [ldapHasPassword, setLdapHasPassword] = useState(false);

  const [glpiBaseUrl, setGlpiBaseUrl] = useState('https://glpi.gp1.loc/apirest.php');
  const [glpiWebUrl, setGlpiWebUrl] = useState('https://glpi.gp1.loc');
  const [glpiAppToken, setGlpiAppToken] = useState('kM9xT2qL8wV5yZ1pB7nR4sA3dE6fH0jC');
  const [glpiUserToken, setGlpiUserToken] = useState('aa21379b71949f2e2735cf966b22a67fd81aae12');
  const [glpiServiceUserId, setGlpiServiceUserId] = useState(10);

  // Status indicators
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const [testLdapLoading, setTestLdapLoading] = useState(false);
  const [testLdapResult, setTestLdapResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testGlpiLoading, setTestGlpiLoading] = useState(false);
  const [testGlpiResult, setTestGlpiResult] = useState<{ success: boolean; message: string } | null>(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdResult, setPwdResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check existing session
  useEffect(() => {
    if (isOpen) {
      checkAdminSession();
    }
  }, [isOpen]);

  const checkAdminSession = async () => {
    try {
      await api.adminMe();
      setIsAdmin(true);
      loadSettings();
    } catch {
      setIsAdmin(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.getAdminSettings();
      setSsoEnabled(data.sso_enabled);
      if (data.ldap) {
        setLdapHost(data.ldap.host || 'dc01.gp1.loc');
        setLdapPort(data.ldap.port || 636);
        setLdapUseSsl(data.ldap.use_ssl !== false);
        setLdapDomain(data.ldap.domain || 'gp1.loc');
        setLdapBaseDn(data.ldap.base_dn || 'DC=gp1,DC=loc');
        setLdapBindUser(data.ldap.bind_user || 'litlehelper@gp1.loc');
        setLdapHasPassword(!!data.ldap.has_password);
        setLdapBindPassword(data.ldap.bind_password || '');
      }
      if (data.glpi) {
        setGlpiBaseUrl(data.glpi.base_url || 'https://glpi.gp1.loc/apirest.php');
        setGlpiWebUrl(data.glpi.web_url || 'https://glpi.gp1.loc');
        setGlpiAppToken(data.glpi.app_token || '');
        setGlpiUserToken(data.glpi.user_token || '');
        setGlpiServiceUserId(data.glpi.service_user_id || 10);
      }
    } catch (e: any) {
      setSaveError(e.message || 'Ошибка загрузки настроек');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await api.adminLogin(loginUsername, loginPassword);
      setIsAdmin(true);
      setLoginPassword('');
      loadSettings();
    } catch (err: any) {
      setLoginError(err.message || 'Неверный логин или пароль');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.adminLogout();
    setIsAdmin(false);
  };

  const handleSaveSettings = async () => {
    setSaveLoading(true);
    setSaveSuccess('');
    setSaveError('');
    try {
      const payload = {
        sso_enabled: ssoEnabled,
        ldap: {
          host: ldapHost,
          port: Number(ldapPort),
          use_ssl: ldapUseSsl,
          domain: ldapDomain,
          base_dn: ldapBaseDn,
          bind_user: ldapBindUser,
          bind_password: ldapBindPassword,
        },
        glpi: {
          base_url: glpiBaseUrl,
          web_url: glpiWebUrl,
          app_token: glpiAppToken,
          user_token: glpiUserToken,
          service_user_id: Number(glpiServiceUserId),
        },
      };
      await api.updateAdminSettings(payload);
      setSaveSuccess('Настройки успешно сохранены!');
      onSettingsUpdated?.();
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (e: any) {
      setSaveError(e.message || 'Ошибка сохранения настроек');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTestLdap = async () => {
    setTestLdapLoading(true);
    setTestLdapResult(null);
    try {
      const res = await api.testLdap({
        host: ldapHost,
        port: Number(ldapPort),
        use_ssl: ldapUseSsl,
        domain: ldapDomain,
        base_dn: ldapBaseDn,
        bind_user: ldapBindUser,
        bind_password: ldapBindPassword,
      });
      if (res.success) {
        setTestLdapResult({ success: true, message: res.message || 'Подключение успешно установлено!' });
      } else {
        setTestLdapResult({ success: false, message: res.error || 'Ошибка подключения' });
      }
    } catch (e: any) {
      setTestLdapResult({ success: false, message: e.message || 'Ошибка соединения' });
    } finally {
      setTestLdapLoading(false);
    }
  };

  const handleTestGlpi = async () => {
    setTestGlpiLoading(true);
    setTestGlpiResult(null);
    try {
      const res = await api.testGlpi({
        base_url: glpiBaseUrl,
        web_url: glpiWebUrl,
        app_token: glpiAppToken,
        user_token: glpiUserToken,
        service_user_id: Number(glpiServiceUserId),
      });
      if (res.success) {
        setTestGlpiResult({ success: true, message: res.message || 'Подключение к GLPI API успешно!' });
      } else {
        setTestGlpiResult({ success: false, message: res.error || 'Ошибка подключения к GLPI' });
      }
    } catch (e: any) {
      setTestGlpiResult({ success: false, message: e.message || 'Ошибка соединения' });
    } finally {
      setTestGlpiLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdResult({ success: false, message: 'Пароли не совпадают' });
      return;
    }
    setPwdLoading(true);
    setPwdResult(null);
    try {
      const res = await api.adminChangePassword(currentPassword, newPassword);
      setPwdResult({ success: true, message: res.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdResult({ success: false, message: err.message || 'Ошибка смены пароля' });
    } finally {
      setPwdLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Администрирование системы</h2>
              <p className="text-xs text-slate-500">Управление интеграцией с Active Directory, LDAP и GLPI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {!isAdmin ? (
          /* Login Screen */
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-600 mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Вход локального администратора</h3>
              <p className="text-xs text-slate-500">Введите учетные данные для доступа к настройкам</p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Имя пользователя</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Пароль</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loginLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {loginLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Войти</span>
              </button>
            </div>
          </form>
        ) : (
          /* Authenticated Admin Panel */
          <div>
            {/* Tabs & Logout */}
            <div className="px-6 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('ldap')}
                  className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'ldap'
                      ? 'border-emerald-600 text-emerald-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Server className="w-4 h-4" />
                  <span>LDAP / Active Directory</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('glpi')}
                  className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'glpi'
                      ? 'border-emerald-600 text-emerald-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  <span>Интеграция с GLPI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'security'
                      ? 'border-emerald-600 text-emerald-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Безопасность</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="text-xs font-semibold text-slate-400 hover:text-red-600 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-red-50 transition cursor-pointer"
                title="Выйти из режима администратора"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Выйти</span>
              </button>
            </div>

            {/* Notification messages */}
            <div className="px-6 pt-4">
              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{saveSuccess}</span>
                </div>
              )}
              {saveError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}
            </div>

            {/* Tab 1: LDAP & SSO */}
            {activeTab === 'ldap' && (
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* SSO Toggle Box */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Сквозная авторизация доменных пользователей (SSO)</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Автоматически определять имя, ФИО и ПК пользователя при открытии сайта через браузер
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ssoEnabled}
                      onChange={(e) => setSsoEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Сервер LDAP / Доменконтроллер</label>
                    <input
                      type="text"
                      value={ldapHost}
                      onChange={(e) => setLdapHost(e.target.value)}
                      placeholder="dc01.gp1.loc"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Порт</label>
                    <input
                      type="number"
                      value={ldapPort}
                      onChange={(e) => setLdapPort(Number(e.target.value))}
                      placeholder="636"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="ldapSsl"
                    checked={ldapUseSsl}
                    onChange={(e) => setLdapUseSsl(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <label htmlFor="ldapSsl" className="text-xs text-slate-700 font-medium cursor-pointer">
                    Использовать защищённое соединение SSL/TLS (LDAPS порт 636)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Домен Active Directory</label>
                    <input
                      type="text"
                      value={ldapDomain}
                      onChange={(e) => setLdapDomain(e.target.value)}
                      placeholder="gp1.loc"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Базовый DN (Base DN)</label>
                    <input
                      type="text"
                      value={ldapBaseDn}
                      onChange={(e) => setLdapBaseDn(e.target.value)}
                      placeholder="DC=gp1,DC=loc"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Служебный пользователь (Bind User)</label>
                    <input
                      type="text"
                      value={ldapBindUser}
                      onChange={(e) => setLdapBindUser(e.target.value)}
                      placeholder="litlehelper@gp1.loc"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Пароль служебного пользователя {ldapHasPassword && <span className="text-emerald-600 text-[10px] font-normal">(сохранён)</span>}
                    </label>
                    <input
                      type="password"
                      value={ldapBindPassword}
                      onChange={(e) => setLdapBindPassword(e.target.value)}
                      placeholder={ldapHasPassword ? '••••••••' : 'Введите пароль'}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* LDAP Test Status Box */}
                {testLdapResult && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testLdapResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {testLdapResult.success ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{testLdapResult.message}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleTestLdap}
                    disabled={testLdapLoading}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testLdapLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5 text-slate-500" />}
                    <span>Проверить подключение к LDAP</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={saveLoading}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                  >
                    {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Сохранить настройки</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: GLPI */}
            {activeTab === 'glpi' && (
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GLPI REST API URL</label>
                    <input
                      type="text"
                      value={glpiBaseUrl}
                      onChange={(e) => setGlpiBaseUrl(e.target.value)}
                      placeholder="https://glpi.gp1.loc/apirest.php"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GLPI Web URL</label>
                    <input
                      type="text"
                      value={glpiWebUrl}
                      onChange={(e) => setGlpiWebUrl(e.target.value)}
                      placeholder="https://glpi.gp1.loc"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">App-Token GLPI</label>
                    <input
                      type="text"
                      value={glpiAppToken}
                      onChange={(e) => setGlpiAppToken(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">User-Token GLPI</label>
                    <input
                      type="text"
                      value={glpiUserToken}
                      onChange={(e) => setGlpiUserToken(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fallback Service User ID</label>
                  <input
                    type="number"
                    value={glpiServiceUserId}
                    onChange={(e) => setGlpiServiceUserId(Number(e.target.value))}
                    className="w-32 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">ID заявителя в GLPI при невозможности распознать доменного пользователя (по умолчанию 10)</p>
                </div>

                {/* GLPI Test Status Box */}
                {testGlpiResult && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testGlpiResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {testGlpiResult.success ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{testGlpiResult.message}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleTestGlpi}
                    disabled={testGlpiLoading}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testGlpiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5 text-slate-500" />}
                    <span>Проверить подключение к GLPI</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={saveLoading}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                  >
                    {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Сохранить настройки</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Security */}
            {activeTab === 'security' && (
              <form onSubmit={handleChangePassword} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-800">Смена пароля локального администратора</h4>
                  <p className="text-[11px] text-slate-500">Учетная запись 'admin' используется для доступа к панели настроек</p>
                </div>

                {pwdResult && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    pwdResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {pwdResult.success ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{pwdResult.message}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Текущий пароль</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Новый пароль (не менее 6 символов)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Подтверждение нового пароля</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={pwdLoading}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                  >
                    {pwdLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Обновить пароль</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
