export interface Department {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  full_name: string;
  position: string;
  department_id: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
}

export interface Badge {
  id: string;
  employee_id: string;
  file_pdf_path: string | null;
  preview_png_path: string | null;
  created_at: string;
  status: string;
  employee?: Employee;
}

export interface LayoutConfig {
  name_offset_x: number;
  name_offset_y: number;
  name_font_size: number;
  name_line_height: number;
  name_align: 'center' | 'left' | 'right';
  pos_offset_x: number;
  pos_offset_y: number;
  pos_font_size: number;
  pos_line_height: number;
  pos_align: 'center' | 'left' | 'right';
  dept_offset_x: number;
  dept_offset_y: number;
  dept_font_size: number;
  show_department: boolean;
  show_divider: boolean;
}

export interface SafetyCodesConfig {
  white_phones: string;
  white_extra: string;
  red_phone: string;
  red_extra: string;
  blue_phone: string;
  blue_extra: string;
  yellow_phone: string;
  yellow_extra: string;
  black_phone: string;
  black_extra: string;
}

export interface BadgePreviewRequest {
  full_name: string;
  position: string;
  department_name?: string;
  side: 'front' | 'back' | 'folded';
  background_image?: string;
  layout_config?: LayoutConfig;
  safety_codes?: SafetyCodesConfig;
}

export interface BatchPrintRequest {
  badge_ids: string[];
  layout?: 'folded' | 'cards';
  include_crop_marks?: boolean;
  background_image?: string;
  layout_config?: LayoutConfig;
  safety_codes?: SafetyCodesConfig;
}

export interface BatchImportResult {
  total_processed: number;
  imported_count: number;
  error_count: number;
  errors: string[];
}

export interface BatchBadgeItem {
  full_name: string;
  position: string;
  department_name?: string;
}

export interface BatchBadgeCreateRequest {
  items: BatchBadgeItem[];
  background_image?: string;
  layout_config?: LayoutConfig;
  safety_codes?: SafetyCodesConfig;
}

export interface BatchBadgeCreateResponse {
  batch_id: string;
  badge_ids: string[];
  download_url: string;
  count: number;
}

export interface BatchSubmitToGlpiResponse {
  success: boolean;
  ticket_id?: number;
  ticket_url?: string;
  requester?: string;
  machine?: string;
  room?: string;
  count: number;
  message: string;
  error?: string;
}
