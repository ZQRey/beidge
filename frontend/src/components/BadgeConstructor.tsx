import React, { useState, useRef } from 'react';
import { BadgeVisual } from './BadgeVisual';
import type { Department, LayoutConfig, SafetyCodesConfig } from '../types';
import { api } from '../api/client';
import { useTranslation } from '../i18n';
import {
  Download,
  RotateCcw,
  Eye,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertCircle,
  User,
  Sliders,
  PhoneCall,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Send,
  ExternalLink,
  Lock,
  Shield,
} from 'lucide-react';

interface BadgeConstructorProps {
  departments: Department[];
  onBadgeCreated: () => void;
  canEditDesign?: boolean;
  onOpenAdmin?: () => void;
}

const KAZAKH_LETTERS = ['Ә', 'І', 'Ң', 'Ғ', 'Ү', 'Ұ', 'Қ', 'Ө', 'Һ'];

const PRESETS = [
  {
    name: 'Токтыбаева Аида Салходдиновна',
    position: 'врач акушер-гинеколог',
    department: 'Акушерское отделение'
  },
  {
    name: 'Гоцадзе Маргарита Викторовна',
    position: 'врач акушер-гинеколог',
    department: 'Гинекологическое отделение'
  },
  {
    name: 'Қасымов Нұрлан Бауыржанұлы',
    position: 'заведующий отделением',
    department: 'Хирургическое отделение'
  }
];

const DEFAULT_LAYOUT: LayoutConfig = {
  name_offset_x: 0,
  name_offset_y: 0,
  name_font_size: 13.0,
  name_line_height: 4.8,
  name_align: 'center',
  pos_offset_x: 0,
  pos_offset_y: 0,
  pos_font_size: 10.5,
  pos_line_height: 4.0,
  pos_align: 'center',
  dept_offset_x: 0,
  dept_offset_y: 0,
  dept_font_size: 7.2,
  show_department: true,
  show_divider: false,
};

const DEFAULT_SAFETY_CODES: SafetyCodesConfig = {
  white_phones: '8 (701) 961 77 26, 8 (707) 755 12 41, 8 (707) 755 12 38',
  white_extra: 'Охранная служба вн. связь - рация',
  red_phone: '8 (702) 584 99 94',
  red_extra: 'ТУШИТЬ - ЭВАКУИРОВАТЬ',
  blue_phone: '8 (7212) 98-24-49',
  blue_extra: 'Оценить состояние, активировать «Код Синий», кнопки реанимации',
  yellow_phone: '8 (702) 142 16 51',
  yellow_extra: 'Оценить ситуацию, активировать «Код Желтый»',
  black_phone: '8 (702) 769 44 90',
  black_extra: 'Сообщить старшему менеджеру безопасности (диспетчеру)',
};

