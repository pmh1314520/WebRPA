/**
 * 模块默认变量名集中表
 *
 * 用于变量名输入框（VariableNameInput）和变量补全（VariableInput）
 * 当用户没填某个 result/saveTo 类字段时，按这里的默认名提供（也会出现在变量补全列表中）。
 *
 * 数据格式：[moduleType][fieldName] = 默认变量名
 *
 * 新增模块时只需在这一处添加，不要再到处分散硬编码。
 */
export const MODULE_DEFAULT_VARS: Record<string, Record<string, string>> = {
  // ==================== 媒体处理 ====================
  format_convert: { resultVariable: 'converted_path' },
  compress_image: { resultVariable: 'compressed_image' },
  compress_video: { resultVariable: 'compressed_video' },
  extract_audio: { resultVariable: 'extracted_audio' },
  trim_video: { resultVariable: 'trimmed_video' },
  merge_media: { resultVariable: 'merged_file' },
  add_watermark: { resultVariable: 'watermarked_file' },
  face_recognition: { resultVariable: 'face_match_result' },
  image_ocr: { resultVariable: 'ocr_text' },
  rotate_video: { resultVariable: 'rotated_video' },
  video_speed: { resultVariable: 'speed_video' },
  extract_frame: { resultVariable: 'frame_image' },
  add_subtitle: { resultVariable: 'subtitled_video' },
  adjust_volume: { resultVariable: 'adjusted_audio' },
  resize_video: { resultVariable: 'resized_video' },
  camera_capture: { saveToVariable: 'camera_photo' },
  camera_record: { saveToVariable: 'camera_video' },

  // ==================== 触发器 ====================
  element_change_trigger: {
    saveNewElementSelector: 'new_element_selector',
    saveToVariable: 'element_change_info',
  },
  webhook_trigger: { saveToVariable: 'webhook_data' },
  file_watcher_trigger: { saveToVariable: 'file_event' },
  email_trigger: { saveToVariable: 'email_data' },
  api_trigger: { saveToVariable: 'api_response' },
  mouse_trigger: { saveToVariable: 'mouse_position' },
  image_trigger: { saveToVariable: 'image_position' },
  sound_trigger: { saveToVariable: 'sound_volume' },
  face_trigger: { saveToVariable: 'face_detected' },
  gesture_trigger: { saveToVariable: 'gesture_info' },

  // ==================== 数据/网络/AI ====================
  api_request: { resultVariable: 'api_response' },
  send_email: { resultVariable: 'email_sent' },
  read_excel: { resultVariable: 'excel_data' },
  // Excel 自动化（openpyxl）读取类模块
  excel_read_cell: { resultVariable: 'cell_value' },
  excel_read_range: { resultVariable: 'range_data' },
  excel_read_dicts: { resultVariable: 'records' },
  excel_read_formula: { resultVariable: 'cell_value' },
  excel_list_sheets: { resultVariable: 'sheet_list' },
  excel_get_info: { resultVariable: 'sheet_info' },
  excel_count_rows: { resultVariable: 'row_count' },
  excel_find_empty_row: { resultVariable: 'empty_row' },
  excel_find_empty_col: { resultVariable: 'empty_col' },
  excel_find_empty_cell: { resultVariable: 'empty_cell' },
  excel_run_macro: { resultVariable: 'macro_result' },
  screenshot: { resultVariable: 'screenshot_path' },
  get_element_info: { resultVariable: 'element_info' },
  download_file: { resultVariable: 'file_downloaded' },
  extract_table_data: { resultVariable: 'table_data' },
  run_command: { resultVariable: 'command_output' },
  js_script: { resultVariable: 'js_result' },
  python_script: { resultVariable: 'python_result' },
  ai_chat: { resultVariable: 'ai_response' },
  ai_extract: { variableName: 'extracted_data' },
  ai_classify: { variableName: 'category' },
  ai_summarize: { variableName: 'summary' },
  ai_translate: { variableName: 'translation' },
  ai_sentiment: { variableName: 'sentiment' },
  ai_normalize: { variableName: 'normalized' },
  ai_dedup_semantic: { variableName: 'deduped_list' },
  ai_route: { variableName: 'route' },
  ai_vision: { resultVariable: 'vision_result' },
  ai_vision_act: { variableName: 'vision_target' },
  assert_checkpoint: { variableName: 'assert_passed' },
  ocr_captcha: { resultVariable: 'captcha_text' },
  click_image: { resultVariable: 'image_clicked' },
  click_text: { resultVariable: 'text_clicked' },
  hover_image: { resultVariable: 'image_hovered' },
  hover_text: { resultVariable: 'text_hovered' },
  drag_image: { resultVariable: 'image_dragged' },
  image_exists: { resultVariable: 'image_found' },
  element_exists: { resultVariable: 'element_found' },
  element_visible: { resultVariable: 'element_visible' },
  list_operation: { resultVariable: 'list_result' },
  dict_operation: { resultVariable: 'dict_result' },
  string_replace: { resultVariable: 'replaced_string' },
  regex_extract: { resultVariable: 'regex_result' },
  json_parse: { resultVariable: 'json_data' },
  base64: { resultVariable: 'encoded_data' },
  random_number: { resultVariable: 'random_value' },
  get_time: { resultVariable: 'current_time' },
  db_query: { resultVariable: 'query_result' },
  db_execute: { resultVariable: 'execute_result' },
  db_insert: { resultVariable: 'insert_result' },
  db_update: { resultVariable: 'update_result' },
  db_delete: { resultVariable: 'delete_result' },
  list_get: { resultVariable: 'list_item' },
  list_length: { resultVariable: 'list_size' },
  dict_get: { resultVariable: 'dict_value' },
  dict_keys: { resultVariable: 'dict_keys_list' },
  get_clipboard: { resultVariable: 'clipboard_content' },
  get_mouse_position: { resultVariable: 'mouse_position' },
  screenshot_screen: { resultVariable: 'screen_shot' },
  list_files: { resultVariable: 'files_list' },
  get_file_info: { resultVariable: 'file_info' },
  read_text_file: { resultVariable: 'file_content' },
  input_prompt: { resultVariable: 'user_input' },
  network_capture: { resultVariable: 'network_requests' },
  firecrawl_scrape: { resultVariable: 'firecrawl_data' },
  firecrawl_map: { resultVariable: 'firecrawl_links' },
  firecrawl_crawl: { resultVariable: 'firecrawl_pages' },
  ai_smart_scraper: { resultVariable: 'scraped_data' },
  ai_element_selector: { resultVariable: 'selector_result' },

  // ==================== 手机自动化 ====================
  phone_screenshot: { resultVariable: 'phone_screenshot' },
  phone_get_clipboard: { resultVariable: 'phone_clipboard_content' },
  phone_click_image: { resultVariable: 'phone_image_clicked' },
  phone_click_text: { resultVariable: 'phone_text_clicked' },
  phone_wait_image: { resultVariable: 'phone_image_found' },
  phone_image_exists: { resultVariable: 'phone_image_exists' },

  // ==================== 二维码 / 图像处理 ====================
  qr_generate: { resultVariable: 'qr_image' },
  qr_decode: { resultVariable: 'qr_text' },
  image_format_convert: { resultVariable: 'converted_image' },
  image_resize: { resultVariable: 'resized_image' },
  image_crop: { resultVariable: 'cropped_image' },
  image_rotate: { resultVariable: 'rotated_image' },
  image_flip: { resultVariable: 'flipped_image' },
  image_blur: { resultVariable: 'blurred_image' },
  image_sharpen: { resultVariable: 'sharpened_image' },
  image_brightness: { resultVariable: 'bright_image' },
  image_contrast: { resultVariable: 'contrast_image' },
  image_color_balance: { resultVariable: 'balanced_image' },
  image_convert_format: { resultVariable: 'converted_image' },
  image_add_text: { resultVariable: 'text_image' },
  image_merge: { resultVariable: 'merged_image' },
  image_thumbnail: { resultVariable: 'thumbnail_image' },
  image_filter: { resultVariable: 'filtered_image' },
  image_get_info: { resultVariable: 'image_info' },
  image_remove_bg: { resultVariable: 'transparent_image' },
  image_grayscale: { resultVariable: 'gray_image' },
  image_round_corners: { resultVariable: 'rounded_image' },

  // ==================== 盲水印（隐式数字水印） ====================
  bwm_embed_text: { resultVariable: 'wm_bit_len' },
  bwm_extract_text: { resultVariable: 'extracted_text' },
  bwm_embed_image: { resultVariable: 'wm_image_shape' },
  bwm_extract_image: { resultVariable: 'extracted_wm_path' },

  // ==================== 实用工具 ====================
  file_hash_compare: { resultVariable: 'hash_compare_result' },
  file_diff_compare: { resultVariable: 'diff_compare_result' },
  folder_hash_compare: { resultVariable: 'folder_hash_result' },
  folder_diff_compare: { resultVariable: 'folder_diff_result' },
  random_password_generator: { resultVariable: 'generated_password' },
  url_encode_decode: { resultVariable: 'url_result' },
  md5_encrypt: { resultVariable: 'md5_hash' },
  sha_encrypt: { resultVariable: 'sha_hash' },
  timestamp_converter: { resultVariable: 'timestamp_result' },
  rgb_to_hsv: { resultVariable: 'hsv_color' },
  rgb_to_cmyk: { resultVariable: 'cmyk_color' },
  hex_to_cmyk: { resultVariable: 'cmyk_color' },
  uuid_generator: { resultVariable: 'uuid' },

  // ==================== PDF ====================
  pdf_extract_text: { resultVariable: 'pdf_text' },
  pdf_extract_images: { resultVariable: 'pdf_images' },
  pdf_get_info: { resultVariable: 'pdf_info' },
  pdf_to_images: { resultVariable: 'pdf_images_paths' },
  pdf_to_word: { resultVariable: 'word_path' },

  // ==================== 控制流 / 循环 ====================
  foreach: { itemVariable: 'item', indexVariable: 'index' },
  foreach_dict: { keyVariable: 'key', valueVariable: 'value', indexVariable: 'index' },
  loop: { indexVariable: 'index' },
  infinite_loop: { indexVariable: 'index' },

  // ==================== 数学/统计 ====================
  list_sum: { resultVariable: 'sum_result' },
  list_average: { resultVariable: 'average_result' },
  list_max: { resultVariable: 'max_value' },
  list_min: { resultVariable: 'min_value' },
  list_sort: { resultVariable: 'sorted_list' },
  list_unique: { resultVariable: 'unique_list' },
  list_count: { resultVariable: 'count_result' },
  list_find: { resultVariable: 'find_result' },
  list_filter: { resultVariable: 'filtered_list' },
  list_map: { resultVariable: 'mapped_list' },
  list_merge: { resultVariable: 'merged_list' },
  list_flatten: { resultVariable: 'flat_list' },
  list_chunk: { resultVariable: 'chunks' },
  list_reverse: { resultVariable: 'reversed_list' },
  math_round: { resultVariable: 'round_result' },
  math_floor: { resultVariable: 'floor_result' },
  math_modulo: { resultVariable: 'modulo_result' },
  math_abs: { resultVariable: 'abs_result' },
  math_sqrt: { resultVariable: 'sqrt_result' },
  math_power: { resultVariable: 'power_result' },
  math_log: { resultVariable: 'log_result' },
  math_trig: { resultVariable: 'trig_result' },
  math_exp: { resultVariable: 'exp_result' },
  math_gcd: { resultVariable: 'gcd_result' },
  math_lcm: { resultVariable: 'lcm_result' },
  math_factorial: { resultVariable: 'factorial_result' },
  math_percentage: { resultVariable: 'percentage' },
  math_clamp: { resultVariable: 'clamped_value' },
  math_random_advanced: { resultVariable: 'random_advanced' },
  math_base_convert: { resultVariable: 'base_result' },
  stat_median: { resultVariable: 'median' },
  stat_mode: { resultVariable: 'mode' },
  stat_variance: { resultVariable: 'variance' },
  stat_stdev: { resultVariable: 'stdev' },
  stat_percentile: { resultVariable: 'percentile' },
  csv_parse: { resultVariable: 'csv_data' },
  csv_generate: { resultVariable: 'csv_text' },

  // ==================== 字典 ====================
  dict_merge: { resultVariable: 'merged_dict' },
  dict_filter: { resultVariable: 'filtered_dict' },
  dict_invert: { resultVariable: 'inverted_dict' },
  dict_sort: { resultVariable: 'sorted_dict' },
  dict_get_path: { resultVariable: 'path_value' },
  dict_flatten: { resultVariable: 'flat_dict' },

  // ==================== 字符串 ====================
  string_split: { resultVariable: 'split_result' },
  string_join: { resultVariable: 'joined_string' },
  string_concat: { resultVariable: 'concat_string' },
  string_trim: { resultVariable: 'trimmed_string' },
  string_case: { resultVariable: 'cased_string' },
  string_substring: { resultVariable: 'sub_string' },
  list_to_string_advanced: { resultVariable: 'joined_string' },

  // ==================== 桌面应用 ====================
  desktop_get_text: { resultVariable: 'control_text' },
  desktop_get_control_info: { resultVariable: 'control_info' },
  desktop_get_control_tree: { resultVariable: 'control_tree' },
  desktop_app_get_info: { resultVariable: 'app_info' },
  desktop_window_list: { resultVariable: 'window_list' },
  desktop_get_property: { resultVariable: 'property_value' },
  desktop_window_capture: { resultVariable: 'window_screenshot' },

  // 桌面影刀级新模块（智能查找/批量抓取/UI快照/XPath 等）
  desktop_find_control_smart: { saveToVariable: 'desktop_control' },
  desktop_extract_table: { variableName: 'extracted_data' },
  desktop_get_app_state: { variableName: 'app_state' },
  desktop_query_with_xpath: { saveToVariable: 'desktop_control' },
  desktop_select_text: { variableName: 'selected_text' },
  desktop_get_focused_control: { saveToVariable: 'focused_control' },

  // ==================== AI 媒体 ====================
  ai_generate_image: { resultVariable: 'generated_image' },
  ai_generate_video: { resultVariable: 'generated_video' },
  audio_to_text: { resultVariable: 'audio_text' },

  // ==================== Allure 测试 ====================
  allure_init: { resultVariable: 'allure_initialized' },
  allure_start_test: { resultVariable: 'test_id' },
  allure_generate_report: { resultVariable: 'report_path' },

  // ==================== 数据库扩展 ====================
  oracle_query: { resultVariable: 'oracle_result' },
  oracle_execute: { resultVariable: 'oracle_affected' },
  postgresql_query: { resultVariable: 'pg_result' },
  postgresql_execute: { resultVariable: 'pg_affected' },
  mongodb_find: { resultVariable: 'mongo_documents' },
  sqlserver_query: { resultVariable: 'mssql_result' },
  sqlserver_execute: { resultVariable: 'mssql_affected' },
  sqlite_query: { resultVariable: 'sqlite_result' },
  sqlite_execute: { resultVariable: 'sqlite_affected' },
  redis_get: { resultVariable: 'redis_value' },
  redis_hget: { resultVariable: 'redis_hash_value' },

  // ==================== SSH ====================
  ssh_execute_command: { resultVariable: 'ssh_output' },

  // ==================== SAP ====================
  sap_get_field_value: { resultVariable: 'field_value' },
  sap_get_status_message: { resultVariable: 'status_message' },
  sap_get_title: { resultVariable: 'title_text' },
  sap_read_gridview: { resultVariable: 'grid_data' },
  sap_export_gridview_excel: { resultVariable: 'export_path' },

  // ==================== Webhook 请求 ====================
  webhook_request: { resultVariable: 'webhook_response' },

  // ==================== 飞书 ====================
  feishu_bitable_read: { resultVariable: 'bitable_data' },
  feishu_sheet_read: { resultVariable: 'sheet_data' },

  // ==================== 文本/媒体识别 ====================
  network_monitor_wait: { resultVariable: 'monitored_request' },
}

