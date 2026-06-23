import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { moduleTypeLabels, useWorkflowStore } from '@/store/workflowStore'
import { useModuleStatsStore } from '@/store/moduleStatsStore'
import { useCustomModuleStore } from '@/store/customModuleStore'
import type { ModuleType } from '@/types'
import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react'
import { pinyinMatch } from '@/lib/pinyin'
import { createPortal } from 'react-dom'
import { CustomModuleList } from './CustomModuleList'
import { CreateCustomModuleDialog } from './CreateCustomModuleDialog'
import { CustomModuleManageDialog } from './CustomModuleManageDialog'
import { useConfirm } from '@/components/ui/confirm-dialog'
import {
  Globe,
  MousePointer,
  MousePointerClick,
  Type,
  Search,
  Clock,
  Timer,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  GripHorizontal,
  ArrowDownUp,
  Upload,
  Download,
  ImageDown,
  Eye,
  SlidersHorizontal,
  GitBranch,
  Repeat,
  ListOrdered,
  LogOut,
  SkipForward,
  Variable,
  TrendingUp,
  MessageSquareText,
  MessageSquare,
  MessageSquareMore,
  Mail,
  Bell,
  Music,
  TextCursorInput,
  Bot,
  Send,
  FileJson,
  Dices,
  CalendarClock,
  Camera,
  FileSpreadsheet,
  ListPlus,
  ListMinus,
  Hash,
  BookOpen,
  KeyRound,
  Braces,
  ScanText,
  Square,
  AudioLines,
  Code,
  Code2,
  Table2,
  TableProperties,
  Columns3,
  Grid3X3,
  Trash2,
  FileOutput,
  FileDown,
  ClipboardPaste,
  Keyboard,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  MessageCircleWarning,
  StickyNote,
  Regex,
  Replace,
  Scissors,
  Link2,
  TextSelect,
  CaseSensitive,
  RemoveFormatting,
  ClipboardCopy,
  Plus,
  Workflow,
  Database,
  DatabaseZap,
  TableCellsSplit,
  CirclePlus,
  Pencil,
  CircleMinus,
  Unplug,
  Power,
  Lock,
  Move,
  Terminal,
  Image,
  Crosshair,
  Monitor,
  FileEdit,
  Radio,
  FileVideo,
  FileAudio,
  ImageMinus,
  Film,
  Video,
  Clapperboard,
  Combine,
  Droplets,
  UserCheck,
  Hand,
  ScanLine,
  FolderOpen,
  Copy,
  FileX,
  FolderPlus,
  FileQuestion,
  FileText,
  FilePen,
  Files,
  RotateCw,
  Gauge,
  ImagePlus,
  Subtitles,
  Volume,
  Volume2,
  Maximize2,
  Users,
  User,
  FileUp,
  FileType,
  Split,
  FileKey,
  FileLock2,
  Info,
  Minimize2,
  ArrowUpDown,
  ScrollText,
  LetterText,
  MousePointer2,
  Share2,
  StopCircle,
  Star,
  ScreenShare,
  ScreenShareOff,
  Webhook,
  FolderSearch,
  FolderSync,
  Frame,
  ArrowUpFromLine,
  Layers,
  Sun,
  Palette,
  Zap,
  Sparkles,
  Eraser,
  Shield,
  Fingerprint,
  Printer,
  FlipHorizontal,
  Play,
  Circle,
  Binary,
  ArrowDown,
  ArrowUp,
  Percent,
  ArrowLeftRight,
  Map,
  Filter,
  Minus,
  Grid2X2,
  Shuffle,
  FolderTree,
  Triangle,
  BarChart3,
  Activity,
  Puzzle,
  Boxes,
  Command,
  Wand2,
  Focus,
  ShieldCheck,
  TextCursor,
  Database as DatabaseIcon,
} from 'lucide-react'
import { TestReportIcon } from './icons/TestReportIcon'
import { PanelResizer } from './PanelResizer'
import { useLayoutStore, LAYOUT_LIMITS } from '@/store/layoutStore'

// 收藏模块现在统一由 moduleStatsStore 管理，不再使用单独的 localStorage

// 模块图标映射 - 优化后更直观的图标
const moduleIcons: Record<ModuleType, React.ElementType> = {
  // 页面导航
  open_page: Globe,
  use_opened_page: Globe,
  close_page: X,
  // DrissionPage 反检测自动化
  dp_open_page: Globe,
  dp_click: MousePointerClick,
  dp_input: Type,
  dp_get_text: FileText,
  dp_get_html: Code,
  dp_run_js: Code2,
  dp_wait_element: Clock,
  dp_scroll: ArrowDownUp,
  dp_close: Power,
  refresh_page: RefreshCw,
  go_back: ArrowLeft,
  go_forward: ArrowRight,
  // 元素交互
  click_element: MousePointerClick,
  hover_element: MousePointer,
  input_text: Type,
  select_dropdown: ChevronDown,
  set_checkbox: CheckSquare,
  drag_element: GripHorizontal,
  scroll_page: ArrowDownUp,
  handle_dialog: MessageCircleWarning,
  inject_javascript: Code,
  switch_iframe: Frame,
  switch_to_main: ArrowUpFromLine,
  switch_tab: Layers,
  // 数据提取
  get_element_info: Search,
  screenshot: Camera,
  save_image: ImageDown,
  download_file: Download,
  // 文件上传
  upload_file: Upload,
  // 元素操作
  get_child_elements: ListOrdered,
  get_sibling_elements: Columns3,
  // 等待控制
  wait: Clock,
  wait_element: Timer,
  wait_image: Eye,
  wait_page_load: RefreshCw,
  page_load_complete: GitBranch,
  // 变量与数据
  set_variable: Variable,
  increment_decrement: TrendingUp,
  json_parse: FileJson,
  base64: Code2,
  random_number: Dices,
  get_time: CalendarClock,
  // 字符串处理
  regex_extract: Regex,
  string_replace: Replace,
  string_split: Scissors,
  string_join: Link2,
  string_concat: Plus,
  string_trim: RemoveFormatting,
  string_case: CaseSensitive,
  string_substring: TextSelect,
  // 列表操作
  list_operation: ListPlus,
  list_get: ListMinus,
  list_length: Hash,
  list_export: FileDown,
  // 字典操作
  dict_operation: Braces,
  dict_get: BookOpen,
  dict_keys: KeyRound,
  // 数据表格
  table_add_row: TableProperties,
  table_add_column: Columns3,
  table_set_cell: Grid3X3,
  table_get_cell: Table2,
  table_delete_row: Trash2,
  table_clear: X,
  table_export: FileOutput,
  // Excel
  read_excel: FileSpreadsheet,
  // Excel 自动化（openpyxl）
  excel_create: FileSpreadsheet,
  excel_add_sheet: Plus,
  excel_delete_sheet: Trash2,
  excel_rename_sheet: Pencil,
  excel_list_sheets: ListPlus,
  excel_copy_sheet: Copy,
  excel_move_sheet: ArrowUpDown,
  excel_set_tab_color: Palette,
  excel_clear_sheet: RemoveFormatting,
  excel_get_info: Info,
  excel_write_cell: Pencil,
  excel_read_cell: Eye,
  excel_write_range: Grid3X3,
  excel_read_range: Table2,
  excel_append_row: ListPlus,
  excel_write_dicts: Grid3X3,
  excel_read_dicts: Table2,
  excel_copy_range: Copy,
  excel_clear_range: RemoveFormatting,
  excel_find_replace: Replace,
  excel_insert_rows: CirclePlus,
  excel_delete_rows: CircleMinus,
  excel_insert_cols: Columns3,
  excel_delete_cols: Columns3,
  excel_hide: Eye,
  excel_set_size: Maximize2,
  excel_set_formula: Hash,
  excel_read_formula: Search,
  excel_merge_cells: Combine,
  excel_freeze_panes: Lock,
  excel_set_style: Palette,
  excel_set_border: Grid2X2,
  excel_number_format: Hash,
  excel_set_hyperlink: Link2,
  excel_set_comment: MessageSquare,
  excel_add_image: Image,
  excel_add_chart: BarChart3,
  excel_data_validation: Filter,
  excel_conditional_format: Palette,
  excel_auto_filter: Filter,
  excel_sort_range: ArrowUpDown,
  excel_remove_duplicates: Trash2,
  excel_to_csv: FileOutput,
  excel_from_csv: FileDown,
  excel_protect_sheet: Lock,
  excel_page_setup: FileText,
  excel_set_zoom: Search,
  excel_count_rows: Hash,
  excel_find_empty_row: Search,
  excel_find_empty_col: Search,
  excel_find_empty_cell: Search,
  excel_fill_range: Grid3X3,
  excel_clear_style: RemoveFormatting,
  excel_activate_sheet: Table2,
  excel_save_as: Copy,
  excel_pivot_table: BarChart3,
  excel_to_pdf: FileOutput,
  excel_run_macro: Terminal,
  excel_refresh_data: RotateCw,
  // 数据库操作
  db_connect: Database,
  db_query: DatabaseZap,
  db_execute: TableCellsSplit,
  db_insert: CirclePlus,
  db_update: Pencil,
  db_delete: CircleMinus,
  db_close: Unplug,
  // 流程控制
  condition: GitBranch,
  loop: Repeat,
  foreach: ListOrdered,
  break_loop: LogOut,
  continue_loop: SkipForward,
  assert_checkpoint: ShieldCheck,
  stop_workflow: Power,
  scheduled_task: Clock,
  subflow: Workflow,
  // 触发器
  webhook_trigger: Webhook,
  hotkey_trigger: Keyboard,
  file_watcher_trigger: FolderSearch,
  email_trigger: Mail,
  api_trigger: RefreshCw,
  mouse_trigger: MousePointer2,
  image_trigger: Eye,
  sound_trigger: Volume,
  face_trigger: UserCheck,
  gesture_trigger: Hand,
  element_change_trigger: RefreshCw,
  // 网络请求
  api_request: Send,
  // AI
  ai_chat: Bot,
  ai_vision: ScanText,
  ai_extract: FileJson,
  ai_classify: Filter,
  ai_summarize: FileText,
  ai_translate: Type,
  ai_sentiment: Sparkles,
  ai_normalize: Eraser,
  ai_dedup_semantic: Filter,
  ai_route: GitBranch,
  ai_smart_scraper: Bot,
  ai_element_selector: Crosshair,
  firecrawl_scrape: Globe,
  firecrawl_map: FolderSearch,
  firecrawl_crawl: Search,
  // 验证码
  ocr_captcha: Eye,
  slider_captcha: SlidersHorizontal,
  // 消息通知
  print_log: MessageSquareText,
  play_sound: Bell,
  system_notification: Bell,
  play_music: Music,
  play_video: Film,
  view_image: Image,
  text_to_speech: AudioLines,
  send_email: Mail,
  // QQ自动化
  qq_send_message: MessageSquare,
  qq_send_image: Image,
  qq_send_file: FileUp,
  qq_get_friends: Users,
  qq_get_groups: Users,
  qq_get_group_members: Users,
  qq_get_login_info: User,
  qq_wait_message: MessageSquareMore,
  // 微信自动化
  wechat_send_message: MessageSquare,
  wechat_send_file: FileUp,
  // 手机自动化
  phone_tap: MousePointerClick,
  phone_swipe: Move,
  phone_long_press: MousePointer2,
  phone_input_text: Type,
  phone_press_key: Keyboard,
  phone_screenshot: Camera,
  phone_start_mirror: ScreenShare,
  phone_stop_mirror: ScreenShareOff,
  phone_install_app: Download,
  phone_start_app: Play,
  phone_stop_app: StopCircle,
  phone_uninstall_app: Trash2,
  phone_push_file: Upload,
  phone_pull_file: Download,
  phone_click_image: Image,
  phone_click_text: Type,
  phone_wait_image: Clock,
  phone_image_exists: GitBranch,
  phone_set_volume: Volume2,
  phone_set_brightness: Sun,
  phone_set_clipboard: ClipboardPaste,
  phone_get_clipboard: ClipboardCopy,
  // 用户交互
  input_prompt: TextCursorInput,
  // 系统操作
  set_clipboard: ClipboardPaste,
  get_clipboard: ClipboardCopy,
  keyboard_action: Keyboard,
  real_mouse_scroll: MousePointer,
  shutdown_system: Power,
  lock_screen: Lock,
  window_focus: Maximize2,
  real_mouse_click: MousePointerClick,
  real_mouse_move: Move,
  real_mouse_drag: GripHorizontal,
  real_keyboard: Keyboard,
  run_command: Terminal,
  click_image: Image,
  image_exists: GitBranch,
  element_exists: GitBranch,
  element_visible: GitBranch,
  get_mouse_position: Crosshair,
  screenshot_screen: Monitor,
  ai_vision_act: Eye,
  network_capture: Radio,
  // 媒体处理
  format_convert: FileVideo,
  compress_image: ImageMinus,
  compress_video: Film,
  // 格式工厂
  image_format_convert: ImagePlus,
  video_format_convert: FileVideo,
  audio_format_convert: FileAudio,
  video_to_audio: FileAudio,
  video_to_gif: Film,
  batch_format_convert: FolderSync,
  extract_audio: FileAudio,
  trim_video: Clapperboard,
  merge_media: Combine,
  add_watermark: Droplets,
  download_m3u8: Download,
  ytdlp_download: Download,
  ytdlp_download_audio: Music,
  ytdlp_get_info: Info,
  ytdlp_list_formats: FileType,
  ytdlp_download_subtitle: Subtitles,
  ytdlp_download_playlist: Video,
  rotate_video: RotateCw,
  video_speed: Gauge,
  extract_frame: ImagePlus,
  add_subtitle: Subtitles,
  adjust_volume: Volume,
  resize_video: Maximize2,
  // AI识别
  face_recognition: UserCheck,
  image_ocr: ScanLine,
  // PDF处理
  pdf_to_images: ImagePlus,
  images_to_pdf: FileType,
  pdf_merge: Combine,
  pdf_split: Split,
  pdf_extract_text: FileText,
  pdf_extract_images: ImageDown,
  pdf_encrypt: FileKey,
  pdf_decrypt: FileLock2,
  pdf_add_watermark: Droplets,
  pdf_rotate: RotateCw,
  pdf_delete_pages: Trash2,
  pdf_get_info: Info,
  pdf_compress: Minimize2,
  pdf_insert_pages: CirclePlus,
  pdf_reorder_pages: ArrowUpDown,
  pdf_to_word: FileType,
  // 文档转换
  markdown_to_html: FileType,
  html_to_markdown: FileType,
  markdown_to_pdf: FileType,
  markdown_to_docx: FileType,
  docx_to_markdown: FileType,
  html_to_docx: FileType,
  docx_to_html: FileType,
  markdown_to_epub: BookOpen,
  epub_to_markdown: BookOpen,
  latex_to_pdf: FileType,
  rst_to_html: FileType,
  org_to_html: FileType,
  universal_doc_convert: RefreshCw,
  // 其他
  export_log: ScrollText,
  click_text: LetterText,
  hover_image: MousePointer2,
  hover_text: MousePointer2,
  drag_image: GripHorizontal,
  // 图像处理
  image_grayscale: ImageMinus,
  image_round_corners: Square,
  // Pillow图像处理
  image_resize: Maximize2,
  image_crop: Scissors,
  image_rotate: RotateCw,
  image_flip: FlipHorizontal,
  image_blur: Droplets,
  image_sharpen: Zap,
  image_brightness: Sun,
  image_contrast: Gauge,
  image_color_balance: Palette,
  image_convert_format: FileType,
  image_add_text: Type,
  image_merge: Combine,
  image_thumbnail: ImageMinus,
  image_filter: Sparkles,
  image_get_info: Info,
  image_remove_bg: Eraser,
  // 音频处理
  audio_to_text: AudioLines,
  // 二维码
  qr_generate: Grid3X3,
  qr_decode: ScanLine,
  // 盲水印（隐藏在图像中、肉眼不可见）
  bwm_embed_text: Fingerprint,
  bwm_extract_text: ScanLine,
  bwm_embed_image: Fingerprint,
  bwm_extract_image: ScanLine,
  // 录屏
  screen_record: Monitor,
  camera_capture: Camera,
  camera_record: Video,
  // 网络共享
  share_folder: Share2,
  share_file: Share2,
  stop_share: StopCircle,
  // 屏幕共享
  start_screen_share: ScreenShare,
  stop_screen_share: ScreenShareOff,
  // 文件操作
  list_files: FolderOpen,
  copy_file: Copy,
  move_file: Files,
  delete_file: FileX,
  create_folder: FolderPlus,
  file_exists: FileQuestion,
  get_file_info: FileText,
  read_text_file: FileText,
  write_text_file: FilePen,
  rename_file: FileEdit,
  rename_folder: FolderOpen,
  // 宏录制器
  macro_recorder: Film,
  // 脚本
  js_script: Code2,
  python_script: Code,
  extract_table_data: Table2,
  // 画布工具
  group: Square,
  subflow_header: Workflow,
  note: StickyNote,
  // 实用工具
  file_hash_compare: Shield,
  file_diff_compare: FileEdit,
  folder_hash_compare: Shield,
  folder_diff_compare: FolderSearch,
  random_password_generator: KeyRound,
  url_encode_decode: Link2,
  md5_encrypt: Fingerprint,
  sha_encrypt: Shield,
  timestamp_converter: Clock,
  rgb_to_hsv: Palette,
  rgb_to_cmyk: Palette,
  hex_to_cmyk: Palette,
  uuid_generator: Hash,
  printer_call: Printer,
  // 列表运算
  list_sum: Plus,
  list_average: TrendingUp,
  list_max: ArrowUp,
  list_min: ArrowDown,
  list_sort: ArrowUpDown,
  list_unique: Filter,
  list_slice: Scissors,
  // 数学运算
  math_round: Circle,
  math_base_convert: Binary,
  math_floor: ArrowDown,
  math_modulo: Percent,
  math_abs: Maximize2,
  math_sqrt: TrendingUp,
  math_power: Zap,
  // 列表高级操作
  list_reverse: ArrowLeftRight,
  list_find: Search,
  list_count: Hash,
  list_filter: Filter,
  list_map: Map,
  list_merge: Combine,
  list_flatten: Layers,
  list_chunk: Grid3X3,
  list_remove_empty: Trash2,
  list_intersection: Grid2X2,
  list_union: Plus,
  list_difference: Minus,
  list_cartesian_product: Grid2X2,
  list_shuffle: Shuffle,
  list_sample: Dices,
  // 字典高级操作
  dict_merge: Combine,
  dict_filter: Filter,
  dict_map_values: Map,
  dict_invert: ArrowLeftRight,
  dict_sort: ArrowUpDown,
  dict_deep_copy: Copy,
  dict_get_path: FolderTree,
  dict_flatten: Layers,
  // 高级数学运算
  math_log: TrendingUp,
  math_trig: Triangle,
  math_exp: Zap,
  math_gcd: Binary,
  math_lcm: Binary,
  math_factorial: Hash,
  math_permutation: Grid3X3,
  math_percentage: Percent,
  math_clamp: Maximize2,
  math_random_advanced: Dices,
  // 统计分析
  stat_median: TrendingUp,
  stat_mode: BarChart3,
  stat_variance: Activity,
  stat_stdev: Activity,
  stat_percentile: Percent,
  stat_normalize: Gauge,
  stat_standardize: Gauge,
  // 字符串转换
  csv_parse: FileSpreadsheet,
  csv_generate: FileSpreadsheet,
  list_to_string_advanced: FileText,
  // 循环控制
  foreach_dict: Braces,
  // 测试报告
  allure_init: TestReportIcon,
  allure_start_test: TestReportIcon,
  allure_add_step: TestReportIcon,
  allure_add_attachment: TestReportIcon,
  allure_stop_test: TestReportIcon,
  allure_generate_report: TestReportIcon,
  // 桌面应用自动化
  desktop_app_start: Play,
  desktop_app_connect: Link2,
  desktop_app_close: X,
  desktop_app_get_info: Info,
  desktop_app_wait_ready: Clock,
  desktop_window_activate: Maximize2,
  desktop_window_state: Maximize2,
  desktop_window_move: Move,
  desktop_window_resize: Maximize2,
  desktop_window_list: ListOrdered,
  desktop_window_topmost: Layers,
  desktop_window_capture: Camera,
  desktop_find_control: Search,
  desktop_control_info: Info,
  desktop_control_tree: FolderTree,
  desktop_wait_control: Clock,
  desktop_click_control: MousePointerClick,
  desktop_input_control: Type,
  desktop_get_text: FileText,
  desktop_set_value: Pencil,
  desktop_select_combo: ChevronDown,
  desktop_checkbox: CheckSquare,
  desktop_radio: Circle,
  desktop_drag_control: GripHorizontal,
  desktop_menu_click: ListOrdered,
  desktop_list_operate: ListPlus,
  desktop_send_keys: Keyboard,
  desktop_get_property: Info,
  desktop_dialog_handle: MessageCircleWarning,
  desktop_scroll_control: ArrowDownUp,
  desktop_get_control_info: Info,
  desktop_get_control_tree: FolderTree,
  // 现代桌面应用增强（仅热键 - OCR/图像/区域 OCR 已由通用模块覆盖）
  desktop_hotkey: Command,
  // 影刀级桌面增强
  desktop_find_control_smart: Wand2,
  desktop_extract_table: DatabaseIcon,
  desktop_get_app_state: Activity,
  desktop_query_with_xpath: Code2,
  desktop_select_text: TextCursor,
  desktop_get_focused_control: Focus,
  desktop_assert_control: ShieldCheck,
  // Apprise多渠道通知
  notify_discord: Bell,
  notify_telegram: Send,
  notify_dingtalk: Bell,
  notify_wecom: MessageSquare,
  notify_feishu: Bell,
  notify_bark: Bell,
  notify_slack: MessageSquare,
  notify_msteams: MessageSquare,
  notify_pushover: Bell,
  notify_pushbullet: Bell,
  notify_gotify: Bell,
  notify_serverchan: Bell,
  notify_pushplus: Bell,
  notify_webhook: Webhook,
  notify_ntfy: Bell,
  notify_matrix: MessageSquare,
  notify_rocketchat: MessageSquare,
  // Webhook请求
  webhook_request: Send,
  // 飞书自动化
  feishu_bitable_write: TableProperties,
  feishu_bitable_read: Table2,
  feishu_sheet_write: FileSpreadsheet,
  feishu_sheet_read: FileSpreadsheet,
  // WPS 多维表格
  wps_bitable_write: TableProperties,
  wps_bitable_read: Table2,
  // Oracle数据库
  oracle_connect: Database,
  oracle_query: DatabaseZap,
  oracle_execute: TableCellsSplit,
  oracle_insert: CirclePlus,
  oracle_update: Pencil,
  oracle_delete: CircleMinus,
  // PostgreSQL数据库
  postgresql_connect: Database,
  postgresql_query: DatabaseZap,
  postgresql_execute: TableCellsSplit,
  postgresql_insert: CirclePlus,
  postgresql_update: Pencil,
  postgresql_delete: CircleMinus,
  // MongoDB数据库
  mongodb_connect: Database,
  mongodb_find: Search,
  mongodb_insert: CirclePlus,
  mongodb_update: Pencil,
  mongodb_delete: CircleMinus,
  // SQL Server数据库
  sqlserver_connect: Database,
  sqlserver_query: DatabaseZap,
  sqlserver_execute: TableCellsSplit,
  sqlserver_insert: CirclePlus,
  sqlserver_update: Pencil,
  sqlserver_delete: CircleMinus,
  // SQLite数据库
  sqlite_connect: Database,
  sqlite_query: DatabaseZap,
  sqlite_execute: TableCellsSplit,
  sqlite_insert: CirclePlus,
  sqlite_update: Pencil,
  sqlite_delete: CircleMinus,
  // Redis数据库
  redis_connect: Database,
  redis_get: Download,
  redis_set: Upload,
  redis_del: Trash2,
  redis_hget: BookOpen,
  redis_hset: Pencil,
  // 数据库断开连接
  oracle_disconnect: Unplug,
  postgresql_disconnect: Unplug,
  mongodb_disconnect: Unplug,
  sqlserver_disconnect: Unplug,
  sqlite_disconnect: Unplug,
  redis_disconnect: Unplug,
  // SSH远程操作
  ssh_connect: Terminal,
  ssh_execute_command: Terminal,
  ssh_upload_file: Upload,
  ssh_download_file: Download,
  ssh_disconnect: Unplug,
  // SAP GUI 自动化
  sap_login: Database,
  sap_logout: Unplug,
  sap_run_tcode: Terminal,
  sap_set_field_value: Pencil,
  sap_get_field_value: BookOpen,
  sap_click_button: MousePointerClick,
  sap_send_vkey: Keyboard,
  sap_get_status_message: MessageSquare,
  sap_get_title: FileText,
  sap_close_warning: X,
  sap_set_checkbox: CheckSquare,
  sap_select_combobox: ChevronDown,
  sap_read_gridview: Table2,
  sap_export_gridview_excel: FileSpreadsheet,
  sap_set_focus: Crosshair,
  sap_maximize_window: Maximize2,
  // AI生图生视频
  ai_generate_image: ImagePlus,
  ai_generate_video: Film,
  // 概率触发器
  probability_trigger: Dices,
  // 网络监听
  network_monitor_start: Radio,
  network_monitor_wait: Clock,
  network_monitor_stop: StopCircle,
  // 自定义模块
  custom_module: Workflow,
}

