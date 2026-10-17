import React from 'react';
import type { LayoutConfig, SafetyCodesConfig } from '../types';
import { useTranslation } from '../i18n';

interface BadgeVisualProps {
  fullName: string;
  position: string;
  departmentName?: string;
  side: 'front' | 'back' | 'folded';
  scale?: number;
  backgroundImage?: string;
  layoutConfig?: LayoutConfig;
  safetyCodes?: SafetyCodesConfig;
}

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

export const BadgeVisual: React.FC<BadgeVisualProps> = ({
  fullName,
  position,
  departmentName,
  side,
  scale = 1.0,
  backgroundImage,
  layoutConfig,
  safetyCodes,
}) => {
  const { t, lang } = useTranslation();
  // Format Name Lines (split into 3 lines: Surname / First Name / Patronymic)
  const cleanedName = fullName.trim().replace(/\s+/g, ' ');
  const parts = cleanedName.split(' ');
  let nameLines: string[] = [];
  if (parts.length >= 3) {
    nameLines = [parts[0], parts[1], parts.slice(2).join(' ')];
  } else if (parts.length === 2) {
    nameLines = [parts[0], parts[1]];
  } else if (cleanedName) {
    nameLines = [cleanedName];
  } else {
    nameLines = ['Токтыбаева', 'Аида', 'Салходдиновна'];
  }

  // Format Position Lines
  const posText = (position.trim() || 'врач акушер-гинеколог').toLowerCase();
  const posParts = posText.split(' ');
  let posLines: string[] = [];
  if (posParts.length >= 2 && posText.length > 14) {
    if (posParts[0].length <= 7) {
      posLines = [posParts[0], posParts.slice(1).join(' ')];
    } else {
      const mid = Math.ceil(posParts.length / 2);
      posLines = [posParts.slice(0, mid).join(' '), posParts.slice(mid).join(' ')];
    }
  } else {
    posLines = [posText];
  }

  // Scale px / mm conversion (340px = 90mm -> 1mm = 3.7777px)
  const pxPerMm = 340 / 90;

  // Layout parameters with defaults
  const nameOffX = (layoutConfig?.name_offset_x || 0) * pxPerMm;
  const nameOffY = (layoutConfig?.name_offset_y || 0) * pxPerMm; // positive moves up
  const nameFontSize = layoutConfig?.name_font_size || 13.0;
  const nameLineHeight = (layoutConfig?.name_line_height || 4.8) * pxPerMm;
  const nameAlign = layoutConfig?.name_align || 'center';

  const posOffX = (layoutConfig?.pos_offset_x || 0) * pxPerMm;
  const posOffY = (layoutConfig?.pos_offset_y || 0) * pxPerMm; // positive moves up
  const posFontSize = layoutConfig?.pos_font_size || 10.5;
  const posLineHeight = (layoutConfig?.pos_line_height || 4.0) * pxPerMm;
  const posAlign = layoutConfig?.pos_align || 'center';

  const deptOffX = (layoutConfig?.dept_offset_x || 0) * pxPerMm;
  const deptOffY = (layoutConfig?.dept_offset_y || 0) * pxPerMm;
  const deptFontSize = layoutConfig?.dept_font_size || 7.2;
  const showDept = layoutConfig?.show_department !== false;
  const showDivider = !!layoutConfig?.show_divider;

  // Baseline coordinates:
  // Center X: 64.2mm = ~242.5px
  // Divider Y: 24.1mm from bottom = 227 - 91.0 = 136px from top
  const baseCenterX = 64.2 * pxPerMm; // 242.5px
  const baseDividerY = 227 - (24.1 * pxPerMm); // 136px

  const codes = { ...DEFAULT_SAFETY_CODES, ...(safetyCodes || {}) };

  // Front Side Component (90mm x 60mm -> 340px x 227px @ 96 DPI)
  const renderFront = () => (
    <div className="w-[340px] h-[227px] bg-white relative overflow-hidden select-none shadow-sm shrink-0 font-['Montserrat',sans-serif]">
      {/* Background image: user-uploaded or default hospital background */}
      <img
        src={backgroundImage || '/default_badge_bg.png'}
        alt="Badge Background"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
      />

      {/* Optional custom divider line */}
      {showDivider && (
        <div
          className="absolute h-[1.8px] bg-[#1e5d36] rounded-full z-10 -translate-x-1/2"
          style={{
            left: `${baseCenterX}px`,
            top: `${baseDividerY}px`,
            width: `${36 * pxPerMm}px`,
          }}
        />
      )}

      {/* Employee Name (Positioned above divider) */}
      <div
        className="absolute z-10 flex flex-col justify-end -translate-x-1/2 font-bold text-black pointer-events-none"
        style={{
          left: `${baseCenterX + nameOffX}px`,
          bottom: `${227 - baseDividerY + 6 + nameOffY}px`,
          width: '160px',
          textAlign: nameAlign,
          fontSize: `${nameFontSize}px`,
          lineHeight: `${nameLineHeight}px`,
        }}
      >
        {nameLines.map((line, idx) => (
          <div key={idx} className="whitespace-nowrap overflow-hidden text-ellipsis">
            {line}
          </div>
        ))}
      </div>

      {/* Position (Positioned below divider) */}
      <div
        className="absolute z-10 flex flex-col justify-start -translate-x-1/2 font-normal text-black pointer-events-none"
        style={{
          left: `${baseCenterX + posOffX}px`,
          top: `${baseDividerY + 6 - posOffY}px`,
          width: '160px',
          textAlign: posAlign,
          fontSize: `${posFontSize}px`,
          lineHeight: `${posLineHeight}px`,
        }}
      >
        {posLines.map((line, idx) => (
          <div key={idx} className="whitespace-nowrap overflow-hidden text-ellipsis">
            {line}
          </div>
        ))}

        {/* Department Name */}
        {showDept && departmentName && (
          <div
            className="font-medium text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis"
            style={{
              marginTop: '3px',
              fontSize: `${deptFontSize}px`,
              lineHeight: '1.2',
              transform: `translate(${deptOffX}px, ${-deptOffY}px)`,
            }}
          >
            {departmentName}
          </div>
        )}
      </div>
    </div>
  );

  // Back Side Component (Safety Codes)
  const renderBack = () => (
    <div className="w-[340px] h-[227px] bg-white relative overflow-hidden select-none flex flex-col justify-between p-2 shadow-sm border-[2px] border-[#1e5d36] shrink-0 font-['Montserrat',sans-serif]">
      <div className="text-center font-black text-slate-900 text-[10px] tracking-wider uppercase mb-1">
        {lang === 'kk' ? 'ҚАУІПСІЗДІК КОДТАРЫ' : 'КОДЫ ПО БЕЗОПАСНОСТИ'}
      </div>

      <div className="flex-1 flex flex-col justify-between gap-[3px]">
        {/* White Code */}
        <div className="flex items-stretch min-h-[34px] border border-slate-300 rounded-[2px] overflow-hidden bg-white">
          <div className="w-[95px] shrink-0 bg-slate-50 border-r border-slate-300 p-1 flex flex-col justify-center items-center text-center">
            <div className="text-[8.5px] font-black text-slate-900 leading-tight">
              {lang === 'kk' ? 'АҚ' : 'БЕЛЫЙ'}
            </div>
            <div className="text-[5.5px] font-bold text-slate-700 leading-none mt-0.5 uppercase">
              {lang === 'kk' ? 'Агрессивті пациент немесе келуші' : 'Агрессивный пациент или посетитель'}
            </div>
          </div>
          <div className="flex-1 p-1 flex flex-col justify-center text-[6.5px] font-bold text-slate-900 leading-tight uppercase">
            <div>{codes.white_extra || (lang === 'kk' ? 'Күзет қызметі ішкі байланыс - рация' : 'Охранная служба вн. связь - рация')}</div>
            <div className="mt-0.5 text-[#1e5d36]">{lang === 'kk' ? 'Диспетчерге хабарлау:' : 'Сообщить диспетчеру:'} <strong>{codes.white_phones}</strong></div>
          </div>
        </div>

        {/* Red Code */}
        <div className="flex items-stretch min-h-[34px] rounded-[2px] overflow-hidden bg-[#e3342f] text-white">
          <div className="w-[95px] shrink-0 bg-[#cb2d28] border-r border-white/20 p-1 flex flex-col justify-center items-center text-center">
            <div className="text-[8.5px] font-black leading-tight">{lang === 'kk' ? 'ҚЫЗЫЛ' : 'КРАСНЫЙ'}</div>
            <div className="text-[5.5px] font-bold leading-none mt-0.5 uppercase">{lang === 'kk' ? 'ӨРТ' : 'ПОЖАР'}</div>
          </div>
          <div className="flex-1 p-1 flex flex-col justify-center text-[6.5px] font-bold leading-tight uppercase">
            <div>{lang === 'kk' ? 'Шаруашылық бөлімі:' : 'Начальник АХЧ:'} <strong>{codes.red_phone}</strong></div>
            <div className="tracking-wide mt-0.5">{codes.red_extra || (lang === 'kk' ? 'СӨНДІРУ - ЭВАКУАЦИЯЛАУ' : 'ТУШИТЬ - ЭВАКУИРОВАТЬ')}</div>
          </div>
        </div>

        {/* Blue Code */}
        <div className="flex items-stretch min-h-[34px] rounded-[2px] overflow-hidden bg-[#2563eb] text-white">
          <div className="w-[95px] shrink-0 bg-[#1d4ed8] border-r border-white/20 p-1 flex flex-col justify-center items-center text-center">
            <div className="text-[8.5px] font-black leading-tight">{lang === 'kk' ? 'КӨК' : 'СИНИЙ'}</div>
            <div className="text-[5.5px] font-bold leading-none mt-0.5 uppercase">
              {lang === 'kk' ? 'Шұғыл мед. көмек көрсету' : 'Оказание неотложной мед. помощи'}
            </div>
          </div>
          <div className="flex-1 p-1 flex flex-col justify-center text-[6px] font-bold leading-[1.15] uppercase">
            <div>{codes.blue_extra}</div>
            <div className="mt-0.5">{lang === 'kk' ? 'Ішкі тел.:' : 'ВН. ТЕЛ.'} <strong>{codes.blue_phone}</strong></div>
          </div>
        </div>

        {/* Yellow Code */}
        <div className="flex items-stretch min-h-[34px] rounded-[2px] overflow-hidden bg-[#f59e0b] text-slate-950">
          <div className="w-[95px] shrink-0 bg-[#d97706] text-white border-r border-black/10 p-1 flex flex-col justify-center items-center text-center">
            <div className="text-[8.5px] font-black leading-tight">{lang === 'kk' ? 'САРЫ' : 'ЖЕЛТЫЙ'}</div>
            <div className="text-[5.5px] font-bold leading-none mt-0.5 uppercase">
              {lang === 'kk' ? 'Хим. заттардың төгілуі' : 'Разлитие хим. веществ'}
            </div>
          </div>
          <div className="flex-1 p-1 flex flex-col justify-center text-[6.5px] font-extrabold leading-tight uppercase">
            <div>{codes.yellow_extra}</div>
            <div className="mt-0.5">{lang === 'kk' ? 'Ішкі тел.:' : 'ВН. ТЕЛ.'} <strong>{codes.yellow_phone}</strong></div>
          </div>
        </div>

        {/* Black Code */}
        <div className="flex items-stretch min-h-[34px] rounded-[2px] overflow-hidden bg-[#1f2937] text-white">
          <div className="w-[95px] shrink-0 bg-[#111827] border-r border-white/20 p-1 flex flex-col justify-center items-center text-center">
            <div className="text-[8.5px] font-black leading-tight">{lang === 'kk' ? 'ҚАРА' : 'ЧЕРНЫЙ'}</div>
            <div className="text-[5.5px] font-bold leading-none mt-0.5 uppercase">
              {lang === 'kk' ? 'Террористік қауіп' : 'Угроза теракта'}
            </div>
          </div>
          <div className="flex-1 p-1 flex flex-col justify-center text-[6.5px] font-bold leading-tight uppercase">
            <div>{codes.black_extra}</div>
            <div className="mt-0.5">{lang === 'kk' ? 'Тел.:' : 'ТЕЛ.:'} <strong>{codes.black_phone}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="origin-center transition-transform duration-200"
      style={{ transform: `scale(${scale})` }}
    >
      {side === 'front' && renderFront()}
      {side === 'back' && renderBack()}
      {side === 'folded' && (
        <div className="flex relative shadow-md rounded-sm overflow-hidden border border-slate-300">
          {renderFront()}
          <div className="relative border-r border-dashed border-slate-400">
            <span className="absolute top-1 left-1/2 -translate-x-1/2 bg-white px-1.5 py-0.5 text-[7px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap shadow-xs z-30 border border-slate-200 rounded">
              {t.preview.foldLine}
            </span>
          </div>
          {renderBack()}
        </div>
      )}
    </div>
  );
};