export const BadgeConstructor: React.FC<BadgeConstructorProps> = ({
  departments,
  onBadgeCreated,
  canEditDesign = false,
  onOpenAdmin,
}) => {
  const { t } = useTranslation();

  const renderLockedNotice = () => (
    <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-6 text-center shadow-xs my-2">
      <div className="w-12 h-12 rounded-2xl bg-amber-100/90 border border-amber-200 flex items-center justify-center mx-auto mb-3.5 text-amber-700 shadow-xs">
        <Lock className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 mb-1.5">
        {t.constructor.designLockedTitle}
      </h4>
      <p className="text-xs text-slate-600 mb-5 max-w-sm mx-auto leading-relaxed">
        {t.constructor.designLockedDesc}
      </p>
      {onOpenAdmin && (
        <button
          type="button"
          onClick={onOpenAdmin}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Shield className="w-4 h-4" />
          <span>{t.constructor.loginAsAdmin}</span>
        </button>
      )}
    </div>
  );

  // Navigation tab for constructor
  const [activeTab, setActiveTab] = useState<'employee' | 'background' | 'layout' | 'safety'>('employee');

  // Employee details
  const [fullName, setFullName] = useState('Токтыбаева Аида Салходдиновна');
  const [position, setPosition] = useState('врач акушер-гинеколог');
  const [departmentName, setDepartmentName] = useState('Акушерское отделение');

  // Background state
  const [backgroundImage, setBackgroundImage] = useState<string>('/default_badge_bg.png');
  const [uploadingBg, setUploadingBg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Layout & positioning state
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT);

  // Safety codes state
  const [safetyCodes, setSafetyCodes] = useState<SafetyCodesConfig>(DEFAULT_SAFETY_CODES);

  // Visual preview state
  const [side, setSide] = useState<'front' | 'back' | 'folded'>('front');
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [glpiLoading, setGlpiLoading] = useState(false);
  const [glpiResult, setGlpiResult] = useState<{
    success: boolean;
    ticket_id: number;
    ticket_url: string;
    requester?: string;
    machine?: string;
    room?: string;
    message: string;
  } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeInputRef = useRef<'name' | 'position' | 'dept'>('name');

  const insertGlyph = (glyph: string) => {
    if (activeInputRef.current === 'name') {
      setFullName(prev => prev + glyph);
    } else if (activeInputRef.current === 'position') {
      setPosition(prev => prev + glyph);
    } else {
      setDepartmentName(prev => prev + glyph);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBg(true);
    setMessage(null);
    try {
      const res = await api.uploadBackground(file);
      setBackgroundImage(res.url);
      setMessage({ type: 'success', text: t.background.successUploaded });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t.common.error });
    } finally {
      setUploadingBg(false);
    }
  };

  const handleResetBackground = () => {
    setBackgroundImage('/default_badge_bg.png');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMessage({ type: 'success', text: t.background.resetDone });
  };

  const handleResetLayout = () => {
    setLayoutConfig(DEFAULT_LAYOUT);
    setMessage({ type: 'success', text: t.layout.resetDone });
  };

  const handleResetSafetyCodes = () => {
    setSafetyCodes(DEFAULT_SAFETY_CODES);
    setMessage({ type: 'success', text: t.safety.resetDone });
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !position.trim()) {
      setMessage({ type: 'error', text: t.constructor.errorFillRequired });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const badge = await api.createBadge({
        full_name: fullName.trim(),
        position: position.trim(),
        department_name: departmentName.trim() || undefined,
        background_image: backgroundImage !== '/default_badge_bg.png' ? backgroundImage : undefined,
        layout_config: layoutConfig,
        safety_codes: safetyCodes,
      });

      setMessage({ type: 'success', text: t.constructor.successCreated });
      // Trigger download
      await api.downloadBadgePdf(badge.id, `badge_${fullName.trim().replace(/\s+/g, '_')}.pdf`);
      onBadgeCreated();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t.common.error });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitToGlpi = async () => {
    if (!fullName.trim() || !position.trim()) {
      setMessage({ type: 'error', text: t.constructor.errorFillRequired });
      return;
    }

    setGlpiLoading(true);
    setMessage(null);
    setGlpiResult(null);
    try {
      const res = await api.submitToGlpi({
        full_name: fullName.trim(),
        position: position.trim(),
        department_name: departmentName.trim() || undefined,
        background_image: backgroundImage !== '/default_badge_bg.png' ? backgroundImage : undefined,
        layout_config: layoutConfig,
        safety_codes: safetyCodes,
      });

      setGlpiResult(res);
      setMessage({
        type: 'success',
        text: t.constructor.sendToGlpiSuccess.replace('{id}', String(res.ticket_id)),
      });
      onBadgeCreated();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t.common.error });
    } finally {
      setGlpiLoading(false);
    }
  };

  const handleReset = () => {
    setFullName('');
    setPosition('');
    setDepartmentName('');
    setMessage(null);
    setGlpiResult(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Form Controls Column (5 cols) */}
      <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-5 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('employee')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'employee' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {t.constructor.tabEmployee}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('background')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'background' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{t.constructor.tabBackground}</span>
            {!canEditDesign && <Lock className="w-3 h-3 text-amber-500 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'layout' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{t.constructor.tabLayout}</span>
            {!canEditDesign && <Lock className="w-3 h-3 text-amber-500 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('safety');
              setSide('back');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'safety' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>{t.constructor.tabSafety}</span>
            {!canEditDesign && <Lock className="w-3 h-3 text-amber-500 ml-0.5" />}
          </button>
        </div>

        {/* TAB 1: EMPLOYEE DATA */}
        {activeTab === 'employee' && (
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t.constructor.employeeTitle}</h3>
                <p className="text-xs text-slate-500">{t.constructor.employeeSubtitle}</p>
              </div>
              <button
                onClick={handleReset}
                type="button"
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t.common.clear}
              </button>
            </div>

            {/* Presets */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {t.constructor.presetsLabel}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFullName(p.name);
                      setPosition(p.position);
                      setDepartmentName(p.department);
                    }}
                    className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-lg border border-slate-200 hover:border-emerald-200 transition cursor-pointer"
                  >
                    {p.name.split(' ')[0]} ({p.position.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>

            {/* Kazakh Glyphs Bar */}
            <div className="mb-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 mb-1">
                {t.constructor.kazakhLettersLabel}
              </div>
              <div className="flex flex-wrap gap-1">
                {KAZAKH_LETTERS.map(glyph => (
                  <button
                    key={glyph}
                    type="button"
                    onClick={() => insertGlyph(glyph)}
                    className="w-7 h-7 flex items-center justify-center text-xs font-bold bg-white text-slate-800 hover:bg-emerald-700 hover:text-white rounded-md border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer"
                  >
                    {glyph}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.constructor.fullNameLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onFocus={() => (activeInputRef.current = 'name')}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={t.constructor.fullNamePlaceholder}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {t.constructor.fullNameHelp}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.constructor.positionLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={position}
                  onFocus={() => (activeInputRef.current = 'position')}
                  onChange={e => setPosition(e.target.value)}
                  placeholder={t.constructor.positionPlaceholder}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.constructor.departmentLabel}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="departments-list"
                    value={departmentName}
                    onFocus={() => (activeInputRef.current = 'dept')}
                    onChange={e => setDepartmentName(e.target.value)}
                    placeholder={t.constructor.departmentPlaceholder}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                  />
                  <datalist id="departments-list">
                    {departments.map(d => (
                      <option key={d.id} value={d.name} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BACKGROUND IMAGE */}
        {activeTab === 'background' && (
          !canEditDesign ? (
            renderLockedNotice()
          ) : (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t.background.title}</h3>
                  <p className="text-xs text-slate-500">{t.background.subtitle}</p>
                </div>
                <button
                  onClick={handleResetBackground}
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition cursor-pointer"
                  title={t.common.reset}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t.common.reset}
                </button>
              </div>

              {/* Current Background Preview */}
              <div className="mb-4">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {t.background.currentLabel}
                </div>
                <div className="relative w-full h-36 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                  <img
                    src={backgroundImage}
                    alt="Background preview"
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-xs font-mono">
                    {backgroundImage === '/default_badge_bg.png' ? t.background.originalHospital : t.background.customUploaded}
                  </span>
                </div>
              </div>

              {/* Upload form */}
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="badge-bg-file-input"
                />
                <label
                  htmlFor="badge-bg-file-input"
                  className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-300 rounded-xl text-emerald-800 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  {uploadingBg ? (
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-emerald-600" />
                      {t.background.uploadBtn}
                    </>
                  )}
                </label>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
                  <div className="font-semibold text-slate-700">{t.background.paramsTitle}</div>
                  <div>{t.background.paramFormat}</div>
                  <div>{t.background.paramAspect}</div>
                  <div>{t.background.paramDpi}</div>
                </div>

                {/* Show divider option */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-700">{t.background.dividerLabel}</div>
                    <div className="text-[11px] text-slate-400">{t.background.dividerHelp}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layoutConfig.show_divider}
                      onChange={e => setLayoutConfig(p => ({ ...p, show_divider: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )
        )}

        {/* TAB 3: TEXT POSITIONING & LAYOUT */}
        {activeTab === 'layout' && (
          !canEditDesign ? (
            renderLockedNotice()
          ) : (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t.layout.title}</h3>
                  <p className="text-xs text-slate-500">{t.layout.subtitle}</p>
                </div>
                <button
                  onClick={handleResetLayout}
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition cursor-pointer"
                  title={t.common.reset}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t.common.reset}
                </button>
              </div>

              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {/* ФИО Position */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>{t.layout.nameSection}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{t.layout.aboveDivider}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-slate-500 block mb-0.5">{t.layout.offsetX}</label>
                      <input
                        type="number"
                        step="0.5"
                        value={layoutConfig.name_offset_x}
                        onChange={e => setLayoutConfig(p => ({ ...p, name_offset_x: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-0.5">{t.layout.offsetY}</label>
                      <input
                        type="number"
                        step="0.5"
                        value={layoutConfig.name_offset_y}
                        onChange={e => setLayoutConfig(p => ({ ...p, name_offset_y: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-0.5">{t.layout.fontSize}</label>
                      <input
                        type="number"
                        step="0.5"
                        value={layoutConfig.name_font_size}
                        onChange={e => setLayoutConfig(p => ({ ...p, name_font_size: parseFloat(e.target.value) || 15.0 }))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-0.5">{t.layout.alignment}</label>
                      <select
                        value={layoutConfig.name_align}
                        onChange={e => setLayoutConfig(p => ({ ...p, name_align: e.target.value as any }))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                      >
                        <option value="center">{t.layout.alignCenter}</option>
                        <option value="left">{t.layout.alignLeft}</option>
                        <option value="right">{t.layout.alignRight}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Должность Position */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>{t.layout.posSection}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{t.layout.belowDivider}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-slate-500 block mb-0.5">{t.layout.offsetX}</label>
                      <input
                        type="number"
                        step="0.5"
                        value={layoutConfig.pos_offset_x}
                        onChange={e => setLayoutConfig(p => ({ ...p, pos_offset_x: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-0.5">{t.layout.offsetY}</label>
                      <input
                        type="number"
                        step="0.5"
                        value={layoutConfig.pos_offset_y}
                        onChange={e => setLayoutConfig(p => ({ ...p, pos_offset_y: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-0.5">{t.layout.fontSize}</label>
                      <input
                        type="number"
                        step="0.5"
                        value={layoutConfig.pos_font_size}
                        onChange={e => setLayoutConfig(p => ({ ...p, pos_font_size: parseFloat(e.target.value) || 10.5 }))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-0.5">{t.layout.alignment}</label>
                      <select
                        value={layoutConfig.pos_align}
                        onChange={e => setLayoutConfig(p => ({ ...p, pos_align: e.target.value as any }))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                      >
                        <option value="center">{t.layout.alignCenter}</option>
                        <option value="left">{t.layout.alignLeft}</option>
                        <option value="right">{t.layout.alignRight}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Отделение Position */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>{t.layout.deptSection}</span>
                    <label className="flex items-center gap-1 text-[11px] font-normal text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layoutConfig.show_department}
                        onChange={e => setLayoutConfig(p => ({ ...p, show_department: e.target.checked }))}
                        className="w-3.5 h-3.5 text-emerald-600 rounded cursor-pointer"
                      />
                      {t.layout.showDepartment}
                    </label>
                  </div>
                  {layoutConfig.show_department && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="text-slate-500 block mb-0.5">{t.layout.offsetX}</label>
                        <input
                          type="number"
                          step="0.5"
                          value={layoutConfig.dept_offset_x}
                          onChange={e => setLayoutConfig(p => ({ ...p, dept_offset_x: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 block mb-0.5">{t.layout.offsetY}</label>
                        <input
                          type="number"
                          step="0.5"
                          value={layoutConfig.dept_offset_y}
                          onChange={e => setLayoutConfig(p => ({ ...p, dept_offset_y: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 block mb-0.5">{t.layout.fontSize}</label>
                        <input
                          type="number"
                          step="0.5"
                          value={layoutConfig.dept_font_size}
                          onChange={e => setLayoutConfig(p => ({ ...p, dept_font_size: parseFloat(e.target.value) || 7.2 }))}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {/* TAB 4: SAFETY CODES (BACK SIDE) */}
        {activeTab === 'safety' && (
          !canEditDesign ? (
            renderLockedNotice()
          ) : (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t.safety.title}</h3>
                  <p className="text-xs text-slate-500">{t.safety.subtitle}</p>
                </div>
                <button
                  onClick={handleResetSafetyCodes}
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition cursor-pointer"
                  title={t.common.reset}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t.common.reset}
                </button>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {/* White Code */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 rounded-full border border-slate-400 bg-white" />
                    <span className="text-xs font-bold text-slate-800">{t.safety.whiteTitle}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{t.safety.whiteDesc}</span>
                  </div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">{t.safety.whiteLabel}</label>
                  <input
                    type="text"
                    value={safetyCodes.white_phones}
                    onChange={e => setSafetyCodes(p => ({ ...p, white_phones: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                  />
                </div>

                {/* Red Code */}
                <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-600" />
                    <span className="text-xs font-bold text-rose-900">{t.safety.redTitle}</span>
                    <span className="text-[10px] text-rose-700 font-medium">{t.safety.redDesc}</span>
                  </div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">{t.safety.redLabel}</label>
                  <input
                    type="text"
                    value={safetyCodes.red_phone}
                    onChange={e => setSafetyCodes(p => ({ ...p, red_phone: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                  />
                </div>

                {/* Blue Code */}
                <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                    <span className="text-xs font-bold text-blue-900">{t.safety.blueTitle}</span>
                    <span className="text-[10px] text-blue-700 font-medium">{t.safety.blueDesc}</span>
                  </div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">{t.safety.blueLabel}</label>
                  <input
                    type="text"
                    value={safetyCodes.blue_phone}
                    onChange={e => setSafetyCodes(p => ({ ...p, blue_phone: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                  />
                </div>

                {/* Yellow Code */}
                <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-amber-900">{t.safety.yellowTitle}</span>
                    <span className="text-[10px] text-amber-700 font-medium">{t.safety.yellowDesc}</span>
                  </div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">{t.safety.yellowLabel}</label>
                  <input
                    type="text"
                    value={safetyCodes.yellow_phone}
                    onChange={e => setSafetyCodes(p => ({ ...p, yellow_phone: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                  />
                </div>

                {/* Black Code */}
                <div className="p-2.5 rounded-xl border border-slate-400 bg-slate-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-900" />
                    <span className="text-xs font-bold text-slate-900">{t.safety.blackTitle}</span>
                    <span className="text-[10px] text-slate-600 font-medium">{t.safety.blackDesc}</span>
                  </div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">{t.safety.blackLabel}</label>
                  <input
                    type="text"
                    value={safetyCodes.black_phone}
                    onChange={e => setSafetyCodes(p => ({ ...p, black_phone: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>
          )
        )}

        {/* Message Banner */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Submit & GLPI Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
          <button
            onClick={handleCreate}
            disabled={loading || glpiLoading}
            type="button"
            className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t.constructor.submitBtn}
              </>
            )}
          </button>

          <button
            onClick={handleSubmitToGlpi}
            disabled={loading || glpiLoading}
            type="button"
            className="w-full py-3 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {glpiLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 text-emerald-400" />
                {t.constructor.sendToGlpiBtn}
              </>
            )}
          </button>
        </div>

        {/* GLPI Result Link Card */}
        {glpiResult && (
          <div className="mt-3.5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex flex-col gap-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{glpiResult.message}</span>
            </div>
            {glpiResult.requester && (
              <p className="text-blue-800">
                {t.constructor.sendToGlpiRequester
                  .replace('{name}', glpiResult.requester)
                  .replace('{pc}', glpiResult.machine || 'Auto')}
                {glpiResult.room ? `, каб. ${glpiResult.room}` : ''}
              </p>
            )}
            <a
              href={glpiResult.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold underline mt-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t.constructor.sendToGlpiOpen} (#{glpiResult.ticket_id})
            </a>
          </div>
        )}
      </div>

      {/* Live Preview Column (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col min-h-[500px]">
        {/* Preview Header & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-800">{t.preview.title}</h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {t.preview.liveVector}
            </span>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSide('front')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                side === 'front'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.preview.frontSide}
            </button>
            <button
              type="button"
              onClick={() => setSide('back')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                side === 'back'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.preview.backSide}
            </button>
            <button
              type="button"
              onClick={() => setSide('folded')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                side === 'folded'
                  ? 'bg-white text-emerald-800 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.preview.foldedSide}
            </button>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <span className="text-xs text-slate-400 font-medium">{t.preview.scale}</span>
          <button
            type="button"
            onClick={() => setScale(s => Math.max(0.7, Number((s - 0.1).toFixed(1))))}
            className="p-1 text-slate-500 hover:text-slate-800 bg-slate-50 rounded border border-slate-200 cursor-pointer"
            title="Уменьшить"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-bold text-slate-600 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale(s => Math.min(1.5, Number((s + 0.1).toFixed(1))))}
            className="p-1 text-slate-500 hover:text-slate-800 bg-slate-50 rounded border border-slate-200 cursor-pointer"
            title="Увеличить"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setScale(1.0)}
            className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 rounded border border-slate-200 cursor-pointer"
          >
            100%
          </button>
        </div>

        {/* Visual Badge Canvas */}
        <div className="flex-1 bg-slate-100/70 border border-dashed border-slate-200 rounded-xl p-8 flex items-center justify-center overflow-auto min-h-[320px]">
          <BadgeVisual
            fullName={fullName}
            position={position}
            departmentName={departmentName}
            side={side}
            scale={scale}
            backgroundImage={backgroundImage}
            layoutConfig={layoutConfig}
            safetyCodes={safetyCodes}
          />
        </div>

        {/* Physical Size Specs Note */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>{t.preview.sizeNote}</span>
          <span>{t.preview.dpiNote}</span>
        </div>
      </div>
    </div>
  );
};