// 模块搜索关键词（用于模糊搜索）
const moduleKeywords: Record<ModuleType, string[]> = {
  open_page: ['打开', '网页', '浏览器', 'url', '地址', 'open', 'page'],
  dp_open_page: ['drissionpage', 'dp', '反检测', '绕过', '风控', '打开', '网页', 'bypass', '隐蔽'],
  dp_click: ['drissionpage', 'dp', '点击', '反检测', 'click'],
  dp_input: ['drissionpage', 'dp', '输入', '反检测', 'input'],
  dp_get_text: ['drissionpage', 'dp', '获取', '文本', 'text'],
  dp_get_html: ['drissionpage', 'dp', '获取', '源码', 'html'],
  dp_run_js: ['drissionpage', 'dp', '执行', 'js', 'javascript', '脚本'],
  dp_wait_element: ['drissionpage', 'dp', '等待', '元素', 'wait'],
  dp_scroll: ['drissionpage', 'dp', '滚动', 'scroll'],
  dp_close: ['drissionpage', 'dp', '关闭', '浏览器', 'close'],
  click_element: ['点击', '单击', '双击', '右键', 'click', '按钮'],
  hover_element: ['悬停', '鼠标', '移动', 'hover', 'mouse', '移入', '经过', '停留'],
  input_text: ['输入', '文本', '填写', 'input', 'text', '表单'],
  get_element_info: ['提取', '数据', '获取', '元素', '信息', 'get', 'element', '采集'],
  wait: ['等待', '延迟', '暂停', 'wait', 'delay', '时间', '固定'],
  wait_element: ['等待', '元素', '出现', '消失', 'wait', 'element', '存在', '隐藏'],
  wait_image: ['等待', '图像', '图片', '出现', '识别', 'wait', 'image', '屏幕', '匹配'],
  wait_page_load: ['等待', '页面', '加载', '完成', 'wait', 'page', 'load', '网页', '就绪', 'dom', 'networkidle'],
  page_load_complete: ['页面', '加载', '完成', '判断', '检查', 'page', 'load', 'complete', '状态', '条件', '分支'],
  close_page: ['关闭', '网页', 'close', 'page'],
  refresh_page: ['刷新', '页面', '重新加载', 'refresh', 'reload', 'f5'],
  go_back: ['返回', '上一页', '后退', 'back', 'history', '历史'],
  go_forward: ['前进', '下一页', 'forward', 'history', '历史'],
  handle_dialog: ['弹窗', '对话框', '确认', '取消', 'alert', 'confirm', 'prompt', 'dialog', '提示框'],
  inject_javascript: ['js', 'javascript', '脚本', '注入', '执行', 'eval', '代码', 'script'],
  switch_iframe: ['切换', 'iframe', '内嵌', '框架', 'frame', '子页面', '嵌入', '内联框架', 'qhiframe', 'qh', 'nq', 'kj', 'zyym', 'qiehuan', 'neiqian', 'kuangjia', 'ziyemian', 'qianru', 'neilianku angjia'],
  switch_to_main: ['切换', '主页面', '退出', 'iframe', 'frame', '返回', '主框架', 'main', 'qhzyym', 'qh', 'zyym', 'tc', 'fh', 'zkj', 'qiehuan', 'zhuyemian', 'tuichu', 'fanhui', 'zhukuangjia'],
  switch_tab: ['切换', '标签页', 'tab', '页面', '窗口', '索引', '标题', 'url', '下一个', '上一个', 'qhbqy', 'qh', 'bqy', 'ym', 'ck', 'qiehuan', 'biaoqianye', 'yemian', 'chuangkou'],
  set_variable: ['设置', '变量', 'set', 'variable', '赋值'],
  increment_decrement: ['自增', '自减', '加', '减', 'increment', 'decrement', '计数', '累加', '累减', '步长'],
  json_parse: ['json', '解析', '提取', 'parse', '数据', 'jsonpath'],
  base64: ['base64', '编码', '解码', 'encode', 'decode', '转换', '图片', '文件'],
  random_number: ['随机', '数字', 'random', '生成', '随机数'],
  get_time: ['时间', '日期', 'time', 'date', '当前', '获取'],
  print_log: ['打印', '日志', 'print', 'log', '输出'],
  play_sound: ['播放', '提示音', '声音', 'sound', 'beep', '滴'],
  system_notification: ['系统', '消息', '通知', '弹窗', 'notification', 'toast', '提醒', '右下角'],
  play_music: ['播放', '音乐', '音频', 'music', 'audio', 'mp3', '歌曲', 'url'],
  play_video: ['播放', '视频', 'video', 'mp4', '影片', '电影'],
  view_image: ['查看', '图片', '图像', 'image', '照片', 'jpg', 'png', '预览'],
  input_prompt: ['用户', '输入', '弹窗', '对话框', 'prompt', 'input'],
  text_to_speech: ['语音', '播报', '朗读', 'tts', 'speech', '文本转语音', '读'],
  js_script: ['执行', '脚本', 'js', 'javascript', 'script', '代码', 'code', '自定义', '函数'],
  python_script: ['执行', '脚本', 'python', 'py', 'script', '代码', 'code', '自定义', '函数', 'Python3.13'],
  extract_table_data: ['表格', '数据', '提取', '爬取', '采集', 'table', 'extract', '批量', '列表', 'excel', '导出', '二维'],
  set_clipboard: ['剪贴板', '写入', '复制', '粘贴', 'clipboard', 'copy', 'paste', '图片', '文本'],
  get_clipboard: ['剪贴板', '读取', '获取', '粘贴', 'clipboard', 'paste', '内容'],
  keyboard_action: ['模拟', '按键', '键盘', '快捷键', 'keyboard', 'key', 'ctrl', 'alt', 'shift', '热键'],
  real_mouse_scroll: ['真实', '鼠标', '滚轮', '滚动', '物理', 'mouse', 'scroll', 'wheel', '系统', '硬件', '模拟'],
  shutdown_system: ['关机', '重启', '注销', '休眠', 'shutdown', 'restart', 'reboot', '电源', '系统'],
  lock_screen: ['锁屏', '锁定', '屏幕', 'lock', 'screen', '安全'],
  window_focus: ['窗口', '聚焦', '置顶', '前台', '激活', 'focus', 'window', 'foreground', '切换'],
  real_mouse_click: ['真实', '鼠标', '点击', '物理', 'mouse', 'click', '系统', '硬件', '左键', '右键', '中键'],
  real_mouse_move: ['真实', '鼠标', '移动', '物理', 'mouse', 'move', '系统', '硬件', '坐标', '位置'],
  real_mouse_drag: ['真实', '鼠标', '拖拽', '拖动', '物理', 'mouse', 'drag', '系统', '硬件', '长按', '拖放'],
  real_keyboard: ['真实', '键盘', '按键', '物理', 'keyboard', 'key', '系统', '硬件', '输入', '打字'],
  run_command: ['执行', '命令', '终端', 'cmd', 'command', 'shell', 'powershell', '脚本', '系统'],
  click_image: ['点击', '图像', '图片', '识别', 'image', 'click', '屏幕', '匹配', '查找'],
  image_exists: ['图像', '存在', '判断', '检测', 'image', 'exists', '识别', '条件', '分支', '屏幕'],
  element_exists: ['元素', '存在', '判断', '检测', 'element', 'exists', '条件', '分支', '网页', 'dom'],
  element_visible: ['元素', '可见', '判断', '检测', 'element', 'visible', '条件', '分支', '网页', 'dom', '显示'],
  get_mouse_position: ['获取', '鼠标', '位置', '坐标', 'mouse', 'position', 'cursor', '光标'],
  screenshot_screen: ['截屏', '屏幕', '截图', '桌面', 'screenshot', 'screen', 'capture', '全屏'],
  ai_vision_act: ['视觉', '看屏', '点选', 'AI', '视觉操作', '看屏点选', 'vision', 'computer use', 'computeruse', '截图点击', '自然语言点击', '智能点击', 'sjcz', 'kp'],
  network_capture: ['网络', '抓包', '请求', 'network', 'capture', 'request', 'url', '监听', 'F12'],
  // 媒体处理
  format_convert: ['格式', '转换', '视频', '音频', '图片', 'convert', 'format', 'ffmpeg', 'mp4', 'mp3', 'jpg', 'png'],
  // 格式工厂
  image_format_convert: ['图片', '格式', '转换', 'image', 'convert', 'jpg', 'png', 'webp', 'bmp', 'gif', 'ico', 'tiff'],
  video_format_convert: ['视频', '格式', '转换', 'video', 'convert', 'mp4', 'avi', 'mkv', 'mov', 'flv', 'webm'],
  audio_format_convert: ['音频', '格式', '转换', 'audio', 'convert', 'mp3', 'aac', 'wav', 'flac', 'ogg', 'm4a'],
  video_to_audio: ['视频', '转', '音频', '提取', 'video', 'audio', 'extract', 'mp3', 'wav'],
  video_to_gif: ['视频', '转', 'GIF', '动图', 'video', 'gif', 'animation'],
  batch_format_convert: ['批量', '格式', '转换', 'batch', 'convert', '文件夹', '多个'],
  compress_image: ['压缩', '图片', '图像', '缩小', 'compress', 'image', '质量', '体积', 'jpg', 'png'],
  compress_video: ['压缩', '视频', '缩小', 'compress', 'video', '质量', '体积', 'mp4', '码率'],
  extract_audio: ['提取', '音频', '视频', '分离', 'extract', 'audio', 'mp3', '声音', '音轨'],
  trim_video: ['裁剪', '视频', '剪切', '截取', 'trim', 'cut', 'video', '片段', '时长'],
  merge_media: ['合并', '视频', '音频', '拼接', 'merge', 'concat', '连接', '组合', '混合', '替换', '配音', '背景音乐'],
  add_watermark: ['水印', '添加', '图片', '视频', 'watermark', '标记', '文字', 'logo'],
  download_m3u8: ['下载', 'M3U8', 'HLS', '视频', '流媒体', 'download', 'm3u8', 'stream', '直播', '录制'],
  ytdlp_download: ['下载', '视频', 'YouTube', 'B站', 'bilibili', '抖音', 'TikTok', 'Twitter', '油管', 'youtube', '在线视频', 'yt-dlp', 'ytdlp', 'twitch', '微博'],
  ytdlp_download_audio: ['下载', '音频', '音乐', 'mp3', 'wav', 'aac', 'opus', 'flac', '提取', 'YouTube', 'B站', 'audio', 'song', 'music', 'yt-dlp'],
  ytdlp_get_info: ['信息', '元数据', '标题', '时长', '作者', '封面', 'info', 'metadata', 'yt-dlp', '查询', '视频信息'],
  ytdlp_list_formats: ['格式', '清晰度', '分辨率', '编码', 'format', 'resolution', '可用', 'list', 'yt-dlp'],
  ytdlp_download_subtitle: ['字幕', 'subtitle', 'srt', 'vtt', 'caption', '自动字幕', 'YouTube字幕', 'cc', 'yt-dlp'],
  ytdlp_download_playlist: ['播放列表', '批量', '频道', 'playlist', 'channel', 'batch', 'YouTube', '合集', '系列', 'yt-dlp'],
  rotate_video: ['旋转', '翻转', '视频', '方向', 'rotate', 'flip', '镜像', '倒转', '90度', '180度'],
  video_speed: ['倍速', '加速', '减速', '快进', '慢放', 'speed', 'fast', 'slow', '2倍速', '0.5倍'],
  extract_frame: ['截取', '帧', '视频', '图片', '封面', 'frame', 'extract', 'thumbnail', '关键帧'],
  add_subtitle: ['字幕', '添加', '视频', '烧录', 'subtitle', 'srt', 'ass', '硬字幕'],
  adjust_volume: ['音量', '调节', '增大', '减小', '音频', 'volume', '声音', '响度', '静音'],
  resize_video: ['分辨率', '调整', '缩放', '视频', '尺寸', 'resize', 'scale', '1080p', '720p', '4K'],
  // AI识别
  face_recognition: ['人脸', '识别', '面部', '检测', 'face', 'recognition', '比对', '匹配', '身份'],
  image_ocr: ['图片', 'OCR', '文字', '识别', '提取', 'text', '扫描', '文本'],
  // PDF处理
  pdf_to_images: ['PDF', '转', '图片', '导出', 'pdf', 'image', 'convert', '转换', '页面'],
  images_to_pdf: ['图片', '转', 'PDF', '合成', 'image', 'pdf', 'convert', '转换', '生成'],
  pdf_merge: ['PDF', '合并', '拼接', 'merge', 'combine', '组合', '多个'],
  pdf_split: ['PDF', '拆分', '分割', 'split', '分离', '单页'],
  pdf_extract_text: ['PDF', '提取', '文本', '文字', 'extract', 'text', 'OCR', '内容'],
  pdf_extract_images: ['PDF', '提取', '图片', '图像', 'extract', 'image', '导出'],
  pdf_encrypt: ['PDF', '加密', '密码', 'encrypt', 'password', '保护', '安全'],
  pdf_decrypt: ['PDF', '解密', '密码', 'decrypt', 'password', '解锁'],
  pdf_add_watermark: ['PDF', '水印', '添加', 'watermark', '标记', '文字', '图片'],
  pdf_rotate: ['PDF', '旋转', '页面', 'rotate', '方向', '90度', '180度'],
  pdf_delete_pages: ['PDF', '删除', '页面', 'delete', 'page', '移除'],
  pdf_get_info: ['PDF', '信息', '属性', 'info', '页数', '大小', '元数据'],
  pdf_compress: ['PDF', '压缩', '缩小', 'compress', '体积', '优化'],
  pdf_insert_pages: ['PDF', '插入', '页面', 'insert', 'page', '添加'],
  pdf_reorder_pages: ['PDF', '重排', '页面', '顺序', 'reorder', 'page', '调整'],
  pdf_to_word: ['PDF', '转', 'Word', '文档', 'docx', '转换', 'convert'],
  // 其他
  export_log: ['导出', '日志', 'export', 'log', '保存', '记录', 'txt', 'json', 'csv'],
  click_text: ['点击', '文本', '文字', 'OCR', 'click', 'text', '识别', '屏幕'],
  hover_image: ['悬停', '图像', '图片', 'hover', 'image', '鼠标', '移动'],
  hover_text: ['悬停', '文本', '文字', 'hover', 'text', 'OCR', '鼠标'],
  drag_image: ['拖拽', '图像', '图片', 'drag', 'image', '拖动', '移动', '长按'],
  // 图像处理
  image_grayscale: ['图片', '去色', '灰度', '黑白', 'grayscale', 'gray', '转换'],
  image_round_corners: ['图片', '圆角', '圆角化', 'round', 'corners', '边角', '美化'],
  // 音频处理
  audio_to_text: ['音频', '转', '文本', '语音', '识别', 'speech', 'text', '转写', '听写'],
  // 二维码
  qr_generate: ['二维码', '生成', 'QR', 'qrcode', '创建', '制作'],
  qr_decode: ['二维码', '解码', '识别', 'QR', 'qrcode', '扫描', '读取'],
  // 盲水印
  bwm_embed_text: ['盲水印', '隐藏水印', '嵌入', '文字', '版权', 'blind', 'watermark', 'invisible', '盲', '不可见'],
  bwm_extract_text: ['盲水印', '隐藏水印', '提取', '文字', '识别', 'blind', 'watermark', 'extract', '解码'],
  bwm_embed_image: ['盲水印', '隐藏水印', '嵌入', '图片', '版权', 'blind', 'watermark', 'image', '图像'],
  bwm_extract_image: ['盲水印', '隐藏水印', '提取', '图片', '识别', 'blind', 'watermark', 'extract'],
  // 录屏
  screen_record: ['录屏', '屏幕', '录制', 'record', 'screen', '视频', '桌面'],
  camera_capture: ['摄像头', '拍照', '照相', 'camera', 'capture', 'photo', '相机', '摄影'],
  camera_record: ['摄像头', '录像', '录制', 'camera', 'record', 'video', '相机', '摄影'],
  // 网络共享
  share_folder: ['共享', '文件夹', '网络', '局域网', 'share', 'folder', 'LAN', '分享', '传输'],
  share_file: ['共享', '文件', '网络', '局域网', 'share', 'file', 'LAN', '分享', '传输'],
  stop_share: ['停止', '共享', '关闭', 'stop', 'share', '结束'],
  // 屏幕共享
  start_screen_share: ['屏幕', '共享', '开始', '直播', '投屏', 'screen', 'share', 'cast', '局域网', '实时', '画面'],
  stop_screen_share: ['屏幕', '共享', '停止', '结束', 'screen', 'share', 'stop', '关闭'],
  // 文件操作
  list_files: ['文件', '列表', '目录', '文件夹', '获取', 'list', 'files', 'folder', 'directory', '遍历', '扫描'],
  copy_file: ['复制', '文件', '拷贝', 'copy', 'file', '副本'],
  move_file: ['移动', '文件', '剪切', 'move', 'file', '转移'],
  delete_file: ['删除', '文件', '移除', 'delete', 'file', 'remove', '清除'],
  create_folder: ['创建', '文件夹', '目录', 'create', 'folder', 'mkdir', 'directory', '新建'],
  file_exists: ['文件', '存在', '判断', '检查', 'exists', 'file', 'check'],
  get_file_info: ['文件', '信息', '属性', '大小', '时间', 'info', 'file', 'size', 'stat'],
  read_text_file: ['读取', '文本', '文件', 'read', 'text', 'file', '内容', 'txt'],
  write_text_file: ['写入', '文本', '文件', 'write', 'text', 'file', '保存', 'txt'],
  rename_file: ['重命名', '文件', '改名', 'rename', 'file', '修改', '名称'],
  rename_folder: ['重命名', '文件夹', '目录', '改名', 'rename', 'folder', 'directory', '修改', '名称'],
  macro_recorder: ['宏', '录制', '鼠标', '键盘', '回放', '播放', 'macro', 'record', 'replay', '自动化', '操作', '录像'],
  // QQ自动化
  qq_send_message: ['QQ', '发送', '消息', '私聊', '群聊', 'qq', 'message', 'send', '聊天'],
  qq_send_image: ['QQ', '发送', '图片', '私聊', '群聊', 'qq', 'image', 'send', '照片'],
  qq_send_file: ['QQ', '发送', '文件', '私聊', '群聊', 'qq', 'file', 'send', '上传', '群文件'],
  qq_get_friends: ['QQ', '好友', '列表', '获取', 'qq', 'friends', 'list', '联系人'],
  qq_get_groups: ['QQ', '群', '列表', '获取', 'qq', 'groups', 'list', '群组'],
  qq_get_group_members: ['QQ', '群成员', '列表', '获取', 'qq', 'group', 'members', '成员'],
  qq_get_login_info: ['QQ', '登录', '信息', '获取', 'qq', 'login', 'info', '账号', '用户'],
  qq_wait_message: ['QQ', '等待', '消息', '接收', '监听', 'qq', 'wait', 'message', 'receive', '触发'],
  // 微信自动化
  wechat_send_message: ['微信', '发送', '消息', 'wechat', 'weixin', 'message', 'send', '聊天'],
  wechat_send_file: ['微信', '发送', '文件', '图片', 'wechat', 'weixin', 'file', 'image', 'send', '上传'],
  // 手机自动化
  phone_tap: ['手机', '点击', '触摸', 'phone', 'tap', 'click', 'touch', '坐标'],
  phone_swipe: ['手机', '滑动', '滑屏', 'phone', 'swipe', 'slide', '手势'],
  phone_long_press: ['手机', '长按', '按住', 'phone', 'long', 'press', 'hold'],
  phone_input_text: ['手机', '输入', '文本', 'phone', 'input', 'text', 'type', '打字'],
  phone_press_key: ['手机', '按键', '物理键', 'phone', 'key', 'button', 'home', 'back'],
  phone_screenshot: ['手机', '截图', '截屏', 'phone', 'screenshot', 'capture', '屏幕'],
  phone_start_mirror: ['手机', '镜像', '投屏', 'phone', 'mirror', 'screen', 'scrcpy', '屏幕共享'],
  phone_stop_mirror: ['手机', '停止', '镜像', 'phone', 'stop', 'mirror', '关闭'],
  phone_install_app: ['手机', '安装', '应用', 'phone', 'install', 'app', 'apk'],
  phone_start_app: ['手机', '启动', '应用', 'phone', 'start', 'app', '打开'],
  phone_stop_app: ['手机', '停止', '应用', 'phone', 'stop', 'app', '关闭', '强制停止'],
  phone_uninstall_app: ['手机', '卸载', '应用', 'phone', 'uninstall', 'app', '删除'],
  phone_push_file: ['手机', '推送', '文件', '上传', 'phone', 'push', 'file', 'upload'],
  phone_pull_file: ['手机', '拉取', '文件', '下载', 'phone', 'pull', 'file', 'download'],
  phone_click_image: ['手机', '点击', '图像', '图片', 'phone', 'click', 'image', '识别', '视觉'],
  phone_click_text: ['手机', '点击', '文本', '文字', 'phone', 'click', 'text', 'ocr', '识别'],
  phone_wait_image: ['手机', '等待', '图像', '图片', 'phone', 'wait', 'image', '识别', '出现'],
  phone_image_exists: ['手机', '图像', '存在', '判断', '检测', 'phone', 'image', 'exists', '识别', '条件', '分支'],
  phone_set_volume: ['手机', '设置', '音量', '声音', 'phone', 'volume', 'sound', '调节'],
  phone_set_brightness: ['手机', '设置', '亮度', '屏幕', 'phone', 'brightness', 'screen', '调节'],
  phone_set_clipboard: ['手机', '写入', '剪贴板', '复制', 'phone', 'clipboard', 'copy', '粘贴板'],
  phone_get_clipboard: ['手机', '读取', '剪贴板', '粘贴', 'phone', 'clipboard', 'paste', '粘贴板'],
  select_dropdown: ['下拉', '选择', 'select', 'dropdown'],
  set_checkbox: ['复选框', '勾选', 'checkbox', '选中'],
  drag_element: ['拖拽', '拖动', 'drag', '移动'],
  scroll_page: ['滚动', '滑动', 'scroll', '翻页'],
  upload_file: ['上传', '文件', 'upload', 'file'],
  get_child_elements: ['子元素', '获取', '列表', 'child', 'children', 'elements', '子节点'],
  get_sibling_elements: ['兄弟元素', '同级', '获取', '列表', 'sibling', 'elements', '兄弟节点'],
  download_file: ['下载', '文件', 'download', 'file'],
  save_image: ['保存', '图片', 'save', 'image'],
  screenshot: ['截图', '网页', '网页截图', 'screenshot', '快照', '页面'],
  read_excel: ['读取', 'excel', '表格', 'xlsx', 'xls', '数据', '文件', '资产'],
  // Excel 自动化（openpyxl）
  excel_create: ['excel', '创建', '新建', '工作簿', 'xlsx', '表格', 'create'],
  excel_add_sheet: ['excel', '添加', '工作表', 'sheet', '新增', 'add'],
  excel_delete_sheet: ['excel', '删除', '工作表', 'sheet', 'delete'],
  excel_rename_sheet: ['excel', '重命名', '工作表', 'sheet', 'rename'],
  excel_list_sheets: ['excel', '列出', '工作表', 'sheet', 'list', '所有'],
  excel_copy_sheet: ['excel', '复制', '工作表', 'sheet', 'copy', '副本'],
  excel_move_sheet: ['excel', '移动', '工作表', 'sheet', 'move', '顺序'],
  excel_set_tab_color: ['excel', '标签', '颜色', 'tab', 'color', '工作表'],
  excel_clear_sheet: ['excel', '清空', '工作表', 'sheet', 'clear'],
  excel_get_info: ['excel', '信息', '行数', '列数', 'info', '维度'],
  excel_write_cell: ['excel', '写入', '单元格', 'cell', 'write', '填写'],
  excel_read_cell: ['excel', '读取', '单元格', 'cell', 'read'],
  excel_write_range: ['excel', '写入', '区域', '范围', 'range', '批量', '二维'],
  excel_read_range: ['excel', '读取', '区域', '范围', 'range', '批量'],
  excel_append_row: ['excel', '追加', '行', 'append', 'row', '末尾'],
  excel_write_dicts: ['excel', '写入', '字典', '记录', 'dict', '表头', '对象'],
  excel_read_dicts: ['excel', '读取', '字典', '记录', 'dict', '表头', '对象'],
  excel_copy_range: ['excel', '复制', '区域', 'copy', 'range'],
  excel_clear_range: ['excel', '清空', '区域', 'clear', 'range'],
  excel_find_replace: ['excel', '查找', '替换', 'find', 'replace'],
  excel_insert_rows: ['excel', '插入', '行', 'insert', 'row'],
  excel_delete_rows: ['excel', '删除', '行', 'delete', 'row'],
  excel_insert_cols: ['excel', '插入', '列', 'insert', 'column', 'col'],
  excel_delete_cols: ['excel', '删除', '列', 'delete', 'column', 'col'],
  excel_hide: ['excel', '隐藏', '显示', 'hide', '行', '列'],
  excel_set_size: ['excel', '行高', '列宽', 'size', 'width', 'height', '尺寸'],
  excel_set_formula: ['excel', '公式', 'formula', 'sum', '函数', '计算'],
  excel_read_formula: ['excel', '读取', '公式', '计算值', 'formula', 'value'],
  excel_merge_cells: ['excel', '合并', '单元格', 'merge', '拆分'],
  excel_freeze_panes: ['excel', '冻结', '窗格', 'freeze', '首行'],
  excel_set_style: ['excel', '样式', '字体', '颜色', '加粗', 'style', 'font', '背景'],
  excel_set_border: ['excel', '边框', 'border', '线框'],
  excel_number_format: ['excel', '格式', '数字', '日期', '货币', '百分比', 'format'],
  excel_set_hyperlink: ['excel', '超链接', '链接', 'hyperlink', 'link'],
  excel_set_comment: ['excel', '批注', '注释', 'comment', '备注'],
  excel_add_image: ['excel', '图片', '插入', 'image', '图像'],
  excel_add_chart: ['excel', '图表', '柱状', '折线', '饼图', 'chart', 'graph'],
  excel_data_validation: ['excel', '数据验证', '下拉', '列表', 'validation', 'dropdown'],
  excel_conditional_format: ['excel', '条件格式', '高亮', '色阶', 'conditional', '数据条'],
  excel_auto_filter: ['excel', '筛选', '自动筛选', 'filter'],
  excel_sort_range: ['excel', '排序', 'sort', '升序', '降序'],
  excel_remove_duplicates: ['excel', '去重', '重复', 'duplicate', '删除重复'],
  excel_to_csv: ['excel', '导出', 'csv', '转换'],
  excel_from_csv: ['excel', 'csv', '导入', '转换', 'xlsx'],
  excel_protect_sheet: ['excel', '保护', '密码', 'protect', '锁定'],
  excel_page_setup: ['excel', '页面', '打印', '纸张', '方向', 'print', 'page'],
  excel_set_zoom: ['excel', '缩放', '视图', 'zoom', '网格线'],
  excel_count_rows: ['excel', '总行数', '行数', '统计', 'count', 'rows'],
  excel_find_empty_row: ['excel', '空行', '第一个空行', 'empty', 'row', '追加位置'],
  excel_find_empty_col: ['excel', '空列', '第一个空列', 'empty', 'column', 'col'],
  excel_find_empty_cell: ['excel', '空单元格', '空白', 'empty', 'cell'],
  excel_fill_range: ['excel', '填充', '批量', 'fill', '区域'],
  excel_clear_style: ['excel', '删除样式', '清除格式', 'clear', 'style', '清样式'],
  excel_activate_sheet: ['excel', '激活', '工作表', 'sheet', 'activate', '切换'],
  excel_save_as: ['excel', '另存为', '保存', 'save', 'saveas', '复制'],
  excel_pivot_table: ['excel', '数据透视表', '透视', '分组', '聚合', 'pivot', '汇总'],
  excel_to_pdf: ['excel', '导出', 'pdf', '转换', '打印'],
  excel_run_macro: ['excel', '宏', '运行宏', 'macro', 'vba'],
  excel_refresh_data: ['excel', '刷新', '刷新数据', 'refresh', '透视表', '外部数据'],
  // 字符串操作
  regex_extract: ['正则', '提取', '匹配', 'regex', 'regexp', '表达式', '搜索', 'match', 'find', '查找'],
  string_replace: ['替换', '字符串', 'replace', '文本', '修改', '更换'],
  string_split: ['分割', '拆分', '字符串', 'split', '切割', '分隔'],
  string_join: ['连接', '合并', '拼接', 'join', '字符串', '组合', '列表'],
  string_concat: ['拼接', '字符串', 'concat', '合并', '连接', '组合', '加'],
  string_trim: ['去除', '空白', '空格', 'trim', '修剪', '清理', '首尾'],
  string_case: ['大小写', '转换', '大写', '小写', 'case', 'upper', 'lower', '首字母'],
  string_substring: ['截取', '子串', '字符串', 'substring', 'slice', '切片', '部分'],
  // 列表操作
  list_operation: ['列表', '数组', '添加', '删除', '修改', 'list', 'array', 'push', 'pop', 'append'],
  list_get: ['列表', '取值', '获取', '元素', '索引', 'list', 'get', 'index'],
  list_length: ['列表', '长度', '数量', 'length', 'count', 'size'],
  list_export: ['列表', '导出', 'txt', '文本', '保存', 'export', 'save', '文件'],
  // 字典操作
  dict_operation: ['字典', '对象', '添加', '删除', '修改', 'dict', 'object', 'set', 'key', 'value'],
  dict_get: ['字典', '取值', '获取', '值', 'dict', 'get', 'key'],
  dict_keys: ['字典', '键', '列表', '所有', 'keys', 'dict'],
  // 数据表格操作
  table_add_row: ['数据', '表格', '添加', '行', 'table', 'row', 'add', '新增', '插入'],
  table_add_column: ['数据', '表格', '添加', '列', 'table', 'column', 'add', '新增'],
  table_set_cell: ['数据', '表格', '设置', '单元格', 'table', 'cell', 'set', '修改', '更新'],
  table_get_cell: ['数据', '表格', '读取', '单元格', 'table', 'cell', 'get', '获取', '取值'],
  table_delete_row: ['数据', '表格', '删除', '行', 'table', 'row', 'delete', '移除'],
  table_clear: ['数据', '表格', '清空', 'table', 'clear', '清除', '重置'],
  table_export: ['数据', '表格', '导出', 'table', 'export', 'excel', 'csv', '下载', '保存'],
  api_request: ['http', '请求', 'api', 'get', 'post', 'request', '接口', '网络'],
  send_email: ['发送', '邮件', 'email', 'mail', 'qq'],
  ai_chat: ['ai', '对话', '智能', 'chat', 'gpt', '大模型', '智谱', 'deepseek', '聊天', '问答'],
  ai_vision: ['图像', '识别', 'ai', '视觉', '图片', 'vision', '看图', 'glm', '理解', '分析'],
  ai_extract: ['ai', '抽取', '提取', '结构化', '信息', 'extract', 'json', '字段', '解析'],
  ai_classify: ['ai', '分类', '归类', 'classify', '类别', '标签', '意图'],
  ai_summarize: ['ai', '摘要', '总结', '概括', 'summary', 'summarize', '提炼'],
  ai_translate: ['ai', '翻译', 'translate', '中译英', '英译中', '多语言', '语言'],
  ai_sentiment: ['ai', '情感', '情绪', '舆情', 'sentiment', '正面', '负面', '好评', '差评'],
  ai_normalize: ['ai', '规整', '清洗', '标准化', 'normalize', '日期', '金额', '电话', '格式', '统一'],
  ai_dedup_semantic: ['ai', '去重', '语义去重', 'dedup', '重复', '合并', '相似'],
  ai_route: ['ai', '路由', '分流', '判断', 'route', '决策', '分支', '意图', '智能'],
  ai_smart_scraper: ['ai', '智能', '爬虫', '抓取', '提取', 'scraper', '数据', '网页', '自然语言', '自适应', '结构变化', 'scrapegraph'],
  ai_element_selector: ['ai', '智能', '元素', '选择器', 'selector', '查找', '定位', '自然语言', '自适应', '结构变化', 'scrapegraph'],
  firecrawl_scrape: ['ai', '单页', '抓取', '数据', 'firecrawl', 'scrape', '网页', '智能', '提取', '爬虫', '采集'],
  firecrawl_map: ['ai', '网站', '链接', '抓取', 'firecrawl', 'map', '地图', '导航', '站点', '结构', '爬虫'],
  firecrawl_crawl: ['ai', '全站', '抓取', '数据', 'firecrawl', 'crawl', '爬虫', '网站', '批量', '深度', '采集'],
  ocr_captcha: ['ocr', '识别', '验证码', '文字', 'captcha'],
  slider_captcha: ['滑块', '验证', '验证码', 'slider', '拖动'],
  condition: ['条件', '判断', 'if', 'condition', '分支'],
  loop: ['循环', '重复', 'loop', 'for', '次数'],
  foreach: ['遍历', '列表', 'foreach', '数组', 'each'],
  break_loop: ['跳出', '循环', 'break', '退出'],
  continue_loop: ['跳过', '当前', '本次', '循环', 'continue', '下一次', 'skip'],
  assert_checkpoint: ['断言', '检查点', '校验', '验证', 'assert', 'checkpoint', '稳定性', '测试', '期望', '检查'],
  scheduled_task: ['定时', '执行', '计划', '任务', 'schedule', 'timer', 'cron', '时间', '延迟'],
  subflow: ['子流程', '复用', '调用', '函数', 'subflow', 'call', '引用', '嵌套', '模块化'],
  // 触发器
  webhook_trigger: ['webhook', '触发器', 'http', '请求', '回调', 'trigger', 'api', '接口', '钩子'],
  hotkey_trigger: ['热键', '快捷键', '触发器', 'hotkey', 'shortcut', 'trigger', '按键', '组合键', 'ctrl', 'alt', 'shift'],
  file_watcher_trigger: ['文件', '监控', '触发器', '文件夹', 'file', 'watcher', 'trigger', '创建', '修改', '删除', '变化'],
  email_trigger: ['邮件', '触发器', 'email', 'mail', 'trigger', '收件', '邮箱', 'imap', '监控'],
  api_trigger: ['api', '触发器', '轮询', 'trigger', 'polling', '接口', '状态', '检查', '等待'],
  mouse_trigger: ['鼠标', '触发器', 'mouse', 'trigger', '点击', '移动', '滚轮', '左键', '右键', '中键'],
  image_trigger: ['图像', '触发器', 'image', 'trigger', '图片', '识别', '检测', '出现', '屏幕'],
  sound_trigger: ['声音', '触发器', 'sound', 'trigger', '音频', '音量', '检测', '监听', '麦克风'],
  face_trigger: ['人脸', '触发器', 'face', 'trigger', '面部', '识别', '检测', '摄像头', '相机'],
  gesture_trigger: ['手势', '触发器', 'gesture', 'trigger', '手部', '识别', '检测', '摄像头', '相机', 'mediapipe', '动作', '姿态'],
  element_change_trigger: ['元素', '变化', '触发器', 'element', 'change', 'trigger', '子元素', '数量', '监控', '直播', '评论', '聊天', '消息', '实时'],
  group: ['分组', '注释', '备注', 'group', 'comment', '框', '区域'],
  subflow_header: ['子流程头', '函数头', '子流程定义', 'header', 'function'],
  note: ['便签', '笔记', '备注', 'note', 'sticky', '文本', '说明'],
  // 数据库操作
  db_connect: ['数据库', '连接', 'mysql', 'database', 'connect', '登录', '链接'],
  db_query: ['数据库', '查询', 'select', 'query', '搜索', '读取', '获取'],
  db_execute: ['数据库', '执行', 'sql', 'execute', '语句', '命令'],
  db_insert: ['数据库', '插入', 'insert', '添加', '新增', '写入'],
  db_update: ['数据库', '更新', 'update', '修改', '编辑'],
  db_delete: ['数据库', '删除', 'delete', '移除', '清除'],
  db_close: ['数据库', '关闭', '断开', 'close', 'disconnect', '连接'],
  // 文档转换 (13个)
  markdown_to_html: ['markdown', 'md', 'html', '转换', '文档', 'convert', '网页', '格式'],
  html_to_markdown: ['html', 'markdown', 'md', '转换', '文档', 'convert', '网页', '格式'],
  markdown_to_pdf: ['markdown', 'md', 'pdf', '转换', '文档', 'convert', '格式', 'latex'],
  markdown_to_docx: ['markdown', 'md', 'word', 'docx', '转换', '文档', 'convert', '格式'],
  docx_to_markdown: ['word', 'docx', 'markdown', 'md', '转换', '文档', 'convert', '格式'],
  html_to_docx: ['html', 'word', 'docx', '转换', '文档', 'convert', '网页', '格式'],
  docx_to_html: ['word', 'docx', 'html', '转换', '文档', 'convert', '网页', '格式'],
  markdown_to_epub: ['markdown', 'md', 'epub', '电子书', '转换', '文档', 'convert', '格式', '书籍'],
  epub_to_markdown: ['epub', '电子书', 'markdown', 'md', '转换', '文档', 'convert', '格式'],
  latex_to_pdf: ['latex', 'tex', 'pdf', '转换', '文档', 'convert', '格式', '论文'],
  rst_to_html: ['rst', 'restructuredtext', 'html', '转换', '文档', 'convert', '格式'],
  org_to_html: ['org', 'orgmode', 'html', '转换', '文档', 'convert', '格式', 'emacs'],
  universal_doc_convert: ['文档', '转换', '通用', 'pandoc', 'convert', '格式', '万能', '任意'],
  // Pillow图像处理 (16个)
  image_resize: ['图片', '缩放', '调整', '大小', '尺寸', 'resize', 'scale', '放大', '缩小', '宽度', '高度'],
  image_crop: ['图片', '裁剪', '剪切', '截取', 'crop', 'cut', '区域', '选区'],
  image_rotate: ['图片', '旋转', '角度', 'rotate', '转动', '方向', '90度', '180度'],
  image_flip: ['图片', '翻转', '镜像', 'flip', 'mirror', '水平', '垂直', '倒转'],
  image_blur: ['图片', '模糊', '虚化', 'blur', '高斯', '柔化', '朦胧'],
  image_sharpen: ['图片', '锐化', '清晰', 'sharpen', '增强', '细节', '锐利'],
  image_brightness: ['图片', '亮度', '明暗', 'brightness', '调节', '增亮', '变暗'],
  image_contrast: ['图片', '对比度', 'contrast', '调节', '增强', '反差'],
  image_color_balance: ['图片', '色彩', '饱和度', '颜色', 'color', 'balance', '调节', '鲜艳'],
  image_convert_format: ['图片', '格式', '转换', 'convert', 'format', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'heic'],
  image_add_text: ['图片', '添加', '文字', '文本', '水印', 'text', 'add', '标注', '字体'],
  image_merge: ['图片', '拼接', '合并', '组合', 'merge', 'concat', '横向', '纵向', '拼图'],
  image_thumbnail: ['图片', '缩略图', '预览', 'thumbnail', '小图', '图标'],
  image_filter: ['图片', '滤镜', '特效', 'filter', '效果', '风格', '艺术', '边缘', '浮雕'],
  image_get_info: ['图片', '信息', '属性', '元数据', 'info', 'exif', '尺寸', '格式', '大小'],
  image_remove_bg: ['图片', '去背景', '抠图', '透明', 'background', 'remove', '去除', '背景色'],
  // 实用工具模块
  file_hash_compare: ['文件', '哈希', '对比', '比较', 'hash', 'compare', 'md5', 'sha', '校验', '相同'],
  file_diff_compare: ['文件', '差异', '对比', '比较', 'diff', 'compare', '不同', '变化', '修改'],
  folder_hash_compare: ['文件夹', '目录', '哈希', '对比', '比较', 'folder', 'hash', 'compare', '相同'],
  folder_diff_compare: ['文件夹', '目录', '差异', '对比', '比较', 'folder', 'diff', 'compare', '不同', '变化'],
  random_password_generator: ['密码', '生成', '随机', 'password', 'random', 'generate', '安全', '强度'],
  url_encode_decode: ['URL', '编码', '解码', 'encode', 'decode', '转义', '网址', '链接'],
  md5_encrypt: ['MD5', '加密', '哈希', 'hash', 'encrypt', '摘要', '校验'],
  sha_encrypt: ['SHA', '加密', '哈希', 'hash', 'encrypt', 'sha1', 'sha256', 'sha512', '摘要'],
  timestamp_converter: ['时间戳', '转换', 'timestamp', 'convert', '日期', '时间', 'unix'],
  rgb_to_hsv: ['RGB', 'HSV', '颜色', '转换', 'color', 'convert', '色彩空间'],
  rgb_to_cmyk: ['RGB', 'CMYK', '颜色', '转换', 'color', 'convert', '印刷', '色彩空间'],
  hex_to_cmyk: ['HEX', 'CMYK', '颜色', '转换', 'color', 'convert', '十六进制', '印刷'],
  uuid_generator: ['UUID', '生成', 'generate', '唯一', '标识符', 'guid', '随机'],
  printer_call: ['打印', '打印机', 'printer', 'print', '文档', 'PDF', 'Word', '图片'],
  // 列表运算
  list_sum: ['列表', '求和', '总和', 'sum', 'total', '加法', '数组'],
  list_average: ['列表', '平均值', '均值', 'average', 'mean', '数组'],
  list_max: ['列表', '最大值', 'max', 'maximum', '数组'],
  list_min: ['列表', '最小值', 'min', 'minimum', '数组'],
  list_sort: ['列表', '排序', 'sort', '升序', '降序', '数组'],
  list_unique: ['列表', '去重', '唯一', 'unique', 'distinct', '数组'],
  list_slice: ['列表', '截取', '切片', 'slice', '数组'],
  // 数学运算
  math_round: ['数学', '四舍五入', '取整', 'round', '小数'],
  math_base_convert: ['数学', '进制', '转换', 'base', 'convert', '二进制', '十六进制'],
  math_floor: ['数学', '向下取整', 'floor', '取整'],
  math_modulo: ['数学', '求余', '取模', 'modulo', 'mod', '余数'],
  math_abs: ['数学', '绝对值', 'abs', 'absolute'],
  math_sqrt: ['数学', '开方', '平方根', 'sqrt', 'square root'],
  math_power: ['数学', '次方', '幂', 'power', '指数'],
  // 列表高级操作
  list_reverse: ['列表', '反转', '倒序', 'reverse', '数组'],
  list_find: ['列表', '查找', '搜索', 'find', 'search', '索引', '数组'],
  list_count: ['列表', '计数', '统计', 'count', '出现次数', '数组'],
  list_filter: ['列表', '过滤', '筛选', 'filter', '条件', '数组'],
  list_map: ['列表', '映射', '转换', 'map', '遍历', '数组'],
  list_merge: ['列表', '合并', '连接', 'merge', 'concat', '数组'],
  list_flatten: ['列表', '扁平化', '展平', 'flatten', '嵌套', '数组'],
  list_chunk: ['列表', '分组', '分块', 'chunk', '切分', '数组'],
  list_remove_empty: ['列表', '去空', '移除', 'remove', 'empty', 'null', '数组'],
  list_intersection: ['列表', '交集', 'intersection', '共同', '数组'],
  list_union: ['列表', '并集', 'union', '合并', '数组'],
  list_difference: ['列表', '差集', 'difference', '不同', '数组'],
  list_cartesian_product: ['列表', '笛卡尔积', 'cartesian', 'product', '组合', '数组'],
  list_shuffle: ['列表', '打乱', '随机', 'shuffle', '乱序', '数组'],
  list_sample: ['列表', '采样', '抽取', 'sample', '随机', '数组'],
  // 字典高级操作
  dict_merge: ['字典', '合并', 'merge', 'dict', 'object', '对象'],
  dict_filter: ['字典', '过滤', '筛选', 'filter', 'dict', '对象'],
  dict_map_values: ['字典', '映射', '转换', 'map', 'values', '对象'],
  dict_invert: ['字典', '反转', '键值互换', 'invert', 'reverse', '对象'],
  dict_sort: ['字典', '排序', 'sort', 'dict', '对象'],
  dict_deep_copy: ['字典', '深拷贝', 'deep', 'copy', 'clone', '对象'],
  dict_get_path: ['字典', '路径', '取值', 'path', 'get', '嵌套', '对象'],
  dict_flatten: ['字典', '扁平化', '展平', 'flatten', '嵌套', '对象'],
  // 高级数学运算
  math_log: ['数学', '对数', 'log', 'logarithm', 'ln'],
  math_trig: ['数学', '三角函数', 'sin', 'cos', 'tan', 'trig'],
  math_exp: ['数学', '指数', 'exp', 'e', '自然常数'],
  math_gcd: ['数学', '最大公约数', 'gcd', '公约数'],
  math_lcm: ['数学', '最小公倍数', 'lcm', '公倍数'],
  math_factorial: ['数学', '阶乘', 'factorial', '!'],
  math_permutation: ['数学', '排列', '组合', 'permutation', 'combination'],
  math_percentage: ['数学', '百分比', 'percentage', '%', '占比'],
  math_clamp: ['数学', '范围限制', 'clamp', '最大', '最小'],
  math_random_advanced: ['数学', '随机数', 'random', '高级', '分布'],
  // 统计分析
  stat_median: ['统计', '中位数', 'median', '中间值'],
  stat_mode: ['统计', '众数', 'mode', '最多'],
  stat_variance: ['统计', '方差', 'variance', '离散'],
  stat_stdev: ['统计', '标准差', 'stdev', 'standard deviation'],
  stat_percentile: ['统计', '百分位数', 'percentile', '分位数'],
  stat_normalize: ['统计', '归一化', 'normalize', '0-1'],
  stat_standardize: ['统计', '标准化', 'standardize', 'z-score'],
  // 字符串转换
  csv_parse: ['CSV', '解析', 'parse', '表格', '逗号分隔'],
  csv_generate: ['CSV', '生成', 'generate', '表格', '导出'],
  list_to_string_advanced: ['列表', '字符串', '转换', 'string', 'join', '数组'],
  // 循环控制
  foreach_dict: ['遍历', '字典', 'foreach', 'dict', '循环', '对象'],
  // 测试报告
  allure_init: ['Allure', '初始化', '测试', '报告', 'test', 'report', 'init', '环境', '配置'],
  allure_start_test: ['Allure', '开始', '测试', '用例', 'test', 'case', 'start', '创建'],
  allure_add_step: ['Allure', '添加', '步骤', 'step', 'add', '测试', '记录'],
  allure_add_attachment: ['Allure', '添加', '附件', 'attachment', 'add', '截图', '文件', '日志'],
  allure_stop_test: ['Allure', '结束', '测试', '用例', 'test', 'case', 'stop', '完成'],
  allure_generate_report: ['Allure', '生成', '报告', 'report', 'generate', '测试', 'HTML'],
  // 桌面应用自动化
  desktop_app_start: ['桌面', '应用', '启动', '打开', 'desktop', 'app', 'start', 'launch', '程序', '软件', 'exe'],
  desktop_app_connect: ['桌面', '应用', '连接', '附加', 'desktop', 'app', 'connect', 'attach', '已运行'],
  desktop_app_close: ['桌面', '应用', '关闭', '退出', 'desktop', 'app', 'close', 'exit', '程序'],
  desktop_window_activate: ['桌面', '窗口', '激活', '聚焦', 'desktop', 'window', 'activate', 'focus', '置顶'],
  desktop_window_state: ['桌面', '窗口', '状态', '最大化', '最小化', 'desktop', 'window', 'state', 'maximize', 'minimize'],
  desktop_window_move: ['桌面', '窗口', '移动', '位置', 'desktop', 'window', 'move', 'position', '坐标'],
  desktop_window_resize: ['桌面', '窗口', '调整', '大小', 'desktop', 'window', 'resize', 'size', '尺寸'],
  desktop_window_topmost: ['桌面', '窗口', '置顶', '最前', 'desktop', 'window', 'topmost', 'top', '前台'],
  desktop_window_capture: ['桌面', '窗口', '截图', '截取', 'desktop', 'window', 'capture', 'screenshot', '保存'],
  desktop_find_control: ['桌面', '控件', '查找', '定位', 'desktop', 'control', 'find', 'locate', '元素'],
  desktop_wait_control: ['桌面', '控件', '等待', '出现', 'desktop', 'control', 'wait', 'appear', '存在'],
  desktop_click_control: ['桌面', '控件', '点击', '单击', 'desktop', 'control', 'click', '按钮'],
  desktop_input_control: ['桌面', '控件', '输入', '文本', 'desktop', 'control', 'input', 'text', '填写'],
  desktop_get_text: ['桌面', '控件', '文本', '获取', 'desktop', 'control', 'text', 'get', '读取'],
  desktop_select_combo: ['桌面', '下拉框', '选择', '下拉', 'desktop', 'combo', 'select', 'dropdown', '列表'],
  desktop_checkbox: ['桌面', '复选框', '勾选', '选中', 'desktop', 'checkbox', 'check', '多选'],
  desktop_radio: ['桌面', '单选按钮', '单选', '选择', 'desktop', 'radio', 'select', '单选框'],
  desktop_send_keys: ['桌面', '快捷键', '发送', '按键', 'desktop', 'keys', 'send', 'shortcut', 'ctrl'],
  desktop_scroll_control: ['桌面', '控件', '滚动', '滑动', 'desktop', 'control', 'scroll', 'slide', '翻页'],
  desktop_menu_click: ['桌面', '菜单', '点击', '选择', 'desktop', 'menu', 'click', 'select', '菜单项'],
  desktop_get_control_info: ['桌面', '控件', '信息', '获取', 'desktop', 'control', 'info', 'get', '属性', '详细'],
  desktop_get_control_tree: ['桌面', '控件', '树', '结构', 'desktop', 'control', 'tree', 'structure', '层级', '完整'],
  // 现代桌面应用增强（仅热键）
  desktop_hotkey: ['桌面', '热键', '快捷键', '组合键', 'hotkey', 'shortcut', 'desktop', 'ctrl', 'alt', '键盘'],
  // 影刀级桌面增强
  desktop_find_control_smart: ['桌面', '智能', '查找', '控件', '通配符', '模糊', 'smart', 'find', 'wildcard', 'fuzzy', '影刀'],
  desktop_extract_table: ['桌面', '批量', '抓取', '列表', '表格', 'extract', 'table', 'list', 'datagrid', 'data', '数据'],
  desktop_get_app_state: ['桌面', '应用', '状态', '快照', '树', 'app', 'state', 'snapshot', 'tree', 'UI', '感知'],
  desktop_query_with_xpath: ['桌面', 'XPath', '查询', '控件', 'query', 'xpath', '表达式', 'expression'],
  desktop_select_text: ['桌面', '选中', '文字', '复制', 'select', 'text', 'copy', '提取', '文本'],
  desktop_get_focused_control: ['桌面', '焦点', '当前', 'focus', 'focused', 'active', '活跃', '键盘'],
  desktop_assert_control: ['桌面', '断言', '验证', '测试', 'assert', 'verify', 'test', '检查'],
  desktop_app_get_info: ['桌面', '应用', '信息', '获取', 'desktop', 'app', 'info', 'get', '属性'],
  desktop_app_wait_ready: ['桌面', '应用', '等待', '就绪', 'desktop', 'app', 'wait', 'ready', '启动'],
  desktop_window_list: ['桌面', '窗口', '列表', '获取', 'desktop', 'window', 'list', '所有'],
  desktop_control_info: ['桌面', '控件', '信息', 'desktop', 'control', 'info', '属性'],
  desktop_control_tree: ['桌面', '控件', '树', 'desktop', 'control', 'tree', '结构'],
  desktop_set_value: ['桌面', '控件', '设置', '值', 'desktop', 'control', 'set', 'value'],
  desktop_drag_control: ['桌面', '控件', '拖拽', 'desktop', 'control', 'drag', '拖动'],
  desktop_list_operate: ['桌面', '列表', '操作', 'desktop', 'list', 'operate', '选择'],
  desktop_get_property: ['桌面', '控件', '属性', 'desktop', 'control', 'property', '获取'],
  desktop_dialog_handle: ['桌面', '对话框', '处理', 'desktop', 'dialog', 'handle', '弹窗'],
  // Apprise多渠道通知
  notify_discord: ['Discord', '通知', '消息', 'notify', 'webhook', '推送', '提醒'],
  notify_telegram: ['Telegram', '电报', '通知', '消息', 'notify', 'bot', '推送', '提醒'],
  notify_dingtalk: ['钉钉', '通知', '消息', 'dingtalk', 'notify', '机器人', '推送', '提醒', '群聊'],
  notify_wecom: ['企业微信', '微信', '通知', '消息', 'wecom', 'wechat', 'notify', '推送', '提醒'],
  notify_feishu: ['飞书', '通知', '消息', 'feishu', 'lark', 'notify', '机器人', '推送', '提醒'],
  notify_bark: ['Bark', '通知', '消息', 'notify', 'iOS', '推送', '提醒', '苹果'],
  notify_slack: ['Slack', '通知', '消息', 'notify', 'webhook', '推送', '提醒', '团队'],
  notify_msteams: ['Teams', 'Microsoft', '通知', '消息', 'notify', 'webhook', '推送', '提醒', '微软'],
  notify_pushover: ['Pushover', '通知', '消息', 'notify', '推送', '提醒'],
  notify_pushbullet: ['PushBullet', '通知', '消息', 'notify', '推送', '提醒'],
  notify_gotify: ['Gotify', '通知', '消息', 'notify', '推送', '提醒', '自建'],
  notify_serverchan: ['Server酱', '通知', '消息', 'serverchan', 'notify', '推送', '提醒', '微信'],
  notify_pushplus: ['PushPlus', '通知', '消息', 'notify', '推送', '提醒', '微信'],
  notify_webhook: ['Webhook', '通知', '消息', 'notify', '自定义', '推送', '提醒', 'http'],
  notify_ntfy: ['Ntfy', '通知', '消息', 'notify', '推送', '提醒', '开源'],
  notify_matrix: ['Matrix', '通知', '消息', 'notify', '推送', '提醒', '聊天'],
  notify_rocketchat: ['RocketChat', '通知', '消息', 'notify', '推送', '提醒', '聊天'],
  // Webhook请求
  webhook_request: ['webhook', 'http', '请求', 'get', 'post', 'put', 'delete', 'patch', 'api', '接口', '调用'],
  // 飞书自动化
  feishu_bitable_write: ['飞书', '多维表格', '写入', 'feishu', 'bitable', 'write', '添加', '更新', '插入'],  feishu_bitable_read: ['飞书', '多维表格', '读取', 'feishu', 'bitable', 'read', '查询', '获取'],
  feishu_sheet_write: ['飞书', '电子表格', '写入', 'feishu', 'sheet', 'write', '添加', '更新', '插入'],
  feishu_sheet_read: ['飞书', '电子表格', '读取', 'feishu', 'sheet', 'read', '查询', '获取'],
  // WPS 多维表格
  wps_bitable_write: ['WPS', '多维表格', '智能表格', '写入', 'wps', 'bitable', 'dbsheet', 'write', '添加', '更新', '插入', '金山'],
  wps_bitable_read: ['WPS', '多维表格', '智能表格', '读取', 'wps', 'bitable', 'dbsheet', 'read', '查询', '获取', '金山'],
  // Oracle数据库
  oracle_connect: ['oracle', '数据库', '连接', 'database', 'connect', 'db'],
  oracle_query: ['oracle', '数据库', '查询', 'query', 'select', 'sql'],
  oracle_execute: ['oracle', '数据库', '执行', 'execute', 'sql', '语句'],
  oracle_insert: ['oracle', '数据库', '插入', 'insert', '添加', '新增', '数据'],
  oracle_update: ['oracle', '数据库', '更新', 'update', '修改', '编辑', '数据'],
  oracle_delete: ['oracle', '数据库', '删除', 'delete', '移除', '清除', '数据'],
  // PostgreSQL数据库
  postgresql_connect: ['postgresql', 'postgres', '数据库', '连接', 'database', 'connect', 'db'],
  postgresql_query: ['postgresql', 'postgres', '数据库', '查询', 'query', 'select', 'sql'],
  postgresql_execute: ['postgresql', 'postgres', '数据库', '执行', 'execute', 'sql', '语句'],
  postgresql_insert: ['postgresql', 'postgres', '数据库', '插入', 'insert', '添加', '新增', '数据'],
  postgresql_update: ['postgresql', 'postgres', '数据库', '更新', 'update', '修改', '编辑', '数据'],
  postgresql_delete: ['postgresql', 'postgres', '数据库', '删除', 'delete', '移除', '清除', '数据'],
  // MongoDB数据库
  mongodb_connect: ['mongodb', 'mongo', '数据库', '连接', 'database', 'connect', 'nosql'],
  mongodb_find: ['mongodb', 'mongo', '查询', 'find', 'query', '搜索'],
  mongodb_insert: ['mongodb', 'mongo', '插入', 'insert', '添加', '新增'],
  mongodb_update: ['mongodb', 'mongo', '更新', 'update', '修改'],
  mongodb_delete: ['mongodb', 'mongo', '删除', 'delete', '移除'],
  // SQL Server数据库
  sqlserver_connect: ['sqlserver', 'mssql', '数据库', '连接', 'database', 'connect', 'db'],
  sqlserver_query: ['sqlserver', 'mssql', '数据库', '查询', 'query', 'select', 'sql'],
  sqlserver_execute: ['sqlserver', 'mssql', '数据库', '执行', 'execute', 'sql', '语句'],
  sqlserver_insert: ['sqlserver', 'mssql', '数据库', '插入', 'insert', '添加', '新增', '数据'],
  sqlserver_update: ['sqlserver', 'mssql', '数据库', '更新', 'update', '修改', '编辑', '数据'],
  sqlserver_delete: ['sqlserver', 'mssql', '数据库', '删除', 'delete', '移除', '清除', '数据'],
  // SQLite数据库
  sqlite_connect: ['sqlite', '数据库', '连接', 'database', 'connect', 'db', '本地'],
  sqlite_query: ['sqlite', '数据库', '查询', 'query', 'select', 'sql'],
  sqlite_execute: ['sqlite', '数据库', '执行', 'execute', 'sql', '语句'],
  sqlite_insert: ['sqlite', '数据库', '插入', 'insert', '添加', '新增', '数据'],
  sqlite_update: ['sqlite', '数据库', '更新', 'update', '修改', '编辑', '数据'],
  sqlite_delete: ['sqlite', '数据库', '删除', 'delete', '移除', '清除', '数据'],
  // Redis数据库
  redis_connect: ['redis', '缓存', '连接', 'cache', 'connect', 'nosql'],
  redis_get: ['redis', '读取', 'get', '获取', '查询'],
  redis_set: ['redis', '写入', 'set', '设置', '保存'],
  redis_del: ['redis', '删除', 'delete', 'del', '移除'],
  redis_hget: ['redis', '哈希', '读取', 'hash', 'hget', '获取'],
  redis_hset: ['redis', '哈希', '写入', 'hash', 'hset', '设置'],
  // 数据库断开连接
  oracle_disconnect: ['oracle', '数据库', '断开', '关闭', 'disconnect', 'close', '连接'],
  postgresql_disconnect: ['postgresql', 'postgres', '数据库', '断开', '关闭', 'disconnect', 'close', '连接'],
  mongodb_disconnect: ['mongodb', 'mongo', '数据库', '断开', '关闭', 'disconnect', 'close', '连接'],
  sqlserver_disconnect: ['sqlserver', 'mssql', '数据库', '断开', '关闭', 'disconnect', 'close', '连接'],
  sqlite_disconnect: ['sqlite', '数据库', '断开', '关闭', 'disconnect', 'close', '连接'],
  redis_disconnect: ['redis', '缓存', '断开', '关闭', 'disconnect', 'close', '连接'],
  // SSH远程操作
  ssh_connect: ['ssh', '远程', '连接', 'remote', 'connect', '服务器', 'linux'],
  ssh_execute_command: ['ssh', '远程', '执行', '命令', 'command', 'shell', 'linux'],
  ssh_upload_file: ['ssh', '远程', '上传', '文件', 'upload', 'scp', 'sftp'],
  ssh_download_file: ['ssh', '远程', '下载', '文件', 'download', 'scp', 'sftp'],
  ssh_disconnect: ['ssh', '远程', '断开', '关闭', 'disconnect', 'close'],
  // SAP GUI 自动化
  sap_login: ['sap', '登录', 'login', 'erp', '企业', 'gui', '系统'],
  sap_logout: ['sap', '退出', 'logout', '登出', 'erp'],
  sap_run_tcode: ['sap', '事务码', 'tcode', 't-code', '执行', 'transaction'],
  sap_set_field_value: ['sap', '设置', '字段', '输入', 'set', 'field', 'input', 'value'],
  sap_get_field_value: ['sap', '获取', '字段', '读取', 'get', 'field', 'value', 'read'],
  sap_click_button: ['sap', '点击', '按钮', 'click', 'button', 'press'],
  sap_send_vkey: ['sap', '虚拟键', '回车', 'vkey', 'enter', 'f5', 'f8', 'keyboard'],
  sap_get_status_message: ['sap', '状态', '消息', 'status', 'message', '状态栏'],
  sap_get_title: ['sap', '标题', '窗口', 'title', 'window'],
  sap_close_warning: ['sap', '关闭', '警告', '弹窗', 'close', 'warning', 'dialog'],
  sap_set_checkbox: ['sap', '复选框', 'checkbox', '勾选', 'check'],
  sap_select_combobox: ['sap', '下拉框', 'combobox', '选择', 'select', 'dropdown'],
  sap_read_gridview: ['sap', '表格', 'gridview', '读取', 'grid', 'table', '数据'],
  sap_export_gridview_excel: ['sap', '导出', 'excel', 'export', '表格', 'gridview', '下载'],
  sap_set_focus: ['sap', '焦点', 'focus', '设置'],
  sap_maximize_window: ['sap', '最大化', '窗口', 'maximize', 'window'],
  // AI生图生视频
  ai_generate_image: ['ai', '生成', '图片', '图像', 'generate', 'image', 'dalle', 'stable diffusion', '绘画', '创作'],
  ai_generate_video: ['ai', '生成', '视频', 'generate', 'video', 'runway', '创作', '制作'],
  // 概率触发器
  probability_trigger: ['概率', '触发器', '随机', 'probability', 'trigger', 'random', '分支', '条件'],
  // 网络监听
  network_monitor_start: ['网络', '监听', '开始', '启动', 'network', 'monitor', 'start', 'api', '请求', '抓包'],
  network_monitor_wait: ['网络', '监听', '等待', 'api', '请求', 'wait', 'network', 'monitor', '捕获'],
  network_monitor_stop: ['网络', '监听', '停止', '结束', 'stop', 'network', 'monitor'],
  // 其他
  use_opened_page: ['使用', '已打开', '网页', '页面', 'use', 'opened', 'page', '切换'],
  stop_workflow: ['停止', '工作流', '终止', 'stop', 'workflow', '中断'],
  custom_module: ['自定义', '模块', '函数', 'custom', 'module', '复用'],
}

