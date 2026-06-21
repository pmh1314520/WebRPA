-- ============================================================
-- WebRPA 测试数据库 - 种子数据
-- 用途: 为工作流测试提供丰富的样本数据
-- ============================================================

-- -----------------------------------------------------------
-- 用户数据
-- -----------------------------------------------------------
INSERT INTO users (user_id, username, real_name, email, phone, role, department, status, score) VALUES
('U001', 'zhangsan', '张三', 'zhangsan@example.com', '13800138001', 'admin',   '技术研发部', 'active',   98.5),
('U002', 'lisi',     '李四', 'lisi@example.com',     '13800138002', 'editor', '产品部',     'active',   85.2),
('U003', 'wangwu',   '王五', 'wangwu@example.com',   '13800138003', 'viewer', '市场部',     'active',   72.0),
('U004', 'zhaoliu',  '赵六', 'zhaoliu@example.com',  '13800138004', 'editor', '技术研发部', 'inactive', 91.3),
('U005', 'sunqi',    '孙七', 'sunqi@example.com',    '13800138005', 'admin',  '运维部',     'active',   95.7),
('U006', 'zhouba',   '周八', 'zhouba@example.com',   '13800138006', 'viewer', '人事部',     'active',   68.4),
('U007', 'wujiu',    '吴九', 'wujiu@example.com',    '13800138007', 'editor', '财务部',     'active',   88.1),
('U008', 'zhengshi', '郑十', 'zhengshi@example.com', '13800138008', 'viewer', '市场部',     'suspended',45.6),
('U009', 'edge_user','Edge 🎭','edge@example.com',   '13800138009', 'admin',  '技术研发部', 'active',  100.0),
('U010', 'xtest',    '测试员','xtest@example.com',   '13800138010', 'viewer', '测试部',     'active',   80.0);

-- -----------------------------------------------------------
-- 订单数据
-- -----------------------------------------------------------
INSERT INTO orders (order_id, customer_name, product, quantity, unit_price, total_amount, currency, status, payment_method, shipping_address, order_date, delivery_date) VALUES
('ORD-20260601-001', '张三', 'WebRPA Pro 年费版',        1, 2999.00, 2999.00, 'CNY', 'paid',     'alipay',        '江苏省盐城市亭湖区XX路1号',      '2026-06-01', '2026-06-03'),
('ORD-20260602-001', '李四', 'WebRPA 标准版',              2,  999.00, 1998.00, 'CNY', 'paid',     'wechat',        '北京市朝阳区XX大厦',            '2026-06-02', '2026-06-05'),
('ORD-20260603-001', '王五', 'WebRPA 插件包-AI增强',       5,  199.00,  995.00, 'CNY', 'shipping', 'credit_card',   '上海市浦东新区XX路',            '2026-06-03', '2026-06-07'),
('ORD-20260604-001', '赵六', 'WebRPA Pro 月费版',          1,  299.00,  299.00, 'CNY', 'pending',  'alipay',        '广州市天河区XX街',              '2026-06-04', NULL),
('ORD-20260605-001', '孙七', 'WebRPA Enterprise',          1, 9999.00, 9999.00, 'CNY', 'paid',     'bank_transfer', '深圳市南山区XX科技园',          '2026-06-05', '2026-06-08'),
('ORD-20260606-001', '周八', 'WebRPA 标准版',              1,  999.00,  999.00, 'USD', 'refunded', 'credit_card',   '123 Main St, New York',         '2026-06-06', NULL),
('ORD-20260607-001', '吴九', 'WebRPA Pro 年费版',          3, 2999.00, 8997.00, 'CNY', 'cancelled','paypal',        '杭州市西湖区XX路',              '2026-06-07', NULL),
('ORD-20260608-001', '郑十', 'WebRPA 插件包-桌面自动化',  10,  149.00, 1490.00, 'CNY', 'paid',     'wechat',        '成都市锦江区XX巷',              '2026-06-08', '2026-06-12'),
('ORD-20260609-001', '张三', 'WebRPA 插件包-数据采集',     1,  249.00,  249.00, 'CNY', 'paid',     'alipay',        '江苏省盐城市亭湖区XX路1号',      '2026-06-09', '2026-06-11'),
('ORD-20260610-001', '未知客户','WebRPA 标准版',           1,  999.00,  999.00, 'CNY', 'pending',  '',              '未填写',                        '2026-06-10', NULL),
('ORD-20260611-001', '张三', 'WebRPA Pro 年费版',          1, 2999.00, 2999.00, 'CNY', 'paid',     'alipay',        '江苏省盐城市亭湖区XX路1号',      '2026-06-11', '2026-06-13'),
('ORD-20260612-001', '李四', 'WebRPA 插件包-AI增强',       3,  199.00,  597.00, 'CNY', 'delivered','wechat',        '北京市朝阳区XX大厦',            '2026-06-12', '2026-06-15');