/**
 * 获取某个模块某个字段的默认变量名
 * 找不到时返回 undefined
 */
export function getModuleDefaultVar(moduleType: string, field: string): string | undefined {
  return MODULE_DEFAULT_VARS[moduleType]?.[field]
}

/**
 * 获取某个模块所有定义的默认变量名（多个字段）
 */
export function getModuleAllDefaultVars(moduleType: string): Record<string, string> {
  return MODULE_DEFAULT_VARS[moduleType] || {}
}

/**
 * 权威「会产生变量的字段名」清单（唯一数据源）。
 *
 * 变量名输入框 / 变量引用补全 / 变量追踪等所有需要“从节点配置中提取已定义变量”
 * 的地方都应引用此清单，确保任何模块（含创建时即内置变量的模块）的变量都能被
 * 自动补全识别到，避免各处各自维护、出现遗漏。
 */
export const VARIABLE_NAME_FIELDS: string[] = [
  // 通用
  'variableName', 'resultVariable', 'outputVariable', 'targetVariable', 'dataVariable',
  'saveResult', 'saveToVariable',
  // 循环/遍历
  'itemVariable', 'indexVariable', 'loopIndexVariable', 'keyVariable', 'valueVariable',
  // 坐标
  'variableNameX', 'variableNameY',
  // 列表/字典/表格
  'listVariable', 'dictVariable', 'tableVariable',
  // 类型化结果
  'imageVariable', 'textVariable', 'urlVariable', 'fileVariable', 'sourceVariable',
  'responseVariable', 'cookieVariable', 'headerVariable', 'bodyVariable', 'statusVariable',
  'errorVariable', 'countVariable', 'sumVariable', 'avgVariable', 'maxVariable', 'minVariable',
  'connectionVariable', 'shareVariable',
  // Python 脚本
  'stdoutVariable', 'stderrVariable', 'returnCodeVariable',
  // 桌面自动化
  'appVariable', 'controlVariable',
  // 触发器/元素变化
  'saveNewElementSelector', 'saveChangeInfo', 'dataSource',
]


/**
 * 收集一个节点在「创建时」应自动建立的变量名集合：
 *  1) 节点配置里已填写的变量名字段（VARIABLE_NAME_FIELDS）
 *  2) 该模块类型自带的默认变量名（MODULE_DEFAULT_VARS）——即使配置里尚未填，
 *     创建时也应内置（例如循环模块的 index、遍历模块的 item/index）。
 * 供流程图 addNode 与模块条创建路径共用，确保任何模块创建即在全局变量中建好自带变量。
 */
export function collectNodeVarNames(moduleType: string, data?: Record<string, unknown>): string[] {
  const names = new Set<string>()
  if (data) {
    for (const f of VARIABLE_NAME_FIELDS) {
      const v = (data as Record<string, unknown>)[f]
      if (typeof v === 'string' && v.trim()) names.add(v.trim())
    }
  }
  const defs = MODULE_DEFAULT_VARS[moduleType]
  if (defs) {
    for (const v of Object.values(defs)) {
      if (v && typeof v === 'string' && v.trim()) names.add(v.trim())
    }
  }
  return Array.from(names)
}