// 模块分类 - 按功能主题合理归类
const moduleCategories = [
  // ===== 浏览器自动化 =====
  {
    name: '网页导航',
    color: 'bg-blue-500',
    modules: ['open_page', 'use_opened_page', 'close_page', 'refresh_page', 'go_back', 'go_forward', 'switch_tab', 'switch_iframe', 'switch_to_main', 'wait_page_load', 'page_load_complete'] as ModuleType[],
  },
  {
    name: '网页元素交互',
    color: 'bg-indigo-500',
    modules: ['click_element', 'hover_element', 'input_text', 'select_dropdown', 'set_checkbox', 'drag_element', 'scroll_page', 'handle_dialog', 'upload_file', 'inject_javascript'] as ModuleType[],
  },
  {
    name: '网页元素查询',
    color: 'bg-indigo-600',
    modules: ['get_element_info', 'get_child_elements', 'get_sibling_elements', 'element_exists', 'element_visible', 'wait_element', 'extract_table_data'] as ModuleType[],
  },
  {
    name: '网页数据采集',
    color: 'bg-emerald-500',
    modules: ['screenshot', 'save_image', 'download_file', 'network_capture', 'network_monitor_start', 'network_monitor_wait', 'network_monitor_stop'] as ModuleType[],
  },
  {
    name: 'DP 反检测自动化',
    color: 'bg-teal-600',
    modules: ['dp_open_page', 'dp_click', 'dp_input', 'dp_get_text', 'dp_get_html', 'dp_run_js', 'dp_wait_element', 'dp_scroll', 'dp_close'] as ModuleType[],
  },
  // ===== 桌面自动化 =====
  {
    name: '鼠标操作',
    color: 'bg-violet-500',
    modules: ['real_mouse_click', 'real_mouse_move', 'real_mouse_drag', 'real_mouse_scroll', 'get_mouse_position'] as ModuleType[],
  },
  {
    name: '键盘操作',
    color: 'bg-purple-500',
    modules: ['real_keyboard', 'keyboard_action'] as ModuleType[],
  },
  {
    name: '图像识别与点击',
    color: 'bg-rose-500',
    modules: ['click_image', 'click_text', 'hover_image', 'hover_text', 'drag_image', 'image_exists', 'wait_image'] as ModuleType[],
  },
  {
    name: '屏幕与录制',
    color: 'bg-pink-500',
    modules: ['screenshot_screen', 'screen_record', 'window_focus', 'camera_capture', 'camera_record', 'macro_recorder'] as ModuleType[],
  },
  {
    name: '桌面应用控制',
    color: 'bg-slate-600',
    modules: [
      'desktop_app_start', 'desktop_app_connect', 'desktop_app_close', 'desktop_app_get_info', 'desktop_app_wait_ready',
      'desktop_window_activate', 'desktop_window_state', 'desktop_window_move', 'desktop_window_resize', 'desktop_window_list', 'desktop_window_capture',
      'desktop_find_control', 'desktop_find_control_smart', 'desktop_control_info', 'desktop_control_tree', 'desktop_wait_control',
      'desktop_click_control', 'desktop_input_control', 'desktop_get_text', 'desktop_set_value',
      'desktop_select_combo', 'desktop_checkbox', 'desktop_radio', 'desktop_drag_control', 'desktop_menu_click',
      'desktop_list_operate', 'desktop_send_keys', 'desktop_get_property', 'desktop_dialog_handle',
      'desktop_hotkey', 'desktop_extract_table', 'desktop_get_app_state', 'desktop_query_with_xpath',
      'desktop_select_text', 'desktop_get_focused_control', 'desktop_assert_control',
    ] as ModuleType[],
  },
  {
    name: '系统操作',
    color: 'bg-gray-600',
    modules: ['shutdown_system', 'lock_screen', 'run_command', 'set_clipboard', 'get_clipboard'] as ModuleType[],
  },
  // ===== 手机自动化 =====
  {
    name: '手机自动化',
    color: 'bg-cyan-600',
    modules: ['phone_tap', 'phone_swipe', 'phone_long_press', 'phone_input_text', 'phone_press_key', 'phone_screenshot', 'phone_start_mirror', 'phone_stop_mirror', 'phone_install_app', 'phone_start_app', 'phone_stop_app', 'phone_uninstall_app', 'phone_push_file', 'phone_pull_file', 'phone_click_image', 'phone_click_text', 'phone_wait_image', 'phone_image_exists', 'phone_set_volume', 'phone_set_brightness', 'phone_set_clipboard', 'phone_get_clipboard'] as ModuleType[],
  },
  // ===== 流程控制 =====
  {
    name: '流程控制',
    color: 'bg-orange-500',
    modules: ['condition', 'loop', 'foreach', 'foreach_dict', 'break_loop', 'continue_loop', 'assert_checkpoint', 'stop_workflow', 'wait', 'scheduled_task', 'subflow', 'input_prompt'] as ModuleType[],
  },
  {
    name: '触发器',
    color: 'bg-yellow-500',
    modules: ['webhook_trigger', 'hotkey_trigger', 'file_watcher_trigger', 'email_trigger', 'api_trigger', 'mouse_trigger', 'image_trigger', 'sound_trigger', 'face_trigger', 'gesture_trigger', 'element_change_trigger', 'probability_trigger'] as ModuleType[],
  },
  // ===== 数据处理 =====
  {
    name: '变量与运算',
    color: 'bg-teal-500',
    modules: ['set_variable', 'increment_decrement', 'json_parse', 'base64', 'random_number', 'get_time'] as ModuleType[],
  },
  {
    name: '文本处理',
    color: 'bg-lime-600',
    modules: ['string_concat', 'string_replace', 'string_split', 'string_join', 'string_trim', 'string_case', 'string_substring', 'regex_extract'] as ModuleType[],
  },
  {
    name: '列表操作',
    color: 'bg-green-600',
    modules: ['list_operation', 'list_get', 'list_length', 'list_export', 'list_sum', 'list_average', 'list_max', 'list_min', 'list_sort', 'list_unique', 'list_slice', 'list_reverse', 'list_find', 'list_count', 'list_filter', 'list_map', 'list_merge', 'list_flatten', 'list_chunk', 'list_remove_empty', 'list_intersection', 'list_union', 'list_difference', 'list_cartesian_product', 'list_shuffle', 'list_sample'] as ModuleType[],
  },
  {
    name: '字典操作',
    color: 'bg-teal-600',
    modules: ['dict_operation', 'dict_get', 'dict_keys', 'dict_merge', 'dict_filter', 'dict_map_values', 'dict_invert', 'dict_sort', 'dict_deep_copy', 'dict_get_path', 'dict_flatten'] as ModuleType[],
  },
  {
    name: '数学与统计',
    color: 'bg-cyan-700',
    modules: ['math_round', 'math_base_convert', 'math_floor', 'math_modulo', 'math_abs', 'math_sqrt', 'math_power', 'math_log', 'math_trig', 'math_exp', 'math_gcd', 'math_lcm', 'math_factorial', 'math_permutation', 'math_percentage', 'math_clamp', 'math_random_advanced', 'stat_median', 'stat_mode', 'stat_variance', 'stat_stdev', 'stat_percentile', 'stat_normalize', 'stat_standardize'] as ModuleType[],
  },
  {
    name: '表格与CSV',
    color: 'bg-sky-500',
    modules: ['table_add_row', 'table_add_column', 'table_set_cell', 'table_get_cell', 'table_delete_row', 'table_clear', 'table_export', 'read_excel', 'csv_parse', 'csv_generate', 'list_to_string_advanced'] as ModuleType[],
  },
  {
    name: 'Excel自动化',
    color: 'bg-emerald-600',
    modules: [
      'excel_create', 'excel_add_sheet', 'excel_delete_sheet', 'excel_rename_sheet', 'excel_list_sheets',
      'excel_copy_sheet', 'excel_move_sheet', 'excel_set_tab_color', 'excel_clear_sheet', 'excel_get_info',
      'excel_write_cell', 'excel_read_cell', 'excel_write_range', 'excel_read_range', 'excel_append_row',
      'excel_write_dicts', 'excel_read_dicts', 'excel_copy_range', 'excel_clear_range', 'excel_find_replace',
      'excel_insert_rows', 'excel_delete_rows', 'excel_insert_cols', 'excel_delete_cols', 'excel_hide',
      'excel_set_size', 'excel_set_formula', 'excel_read_formula', 'excel_merge_cells', 'excel_freeze_panes',
      'excel_set_style', 'excel_set_border', 'excel_number_format', 'excel_set_hyperlink', 'excel_set_comment',
      'excel_add_image', 'excel_add_chart', 'excel_data_validation', 'excel_conditional_format',
      'excel_auto_filter', 'excel_sort_range', 'excel_remove_duplicates', 'excel_to_csv', 'excel_from_csv',
      'excel_protect_sheet', 'excel_page_setup', 'excel_set_zoom',
      'excel_count_rows', 'excel_find_empty_row', 'excel_find_empty_col', 'excel_find_empty_cell',
      'excel_fill_range', 'excel_clear_style', 'excel_activate_sheet', 'excel_save_as',
      'excel_pivot_table', 'excel_to_pdf', 'excel_run_macro', 'excel_refresh_data',
    ] as ModuleType[],
  },
  // ===== 数据库 =====
  {
    name: '数据库',
    color: 'bg-sky-600',
    modules: [
      'db_connect', 'db_query', 'db_execute', 'db_insert', 'db_update', 'db_delete', 'db_close',
      'oracle_connect', 'oracle_query', 'oracle_execute', 'oracle_insert', 'oracle_update', 'oracle_delete', 'oracle_disconnect',
      'postgresql_connect', 'postgresql_query', 'postgresql_execute', 'postgresql_insert', 'postgresql_update', 'postgresql_delete', 'postgresql_disconnect',
      'mongodb_connect', 'mongodb_find', 'mongodb_insert', 'mongodb_update', 'mongodb_delete', 'mongodb_disconnect',
      'sqlserver_connect', 'sqlserver_query', 'sqlserver_execute', 'sqlserver_insert', 'sqlserver_update', 'sqlserver_delete', 'sqlserver_disconnect',
      'sqlite_connect', 'sqlite_query', 'sqlite_execute', 'sqlite_insert', 'sqlite_update', 'sqlite_delete', 'sqlite_disconnect',
      'redis_connect', 'redis_get', 'redis_set', 'redis_del', 'redis_hget', 'redis_hset', 'redis_disconnect',
    ] as ModuleType[],
  },
  // ===== 文件与文档 =====
  {
    name: '文件管理',
    color: 'bg-amber-600',
    modules: ['list_files', 'copy_file', 'move_file', 'delete_file', 'rename_file', 'create_folder', 'rename_folder', 'file_exists', 'get_file_info', 'read_text_file', 'write_text_file'] as ModuleType[],
  },
  {
    name: 'PDF处理',
    color: 'bg-red-600',
    modules: ['pdf_to_images', 'images_to_pdf', 'pdf_merge', 'pdf_split', 'pdf_extract_text', 'pdf_extract_images', 'pdf_encrypt', 'pdf_decrypt', 'pdf_add_watermark', 'pdf_rotate', 'pdf_delete_pages', 'pdf_get_info', 'pdf_compress', 'pdf_insert_pages', 'pdf_reorder_pages', 'pdf_to_word'] as ModuleType[],
  },
  {
    name: '文档转换',
    color: 'bg-orange-600',
    modules: ['markdown_to_html', 'html_to_markdown', 'markdown_to_pdf', 'markdown_to_docx', 'docx_to_markdown', 'html_to_docx', 'docx_to_html', 'markdown_to_epub', 'epub_to_markdown', 'latex_to_pdf', 'rst_to_html', 'org_to_html', 'universal_doc_convert'] as ModuleType[],
  },
  {
    name: '文件对比',
    color: 'bg-teal-800',
    modules: ['file_hash_compare', 'file_diff_compare', 'folder_hash_compare', 'folder_diff_compare'] as ModuleType[],
  },
  // ===== 媒体处理 =====
  {
    name: '图像编辑',
    color: 'bg-pink-600',
    modules: ['compress_image', 'image_resize', 'image_crop', 'image_rotate', 'image_flip', 'image_blur', 'image_sharpen', 'image_brightness', 'image_contrast', 'image_color_balance', 'image_add_text', 'image_merge', 'image_thumbnail', 'image_filter', 'image_grayscale', 'image_round_corners', 'image_remove_bg', 'add_watermark', 'image_get_info', 'image_convert_format', 'qr_generate', 'qr_decode'] as ModuleType[],
  },
  {
    name: '盲水印',
    color: 'bg-purple-700',
    modules: ['bwm_embed_text', 'bwm_extract_text', 'bwm_embed_image', 'bwm_extract_image'] as ModuleType[],
  },
  {
    name: '视频处理',
    color: 'bg-purple-600',
    modules: ['format_convert', 'compress_video', 'trim_video', 'merge_media', 'rotate_video', 'video_speed', 'extract_frame', 'add_subtitle', 'resize_video', 'download_m3u8', 'ytdlp_download', 'ytdlp_download_audio', 'ytdlp_get_info', 'ytdlp_list_formats', 'ytdlp_download_subtitle', 'ytdlp_download_playlist'] as ModuleType[],
  },
  {
    name: '音频处理',
    color: 'bg-violet-600',
    modules: ['extract_audio', 'adjust_volume', 'audio_to_text'] as ModuleType[],
  },
  {
    name: '媒体格式转换',
    color: 'bg-rose-600',
    modules: ['image_format_convert', 'video_format_convert', 'audio_format_convert', 'video_to_audio', 'video_to_gif', 'batch_format_convert'] as ModuleType[],
  },
  // ===== AI 能力 =====
  {
    name: 'AI对话与视觉',
    color: 'bg-violet-700',
    modules: ['ai_chat', 'ai_vision', 'ai_vision_act'] as ModuleType[],
  },
  {
    name: 'AI数据处理',
    color: 'bg-indigo-700',
    modules: ['ai_extract', 'ai_classify', 'ai_summarize', 'ai_translate', 'ai_sentiment', 'ai_normalize', 'ai_dedup_semantic', 'ai_route'] as ModuleType[],
  },
  {
    name: 'AI生成',
    color: 'bg-purple-700',
    modules: ['ai_generate_image', 'ai_generate_video'] as ModuleType[],
  },
  {
    name: 'AI爬虫',
    color: 'bg-fuchsia-700',
    modules: ['ai_smart_scraper', 'ai_element_selector', 'firecrawl_scrape', 'firecrawl_map', 'firecrawl_crawl'] as ModuleType[],
  },
  {
    name: 'AI识别',
    color: 'bg-rose-700',
    modules: ['ocr_captcha', 'slider_captcha', 'face_recognition', 'image_ocr'] as ModuleType[],
  },
  // ===== 网络与通信 =====
  {
    name: '网络请求',
    color: 'bg-sky-700',
    modules: ['api_request', 'webhook_request', 'send_email'] as ModuleType[],
  },
  {
    name: '消息推送',
    color: 'bg-amber-600',
    modules: ['notify_discord', 'notify_telegram', 'notify_dingtalk', 'notify_wecom', 'notify_feishu', 'notify_bark', 'notify_slack', 'notify_msteams', 'notify_pushover', 'notify_pushbullet', 'notify_gotify', 'notify_serverchan', 'notify_pushplus', 'notify_webhook', 'notify_ntfy', 'notify_matrix', 'notify_rocketchat'] as ModuleType[],
  },
  {
    name: 'QQ机器人',
    color: 'bg-blue-500',
    modules: ['qq_send_message', 'qq_send_image', 'qq_send_file', 'qq_wait_message', 'qq_get_friends', 'qq_get_groups', 'qq_get_group_members', 'qq_get_login_info'] as ModuleType[],
  },
  {
    name: '微信机器人',
    color: 'bg-green-500',
    modules: ['wechat_send_message', 'wechat_send_file'] as ModuleType[],
  },
  {
    name: '飞书自动化',
    color: 'bg-blue-600',
    modules: ['feishu_bitable_write', 'feishu_bitable_read', 'feishu_sheet_write', 'feishu_sheet_read'] as ModuleType[],
  },
  {
    name: 'WPS多维表格',
    color: 'bg-red-600',
    modules: ['wps_bitable_write', 'wps_bitable_read'] as ModuleType[],
  },
  {
    name: 'SSH远程',
    color: 'bg-slate-700',
    modules: ['ssh_connect', 'ssh_execute_command', 'ssh_upload_file', 'ssh_download_file', 'ssh_disconnect'] as ModuleType[],
  },
  {
    name: '局域网共享',
    color: 'bg-cyan-500',
    modules: ['share_folder', 'share_file', 'stop_share', 'start_screen_share', 'stop_screen_share'] as ModuleType[],
  },
  {
    name: 'SAP自动化',
    color: 'bg-blue-800',
    modules: ['sap_login', 'sap_logout', 'sap_run_tcode', 'sap_set_field_value', 'sap_get_field_value', 'sap_click_button', 'sap_send_vkey', 'sap_get_status_message', 'sap_get_title', 'sap_close_warning', 'sap_set_checkbox', 'sap_select_combobox', 'sap_read_gridview', 'sap_export_gridview_excel', 'sap_set_focus', 'sap_maximize_window'] as ModuleType[],
  },
  // ===== 实用工具 =====
  {
    name: '加密与编码',
    color: 'bg-indigo-800',
    modules: ['md5_encrypt', 'sha_encrypt', 'url_encode_decode', 'random_password_generator', 'uuid_generator'] as ModuleType[],
  },
  {
    name: '颜色与时间转换',
    color: 'bg-pink-800',
    modules: ['rgb_to_hsv', 'rgb_to_cmyk', 'hex_to_cmyk', 'timestamp_converter'] as ModuleType[],
  },
  {
    name: '通知与日志',
    color: 'bg-amber-700',
    modules: ['print_log', 'export_log', 'play_sound', 'system_notification', 'text_to_speech'] as ModuleType[],
  },
  {
    name: '媒体播放',
    color: 'bg-rose-700',
    modules: ['play_music', 'play_video', 'view_image'] as ModuleType[],
  },
  {
    name: '脚本执行',
    color: 'bg-slate-700',
    modules: ['js_script', 'python_script', 'printer_call'] as ModuleType[],
  },
  // ===== 测试报告 =====
  {
    name: '测试报告',
    color: 'bg-emerald-600',
    modules: ['allure_init', 'allure_start_test', 'allure_add_step', 'allure_add_attachment', 'allure_stop_test', 'allure_generate_report'] as ModuleType[],
  },
  // ===== 画布工具 =====
  {
    name: '画布工具',
    color: 'bg-stone-500',
    modules: ['group', 'note'] as ModuleType[],
  },
]