-- -----------------------------------------------------------
-- 产品数据
-- -----------------------------------------------------------
INSERT INTO products (product_id, name, category, price, stock, status, description) VALUES
('P001', 'WebRPA 标准版',            '软件授权',  999.00, 999, 'on_sale',     'WebRPA 基础版本，适合个人和小型团队'),
('P002', 'WebRPA Pro 月费版',        '软件授权',  299.00, 500, 'on_sale',     '按月订阅，含高级功能'),
('P003', 'WebRPA Pro 年费版',        '软件授权', 2999.00, 300, 'on_sale',     '按年订阅，性价比最高'),
('P004', 'WebRPA Enterprise',        '软件授权', 9999.00,  50, 'on_sale',     '企业版，含专属技术支持'),
('P005', 'WebRPA 插件包-AI增强',     '插件',      199.00, 200, 'on_sale',     'AI 对话/视觉/智能爬虫等 AI 插件'),
('P006', 'WebRPA 插件包-桌面自动化', '插件',      149.00, 150, 'on_sale',     '桌面控件操作增强插件'),
('P007', 'WebRPA 插件包-数据采集',   '插件',      249.00, 100, 'on_sale',     '智能数据采集与清洗插件'),
('P008', 'WebRPA 插件包-手机自动化', '插件',      179.00, 120, 'off_sale',    '手机投屏与自动化操控插件'),
('P009', 'WebRPA 旧版授权',          '软件授权',  499.00,   0, 'discontinued','已停售的旧版本');

-- -----------------------------------------------------------
-- 审计日志
-- -----------------------------------------------------------
INSERT INTO audit_logs (user_id, action, target, detail, ip_address, created_at) VALUES
('U001', 'login',          'system',   '管理员登录系统',              '192.168.1.100', '2026-06-20 09:00:00'),
('U001', 'create_workflow','WF-001',   '创建工作流: 每日数据采集',   '192.168.1.100', '2026-06-20 09:15:00'),
('U002', 'login',          'system',   '编辑登录系统',                '192.168.1.101', '2026-06-20 09:30:00'),
('U002', 'edit_workflow',  'WF-001',   '修改工作流: 更新采集频率',   '192.168.1.101', '2026-06-20 10:00:00'),
('U003', 'login',          'system',   '查看员登录系统',              '192.168.1.102', '2026-06-20 10:30:00'),
('U001', 'delete_workflow','WF-002',   '删除工作流: 旧版测试流程',   '192.168.1.100', '2026-06-20 11:00:00'),
('U005', 'login',          'system',   '运维登录系统',                '192.168.1.105', '2026-06-20 14:00:00'),
('U005', 'run_workflow',   'WF-001',   '执行工作流: 每日数据采集',   '192.168.1.105', '2026-06-20 14:30:00'),
('U001', 'update_config',  'ai',       '更新 AI 配置: model→gpt-4o', '192.168.1.100', '2026-06-21 08:00:00'),
('U001', 'export_data',    'orders',   '导出订单数据: 2026-06',       '192.168.1.100', '2026-06-21 09:00:00');

-- -----------------------------------------------------------
-- 配置键值
-- -----------------------------------------------------------
INSERT INTO config_kv (config_key, config_value, description) VALUES
('ai.api_url',          'https://api.openai.com/v1',           'AI API 地址'),
('ai.model',            'gpt-4o',                              'AI 默认模型'),
('ai.temperature',      '0.7',                                 'AI 温度参数'),
('ai.max_tokens',       '4096',                                'AI 最大 Token 数'),
('browser.type',        'chromium',                            '浏览器类型'),
('browser.fullscreen',  'false',                               '是否全屏'),
('email.smtp_server',   'smtp.example.com',                    '邮件 SMTP 服务器'),
('email.smtp_port',     '465',                                 '邮件 SMTP 端口'),
('system.timezone',     'Asia/Shanghai',                       '系统时区'),
('system.language',     'zh-CN',                               '系统语言');

-- -----------------------------------------------------------
-- 任务调度
-- -----------------------------------------------------------
INSERT INTO scheduled_tasks (task_name, workflow_id, trigger_type, trigger_config, enabled, last_run, next_run, run_count, status) VALUES
('每日数据采集',   'WF-001', 'cron',     '{"cron":"0 9 * * *","tz":"Asia/Shanghai"}',     TRUE,  '2026-06-21 09:00:00', '2026-06-22 09:00:00', 30, 'idle'),
('每周报表生成',   'WF-002', 'cron',     '{"cron":"0 18 * * 5","tz":"Asia/Shanghai"}',    TRUE,  '2026-06-20 18:00:00', '2026-06-27 18:00:00', 4,  'idle'),
('每小时监控',     'WF-003', 'interval', '{"interval_seconds":3600}',                     TRUE,  '2026-06-21 10:00:00', '2026-06-21 11:00:00', 150,'running'),
('数据备份',       'WF-004', 'cron',     '{"cron":"0 2 * * *","tz":"Asia/Shanghai"}',     FALSE, '2026-06-20 02:00:00', NULL,                  29, 'idle'),
('一次性通知测试', 'WF-005', 'once',     '{"once_time":"2026-06-21T12:00:00+08:00"}',     TRUE,  NULL,                  '2026-06-21 12:00:00', 0,  'idle');