// 模块项预设颜色 - 模块外定义，避免每次渲染重建数组
const PRESET_COLORS = [
  { name: '默认', value: undefined },
  { name: '红色', value: '#ef4444' },
  { name: '橙色', value: '#f97316' },
  { name: '黄色', value: '#eab308' },
  { name: '绿色', value: '#22c55e' },
  { name: '青色', value: '#06b6d4' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '紫色', value: '#a855f7' },
  { name: '粉色', value: '#ec4899' },
] as const

interface ModuleItemProps {
  type: ModuleType
  highlight?: string
  isFavorite?: boolean
  customColor?: string
  onToggleFavorite?: (type: ModuleType) => void
  onSetCustomColor?: (type: ModuleType, color: string | undefined) => void
  onIncrementUsage?: (type: ModuleType) => void  // 添加使用统计回调
  // 拖拽排序相关（仅在收藏模块视图中使用）
  enableSortDrag?: boolean
  onSortDragStart?: (type: ModuleType) => void
  onSortDragOver?: (type: ModuleType) => void
  onSortDrop?: (type: ModuleType) => void
  sortDragOverType?: ModuleType | null
  sortDraggingType?: ModuleType | null
}

function ModuleItemRaw({ 
  type, 
  highlight, 
  isFavorite,
  customColor,
  onToggleFavorite,
  onSetCustomColor,
  onIncrementUsage,
  enableSortDrag,
  onSortDragStart,
  onSortDragOver,
  onSortDrop,
  sortDragOverType,
  sortDraggingType
}: ModuleItemProps) {
  const Icon = moduleIcons[type]
  const label = moduleTypeLabels[type]
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })
  const colorButtonRef = useRef<HTMLButtonElement>(null)

  // 防御：缺失图标/labels 不能让整个面板崩
  if (!Icon || !label) {
    if (typeof console !== 'undefined') {
      console.warn(`[ModuleSidebar] 模块 "${type}" 缺少图标或 label，已被忽略（可能是删除模块后用户的收藏/统计残留）`)
    }
    return null
  }

  // 点击外部关闭颜色选择器
  useEffect(() => {
    if (showColorPicker) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (!target.closest('.color-picker-container')) {
          setShowColorPicker(false)
        }
      }
      setTimeout(() => document.addEventListener('click', handleClickOutside), 0)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showColorPicker])

  // 模块主体的拖拽 - 始终用于添加到画布
  const onMainDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
    // 增加使用统计
    onIncrementUsage?.(type)
  }

  // 排序手柄的拖拽
  const onHandleDragStart = (event: React.DragEvent) => {
    event.stopPropagation()
    event.dataTransfer.setData('application/sort-favorite', type)
    event.dataTransfer.effectAllowed = 'move'
    onSortDragStart?.(type)
  }

  const onDragOver = (event: React.DragEvent) => {
    if (enableSortDrag && onSortDragOver && event.dataTransfer.types.includes('application/sort-favorite')) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      onSortDragOver(type)
    }
  }

  const onDrop = (event: React.DragEvent) => {
    if (enableSortDrag && onSortDrop && event.dataTransfer.types.includes('application/sort-favorite')) {
      event.preventDefault()
      onSortDrop(type)
    }
  }

  // 高亮匹配的文字
  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)
    if (index === -1) return text
    return (
      <>
        {text.slice(0, index)}
        <span className="bg-yellow-200 rounded px-0.5">{text.slice(index, index + query.length)}</span>
        {text.slice(index + query.length)}
      </>
    )
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onToggleFavorite?.(type)
  }

  const handleColorClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    console.log('Color button clicked!', type, showColorPicker)
    
    // 计算弹窗位置
    if (colorButtonRef.current) {
      const rect = colorButtonRef.current.getBoundingClientRect()
      setPickerPosition({
        x: rect.right + 8, // 按钮右侧8px
        y: rect.top
      })
    }
    
    setShowColorPicker(!showColorPicker)
  }

  const handleColorSelect = (color: string | undefined) => {
    console.log('Color selected:', color, type)
    onSetCustomColor?.(type, color)
    setShowColorPicker(false)
  }

  const isDropTarget = sortDragOverType === type && sortDraggingType && sortDraggingType !== type
  const isDragging = sortDraggingType === type

  // 应用自定义颜色样式
  const customStyle = customColor ? {
    backgroundColor: `${customColor}15`,
    borderLeft: `3px solid ${customColor}`
  } : {}

  return (
    <div className="relative">
      <div
        style={customStyle}
        className={`flex items-center gap-1 rounded-[7px]
          bg-[hsl(var(--card))]
          border border-transparent
          hover:bg-[hsl(var(--brand-50))]
          hover:border-[hsl(var(--brand-500)/0.3)]
          transition-[background-color,border-color] duration-100 ease-out
          group
          ${isDropTarget ? 'border-t-2 !border-t-[hsl(var(--brand-500))] bg-[hsl(var(--brand-50))]' : ''}
          ${isDragging ? 'opacity-50' : ''}`}
      >
        {/* 可拖拽区域 */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 flex-1 cursor-grab active:opacity-80"
          draggable
          onDragStart={onMainDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {enableSortDrag && (
            <div
              className="p-0.5 rounded cursor-grab text-[hsl(var(--slate-300))] hover:text-[hsl(var(--brand-600))] hover:bg-[hsl(var(--brand-50))] transition-colors duration-100"
              draggable
              onDragStart={onHandleDragStart}
              title="拖拽调整顺序"
            >
              <GripHorizontal className="w-3 h-3" />
            </div>
          )}
          <div
            className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0"
            style={customColor
              ? { backgroundColor: `${customColor}20`, color: customColor, border: `1px solid ${customColor}40` }
              : { backgroundColor: 'hsl(var(--slate-100))', color: 'hsl(var(--slate-600))' }
            }
          >
            <Icon
              className="w-3.5 h-3.5"
              strokeWidth={2.2}
            />
          </div>
          <span
            className="text-[12.5px] font-medium transition-colors duration-100 text-[hsl(var(--slate-700))] group-hover:text-[hsl(var(--brand-800))] flex-1 truncate"
            style={customColor ? { color: customColor } : {}}
          >
            {highlight ? highlightText(label, highlight) : label}
          </span>
        </div>

        {/* 按钮区域 - 不可拖拽 */}
        <div className="flex items-center gap-0.5 pr-1.5">
          {onSetCustomColor && (
            <button
              ref={colorButtonRef}
              onClick={handleColorClick}
              className="p-1 rounded-[5px] transition-colors duration-100 hover:bg-[hsl(var(--slate-100))] opacity-0 group-hover:opacity-100 cursor-pointer"
              title="设置标签颜色"
            >
              <div
                className="w-3.5 h-3.5 rounded-full border-2 shadow-xs"
                style={{
                  backgroundColor: customColor || 'hsl(var(--slate-200))',
                  borderColor: customColor ? customColor : 'hsl(var(--slate-300))'
                }}
              />
            </button>
          )}
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              className={`p-1 rounded-[5px] transition-colors duration-100 cursor-pointer ${
                isFavorite
                  ? 'text-[hsl(var(--amber-500))] opacity-100'
                  : 'text-[hsl(var(--slate-300))] opacity-0 group-hover:opacity-100 hover:text-[hsl(var(--amber-500))] hover:bg-[hsl(var(--amber-50))]'
              }`}
              title={isFavorite ? '取消收藏' : '收藏模块'}
            >
              <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* 颜色选择器弹窗 */}
      {showColorPicker && createPortal(
        <div
          className="color-picker-container fixed z-[9999] bg-[hsl(var(--card))] rounded-[10px] shadow-pop-xl border border-[hsl(var(--border))] p-3 animate-scale-in"
          style={{ left: `${pickerPosition.x}px`, top: `${pickerPosition.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] uppercase tracking-wider font-bold text-[hsl(var(--muted-foreground))] mb-2.5">选择标签颜色</div>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => handleColorSelect(color.value)}
                className="flex flex-col items-center gap-1 p-2 rounded-[8px] hover:bg-[hsl(var(--brand-50))] hover:scale-105 active:scale-95 transition-all duration-150"
                title={color.name}
              >
                <div
                  className="w-7 h-7 rounded-full border-2 shadow-soft transition-transform"
                  style={{
                    backgroundColor: color.value || 'hsl(var(--slate-100))',
                    borderColor: color.value || 'hsl(var(--slate-300))',
                    boxShadow: color.value ? `0 2px 8px ${color.value}50` : undefined,
                  }}
                />
                <span className="text-[10px] text-[hsl(var(--slate-700))] font-medium">{color.name}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// 用 memo 包装：只有 props 真正变化时才重新渲染
// 这是性能关键 —— 画布拖拽节点时，store 变化会触发 ModuleSidebar 重渲染，
// 但 ModuleItem 的 props 没变，会被 memo 拦截
const ModuleItem = memo(ModuleItemRaw)

function ModuleSidebarRaw() {
  const [activeTab, setActiveTab] = useState<'builtin' | 'custom'>('builtin')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showManageDialog, setShowManageDialog] = useState(false)
  const [editingModule, setEditingModule] = useState<import('@/types/customModule').CustomModule | null>(null)
  
  // 使用确认对话框hook
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm()

  // 加载自定义模块（只订阅需要的字段，不监听整个 store 变化）
  const loadModules = useCustomModuleStore((s) => s.loadModules)
  useEffect(() => {
    // 组件挂载时加载自定义模块列表
    loadModules()
  }, [loadModules])

  // 响应式：小屏幕自动折叠
  useEffect(() => {
    const handleResize = () => {
      // 屏幕宽度小于1024px时自动折叠
      if (window.innerWidth < 1024) {
        setIsCollapsed(true)
      }
    }

    // 初始检查
    handleResize()

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 导入模块统计 store（只订阅必要字段，避免整个 store 变化触发整侧栏重渲染）
  const incrementUsage = useModuleStatsStore((s) => s.incrementUsage)
  const toggleFavorite = useModuleStatsStore((s) => s.toggleFavorite)
  const stats = useModuleStatsStore((s) => s.stats)
  const getSortedModules = useModuleStatsStore((s) => s.getSortedModules)

  // 稳定的颜色设置回调，避免 ModuleItem 因 inline 函数导致 memo 失效
  const handleSetCustomColor = useCallback((type: ModuleType, color: string | undefined) => {
    const { setCustomColor } = useModuleStatsStore.getState()
    setCustomColor(type, color)
  }, [])

  // 在组件挂载时获取一次排序结果并缓存（只在浏览器刷新时排序）
  const [sortedCategoriesCache] = useState(() => {
    return moduleCategories.map(category => ({
      ...category,
      modules: getSortedModules(category.modules)
    }))
  })

  // 从 store 中获取所有收藏的模块
  const favoriteModules = useMemo(() => {
    return Object.entries(stats)
      .filter(([_, stat]) => stat.isFavorite)
      .map(([type, _]) => type as ModuleType)
  }, [stats])

  // 切换分类展开/收起
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryName)) {
        next.delete(categoryName)
      } else {
        next.add(categoryName)
      }
      return next
    })
  }

  // 常用模块：用过的(usageCount>0)按 使用次数→最近使用 排序，取前 8 个，置顶展示。
  // 关键：挂载时快照一次，整个会话内顺序固定，避免拖拽(会 incrementUsage)时实时重排导致拖不住。
  const [frequentModules] = useState<ModuleType[]>(() => {
    const s = useModuleStatsStore.getState().stats
    return (Object.entries(s) as [ModuleType, { usageCount: number; lastUsed: number }][])
      .filter(([, st]) => (st?.usageCount || 0) > 0)
      .sort((a, b) => (b[1].usageCount - a[1].usageCount) || (b[1].lastUsed - a[1].lastUsed))
      .slice(0, 8)
      .map(([type]) => type)
  })

  // 模糊搜索过滤（支持拼音和首字母）+ 使用缓存的排序结果
  const filteredCategories = useMemo(() => {
    // 使用缓存的排序结果，而不是每次都重新排序
    let categories = sortedCategoriesCache

    // 如果只显示收藏
    if (showFavoritesOnly) {
      // 收藏模块按照缓存中的顺序排列
      const sortedFavorites = favoriteModules.sort((a, b) => {
        // 在缓存中查找模块的位置
        let indexA = -1
        let indexB = -1
        for (const cat of sortedCategoriesCache) {
          const idxA = cat.modules.indexOf(a)
          const idxB = cat.modules.indexOf(b)
          if (idxA !== -1) indexA = idxA
          if (idxB !== -1) indexB = idxB
        }
        return indexA - indexB
      })
      
      return [{
        name: '收藏模块',
        color: 'bg-yellow-500',
        modules: sortedFavorites
      }].filter(cat => cat.modules.length > 0)
    }

    // 常用模块虚拟分组（置顶）
    const frequentGroup = frequentModules.length > 0
      ? [{ name: '常用模块', color: 'bg-blue-500', modules: frequentModules }]
      : []

    if (!searchQuery.trim()) {
      // 没有搜索时，常用置顶 + 缓存排序结果
      return [...frequentGroup, ...categories]
    }

    const query = searchQuery.trim()
    const matchType = (type: ModuleType) => {
      const label = moduleTypeLabels[type]
      const keywords = moduleKeywords[type] || []
      if (pinyinMatch(label, query)) return true
      if (keywords.some(kw => pinyinMatch(kw, query))) return true
      if (type.toLowerCase().includes(query.toLowerCase())) return true
      return false
    }

    // 搜索时：常用分组里命中的也置顶
    const frequentMatched = frequentModules.filter(matchType)
    const frequentSearchGroup = frequentMatched.length > 0
      ? [{ name: '常用模块', color: 'bg-blue-500', modules: frequentMatched }]
      : []

    return [
      ...frequentSearchGroup,
      ...categories.map(category => ({
        ...category,
        modules: category.modules.filter(matchType),
      })).filter(category => category.modules.length > 0),
    ]
  }, [searchQuery, showFavoritesOnly, favoriteModules, frequentModules, sortedCategoriesCache])

  // 搜索结果模块数
  const filteredModulesCount = filteredCategories.reduce((sum, cat) => sum + cat.modules.length, 0)
  
  // 总模块数
  const totalModulesCount = useMemo(() => {
    return moduleCategories.reduce((sum, cat) => sum + cat.modules.length, 0)
  }, [])

  // 搜索时自动展开所有分类
  const isExpanded = (categoryName: string) => {
    if (searchQuery.trim() || showFavoritesOnly) return true
    return expandedCategories.has(categoryName)
  }

  // 受 layoutStore 控制的宽度（用户可拖拽）
  const leftWidth = useLayoutStore((s) => s.leftWidth)
  const setLeftWidth = useLayoutStore((s) => s.setLeftWidth)
  // 拖拽过程使用本地 state 避免 store 在每帧写入触发其他订阅者
  const [draftWidth, setDraftWidth] = useState<number | null>(null)
  const effectiveWidth = draftWidth ?? leftWidth

  return (
    <aside
      className="relative border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col group/sidebar"
      style={{ width: isCollapsed ? 48 : effectiveWidth, transition: draftWidth === null ? 'width 200ms ease-out' : 'none' }}
    >
      {/* 收起状态下的图标列表 */}
      {isCollapsed ? (
        <button 
          type="button"
          className="flex flex-col items-center py-3 gap-2.5 hover:bg-[hsl(var(--brand-50))] transition-colors h-full w-full"
          onClick={() => setIsCollapsed(false)}
          title="展开模块列表"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-[8px] bg-gradient-to-br from-[hsl(var(--brand-500))] to-[hsl(var(--brand-700))] text-white shadow-brand-glow">
            <ChevronRight className="w-4 h-4" />
          </span>
          {moduleCategories.slice(0, 8).map((category) => (
            <div
              key={category.name}
              className={`w-2.5 h-2.5 rounded-full ${category.color} ring-2 ring-white shadow-soft`}
              title={category.name}
            />
          ))}
          {moduleCategories.length > 8 && (
            <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">+{moduleCategories.length - 8}</span>
          )}
        </button>
      ) : (
        <>
          <div className="bg-[hsl(var(--card))] p-3.5 border-b border-[hsl(var(--border))] space-y-3 relative">
            {/* 顶部装饰条 */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[hsl(var(--brand-500))] via-[hsl(var(--brand-400))] to-[hsl(var(--info-500))] opacity-70" />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="icon-block icon-block-brand !w-8 !h-8 !rounded-[8px]">
                  <Puzzle className="w-4 h-4" strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[13px] font-bold text-[hsl(var(--slate-900))] tracking-tight flex items-center gap-1.5">
                    模块库
                    <span className="badge badge-brand !py-0 !px-1.5 !text-[10px]">
                      {totalModulesCount}
                    </span>
                  </h2>
                  <p className="text-[10.5px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-tight">拖拽到画布添加</p>
                </div>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-[6px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--brand-700))] hover:bg-[hsl(var(--brand-50))] transition-all hover:shadow-xs active:scale-90"
                title="收起"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* 标签页切换 - 现代分段控件 */}
            <div className="flex gap-1 p-1 bg-[hsl(var(--slate-100))] rounded-[8px] border border-[hsl(var(--slate-200))] shadow-[inset_0_1px_2px_rgb(15_23_42_/_0.04)]">
              <button
                onClick={() => setActiveTab('builtin')}
                className={`flex-1 px-2.5 py-1.5 text-[12px] font-semibold rounded-[6px] transition-[background-color,color,border-color,box-shadow] duration-150 ease-out flex items-center justify-center gap-1.5 border ${
                  activeTab === 'builtin'
                    ? '!bg-[hsl(var(--brand-600))] !text-white !border-[hsl(var(--brand-700))] shadow-brand-glow'
                    : '!bg-transparent !text-[hsl(var(--muted-foreground))] !border-transparent hover:!text-[hsl(var(--brand-700))] hover:!bg-[hsl(var(--card))]'
                }`}
              >
                <Boxes className={`w-3.5 h-3.5 ${activeTab === 'builtin' ? '!text-white' : ''}`} />
                <span className={activeTab === 'builtin' ? '!text-white' : ''}>内置</span>
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`flex-1 px-2.5 py-1.5 text-[12px] font-semibold rounded-[6px] transition-[background-color,color,border-color,box-shadow] duration-150 ease-out flex items-center justify-center gap-1.5 border ${
                  activeTab === 'custom'
                    ? '!bg-[hsl(var(--violet-600))] !text-white !border-[hsl(var(--violet-700))] shadow-pop'
                    : '!bg-transparent !text-[hsl(var(--muted-foreground))] !border-transparent hover:!text-[hsl(var(--violet-700))] hover:!bg-[hsl(var(--card))]'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'custom' ? '!text-white' : ''}`} />
                <span className={activeTab === 'custom' ? '!text-white' : ''}>自定义</span>
              </button>
            </div>

            {activeTab === 'builtin' && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="relative group flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] transition-colors duration-150 group-focus-within:text-[hsl(var(--brand-600))]" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索模块/拼音/英文..."
                      className="pl-8 pr-7 h-8 !text-[12px] !rounded-[8px]"
                    />
                    {searchQuery && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[hsl(var(--danger-50))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger-600))] transition-colors active:scale-90"
                        onClick={() => setSearchQuery('')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {/* 收藏筛选按钮 - 琥珀色 */}
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`flex items-center justify-center h-8 w-8 rounded-[8px] transition-all duration-200 active:scale-90 ${
                      showFavoritesOnly
                        ? 'bg-[hsl(var(--amber-500))] text-white border border-[hsl(var(--amber-600))] shadow-warning-glow'
                        : 'bg-[hsl(var(--slate-100))] text-[hsl(var(--slate-500))] border border-[hsl(var(--slate-200))] hover:bg-[hsl(var(--amber-50))] hover:text-[hsl(var(--amber-600))] hover:border-[hsl(var(--amber-500)/0.4)]'
                    }`}
                    title={showFavoritesOnly ? `仅显示收藏 (${favoriteModules.length})` : `显示收藏 (${favoriteModules.length})`}
                  >
                    <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                  </button>
                </div>
                {searchQuery && (
                  <div className="status-row status-row-info !py-1.5 !px-2.5 animate-fade-in">
                    <Search className="w-3 h-3" />
                    <span className="text-[11px]">
                      找到 <span className="text-[hsl(var(--brand-700))] font-bold">{filteredModulesCount}</span> 个模块
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          
          {activeTab === 'builtin' ? (
            <ScrollArea className="flex-1 p-2">
              {filteredCategories.length === 0 ? (
                <div className="empty-state animate-fade-in">
                  <div className="empty-state-icon">
                    <Search className="w-7 h-7" strokeWidth={1.6} />
                  </div>
                  <div className="empty-state-title">未找到匹配的模块</div>
                  <div className="empty-state-desc">试试拼音、首字母或英文关键词</div>
                </div>
              ) : (
                filteredCategories.map((category) => {
                  const expanded = isExpanded(category.name)
                  return (
                    <div
                      key={category.name}
                      className="mb-2"
                    >
                      <button
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] transition-[background-color,color,border-color,box-shadow] duration-150 ease-out group bg-[hsl(var(--card))] hover:bg-[hsl(var(--brand-50))] hover:border-[hsl(var(--brand-500)/0.3)] border border-transparent hover:shadow-xs"
                        onClick={() => toggleCategory(category.name)}
                      >
                        <div className={`transition-transform duration-200 ease-out ${expanded ? 'rotate-0' : '-rotate-90'}`}>
                          <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--slate-500))] group-hover:text-[hsl(var(--brand-600))]" />
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full ${category.color} ring-2 ring-white shadow-soft`} />
                        <span className="text-[12px] font-semibold flex-1 text-left text-[hsl(var(--slate-800))] transition-colors group-hover:text-[hsl(var(--brand-800))]">
                          {category.name}
                        </span>
                        <span className="text-[10.5px] font-mono text-[hsl(var(--slate-500))] bg-[hsl(var(--slate-100))] px-1.5 py-0.5 rounded-full transition-colors group-hover:bg-[hsl(var(--brand-100))] group-hover:text-[hsl(var(--brand-700))]">
                          {category.modules.length}
                        </span>
                      </button>
                      {/* 关键性能优化：未展开时完全不渲染子模块 DOM
                          这样画布操作时不会有数百个隐形 ModuleItem 占用事件循环 */}
                      {expanded && (
                        <div className="mt-1 animate-fade-in">
                          <div className="ml-3 pl-2 space-y-0.5 border-l border-dashed border-[hsl(var(--border))]">
                            {category.modules.map((type) => (
                              <ModuleItem
                                key={type}
                                type={type}
                                highlight={searchQuery}
                                isFavorite={favoriteModules.includes(type)}
                                customColor={stats[type]?.customColor}
                                onToggleFavorite={toggleFavorite}
                                onSetCustomColor={handleSetCustomColor}
                                onIncrementUsage={incrementUsage}
                                enableSortDrag={false}
                                onSortDragStart={undefined}
                                onSortDragOver={undefined}
                                onSortDrop={undefined}
                                sortDragOverType={null}
                                sortDraggingType={null}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </ScrollArea>
          ) : (
            <CustomModuleList
              onCreateNew={() => setShowCreateDialog(true)}
              onManage={() => setShowManageDialog(true)}
              onDragStart={(module) => {
                // 自定义模块拖拽开始
                console.log('拖拽自定义模块:', module.name)
              }}
              onEditWorkflow={async (module) => {
                // 编辑自定义模块的工作流
                console.log('编辑自定义模块工作流:', module.name)
                
                // 1. 使用自定义确认对话框
                const shouldEdit = await confirmDialog(
                  `确定要编辑"${module.display_name || module.name}"的内部工作流吗？\n\n` +
                  `当前画布内容将被替换为该模块的工作流。\n` +
                  `建议先保存当前工作流。`,
                  {
                    type: 'warning',
                    title: '编辑模块工作流',
                    confirmText: '确定编辑',
                    cancelText: '取消'
                  }
                )
                
                if (!shouldEdit) return
                
                // 2. 转换节点类型：后端类型 -> 前端类型
                const convertedNodes = module.workflow.nodes.map((node: any) => {
                  let frontendType = 'moduleNode'  // 默认类型
                  
                  // 特殊节点类型转换
                  if (node.type === 'group') {
                    frontendType = 'groupNode'
                  } else if (node.type === 'note') {
                    frontendType = 'noteNode'
                  } else if (node.type === 'subflow_header') {
                    frontendType = 'subflowHeaderNode'
                  }
                  
                  return {
                    ...node,
                    type: frontendType,
                    data: {
                      ...node.data,
                      moduleType: node.type  // 保存原始类型到data.moduleType
                    }
                  }
                })
                
                // 3. 加载模块的工作流到画布
                const { loadWorkflow } = useWorkflowStore.getState()
                loadWorkflow({
                  nodes: convertedNodes,
                  edges: module.workflow.edges,
                  name: `编辑模块: ${module.display_name || module.name}`
                })
                
                // 4. 保存模块ID到sessionStorage，用于后续保存
                sessionStorage.setItem('editingCustomModuleId', module.id)
                sessionStorage.setItem('editingCustomModuleName', module.display_name || module.name)
                
                // 触发自定义事件通知Toolbar
                window.dispatchEvent(new CustomEvent('editingModuleChanged'))
              }}
            />
          )}
        </>
      )}

      {/* 创建/编辑自定义模块对话框 */}
      <CreateCustomModuleDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false)
          setEditingModule(null)
        }}
        editingModule={editingModule}
      />

      {/* 管理自定义模块对话框 */}
      <CustomModuleManageDialog
        open={showManageDialog}
        onClose={() => setShowManageDialog(false)}
        onEdit={(mod) => {
          setShowManageDialog(false)
          setEditingModule(mod)
          setShowCreateDialog(true)
        }}
      />
      
      {/* 确认对话框 */}
      <ConfirmDialog />

      {/* 右边缘拖拽手柄（仅未折叠时显示）*/}
      {!isCollapsed && (
        <PanelResizer
          direction="horizontal"
          side="right"
          size={effectiveWidth}
          minSize={LAYOUT_LIMITS.left.min}
          maxSize={LAYOUT_LIMITS.left.max}
          factor={1}
          onLive={(w) => setDraftWidth(w)}
          onCommit={(w) => {
            setLeftWidth(w)
            setDraftWidth(null)
          }}
        />
      )}
    </aside>
  )
}

// memo 包装，避免画布操作触发的父组件重渲染传到这里
export const ModuleSidebar = memo(ModuleSidebarRaw)

// 导出模块分类数据供其他组件使用
export { moduleCategories }

// 导出模块图标映射
export { moduleIcons }

// 导出模块搜索关键词映射（供其它选择器做拼音/关键词搜索）
export { moduleKeywords }

// 获取所有可用模块的扁平列表（包括自定义模块）
export function getAllAvailableModules() {
  // 内置模块
  const builtInModules = moduleCategories.flatMap(category => 
    category.modules.map(type => ({
      type,
      label: moduleTypeLabels[type] || type,
      category: category.name,
      icon: moduleIcons[type] || Globe,
      isCustom: false
    }))
  )
  
  // 自定义模块
  const customModules = useCustomModuleStore.getState().modules.map(module => ({
    type: `custom_${module.id}` as ModuleType, // 使用特殊前缀标识自定义模块
    label: module.display_name,
    category: module.category || '自定义',
    icon: Puzzle, // 使用拼图图标表示自定义模块
    isCustom: true,
    customModuleId: module.id
  }))
  
  return [...builtInModules, ...customModules]
}
