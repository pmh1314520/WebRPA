// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio, Child};
use std::sync::{Arc, Mutex};
use std::io::{BufRead, BufReader};
use std::thread;
use tauri::{Manager, Window};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};
use tauri_plugin_autostart::ManagerExt;
use serde::{Deserialize, Serialize};
use reqwest;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Debug, Serialize, Deserialize)]
struct Config {
    backend: BackendConfig,
    frontend: FrontendConfig,
}

#[derive(Debug, Serialize, Deserialize)]
struct BackendConfig {
    host: String,
    port: u16,
    reload: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct FrontendConfig {
    host: String,
    port: u16,
    #[serde(default, rename = "fastStart")]
    fast_start: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct VersionInfo {
    current_version: String,
    latest_version: String,
    has_update: bool,
    update_url: String,
    release_date: String,
    changelog: String,
}

#[derive(Debug, Deserialize)]
struct RemoteVersionInfo {
    version: String,
    #[serde(rename = "releaseDate")]
    release_date: Option<String>,
    changelog: Option<String>,
}

struct AppState {
    backend_process: Arc<Mutex<Option<Child>>>,
    frontend_process: Arc<Mutex<Option<Child>>>,
    backend_pid: Arc<Mutex<Option<u32>>>,
    frontend_pid: Arc<Mutex<Option<u32>>>,
}

// Windows下杀死进程树
#[cfg(target_os = "windows")]
fn kill_process_tree(pid: u32) {
    let _ = Command::new("taskkill")
        .args(&["/F", "/T", "/PID", &pid.to_string()])
        .creation_flags(0x08000000)
        .output();
}

#[cfg(not(target_os = "windows"))]
fn kill_process_tree(pid: u32) {
    let _ = Command::new("kill")
        .args(&["-9", &pid.to_string()])
        .output();
}

// 检查端口是否被占用
fn is_port_in_use(port: u16) -> bool {
    use std::net::{TcpListener, SocketAddr};
    use std::str::FromStr;
    
    let addresses = [
        format!("127.0.0.1:{}", port),
        format!("0.0.0.0:{}", port),
    ];
    
    for addr_str in &addresses {
        if let Ok(addr) = SocketAddr::from_str(addr_str) {
            if TcpListener::bind(addr).is_err() {
                return true;
            }
        }
    }
    
    false
}

// 移除ANSI转义序列
fn strip_ansi_codes(text: &str) -> String {
    let mut result = String::new();
    let mut chars = text.chars().peekable();
    
    while let Some(ch) = chars.next() {
        if ch == '\x1b' {
            if chars.peek() == Some(&'[') {
                chars.next();
                while let Some(&next_ch) = chars.peek() {
                    chars.next();
                    if next_ch.is_ascii_alphabetic() {
                        break;
                    }
                }
            }
        } else {
            result.push(ch);
        }
    }
    
    result
}
// 读取配置文件
#[tauri::command]
async fn read_config() -> Result<Config, String> {
    let config_path = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .join("WebRPAConfig.json");
    
    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;
    
    let config: Config = serde_json::from_str(&content)
        .map_err(|e| format!("解析配置文件失败: {}", e))?;
    
    Ok(config)
}

// 保存配置文件
#[tauri::command]
async fn save_config(config: Config) -> Result<(), String> {
    let current_dir = std::env::current_dir()
        .map_err(|e| e.to_string())?;

    let config_path = current_dir.join("WebRPAConfig.json");
    
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;
    
    std::fs::write(&config_path, &json)
        .map_err(|e| format!("保存配置文件失败: {}", e))?;

    // 同步写入前端 public 配置，确保 /WebRPAConfig.json 与启动器配置一致
    let frontend_public_config_path = current_dir
        .join("frontend")
        .join("public")
        .join("WebRPAConfig.json");

    if let Some(parent) = frontend_public_config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建前端配置目录失败: {}", e))?;
    }

    std::fs::write(&frontend_public_config_path, &json)
        .map_err(|e| format!("同步前端配置文件失败: {}", e))?;
    
    Ok(())
}

// 启动后端服务
#[tauri::command]
async fn start_backend(_window: Window, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let config = read_config().await?;
    if is_port_in_use(config.backend.port) {
        return Err(format!("后端服务已在运行（端口{}已被占用）", config.backend.port));
    }
    
    let root_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let python_exe = root_dir.join("Python313").join("python.exe");
    let backend_script = root_dir.join("backend").join("run.py");
    
    if !python_exe.exists() {
        return Err(format!("未找到Python可执行文件，路径: {}", python_exe.display()));
    }
    
    if !backend_script.exists() {
        return Err(format!("未找到后端启动脚本，路径: {}", backend_script.display()));
    }
    
    // 创建日志目录并重置日志文件
    let log_dir = root_dir.join("backend").join("logs");
    std::fs::create_dir_all(&log_dir)
        .map_err(|e| format!("创建日志目录失败: {}", e))?;
    
    let log_file = log_dir.join("backend.log");
    
    let init_log = format!("# WebRPA 后端日志 - 启动时间: {}\n[{}] Python路径: {}\n[{}] 后端脚本: {}\n[{}] 工作目录: {}\n[{}] 配置: host={}, port={}\n", 
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        python_exe.display(),
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        backend_script.display(),
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        root_dir.display(),
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        config.backend.host,
        config.backend.port
    );
    std::fs::write(&log_file, init_log)
        .map_err(|e| format!("重置日志文件失败: {}", e))?;
    
    #[cfg(target_os = "windows")]
    let mut child = {
        let mut cmd = Command::new(&python_exe);
        cmd.arg(&backend_script)
            .current_dir(&root_dir)
            .env("PYTHONIOENCODING", "utf-8")
            .env("PYTHONUNBUFFERED", "1")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .creation_flags(0x08000000);
        
        let cmd_log = format!("[{}] 执行命令: {} {}\n", 
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
            python_exe.display(),
            backend_script.display()
        );
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file)
            .and_then(|mut file| {
                use std::io::Write;
                file.write_all(cmd_log.as_bytes())
            });
        
        cmd.spawn()
            .map_err(|e| format!("启动后端失败: {} (Python路径: {})", e, python_exe.display()))?
    };
    
    #[cfg(not(target_os = "windows"))]
    let mut child = Command::new(&python_exe)
        .arg(&backend_script)
        .current_dir(&root_dir)
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUNBUFFERED", "1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动后端失败: {} (Python路径: {})", e, python_exe.display()))?;
    
    let pid = child.id();
    *state.backend_pid.lock().unwrap() = Some(pid);
    
    let pid_log = format!("[{}] 后端进程已启动，PID: {}\n", 
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        pid
    );
    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .and_then(|mut file| {
            use std::io::Write;
            file.write_all(pid_log.as_bytes())
        });
    
    // 处理stdout
    if let Some(stdout) = child.stdout.take() {
        let log_file_clone = log_file.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let clean_line = strip_ansi_codes(&line);
                    if !clean_line.trim().is_empty() {
                        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
                        let log_entry = format!("[{}] {}\n", timestamp, clean_line);
                        let _ = std::fs::OpenOptions::new()
                            .create(true)
                            .append(true)
                            .open(&log_file_clone)
                            .and_then(|mut file| {
                                use std::io::Write;
                                file.write_all(log_entry.as_bytes())
                            });
                    }
                }
            }
        });
    }
    
    // 处理stderr
    if let Some(stderr) = child.stderr.take() {
        let log_file_clone = log_file.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let clean_line = strip_ansi_codes(&line);
                    if !clean_line.trim().is_empty() {
                        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
                        let log_entry = format!("[{}] [ERROR] {}\n", timestamp, clean_line);
                        let _ = std::fs::OpenOptions::new()
                            .create(true)
                            .append(true)
                            .open(&log_file_clone)
                            .and_then(|mut file| {
                                use std::io::Write;
                                file.write_all(log_entry.as_bytes())
                            });
                    }
                }
            }
        });
    }
    
    *state.backend_process.lock().unwrap() = Some(child);
    Ok(())
}
// 启动前端服务
#[tauri::command]
async fn start_frontend(_window: Window, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let config = read_config().await?;
    if is_port_in_use(config.frontend.port) {
        return Err(format!("前端服务已在运行（端口{}已被占用）", config.frontend.port));
    }
    
    let root_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let frontend_dir = root_dir.join("frontend");
    
    if !frontend_dir.exists() {
        return Err(format!("未找到前端目录，路径: {}", frontend_dir.display()));
    }
    
    let log_dir = frontend_dir.join("logs");
    std::fs::create_dir_all(&log_dir)
        .map_err(|e| format!("创建日志目录失败: {}", e))?;
    
    let log_file = log_dir.join("frontend.log");
    std::fs::write(&log_file, format!("# WebRPA 前端日志 - 启动时间: {}\n", chrono::Local::now().format("%Y-%m-%d %H:%M:%S")))
        .map_err(|e| format!("重置日志文件失败: {}", e))?;
    
    let npm_cmd = root_dir.join("nodejs").join("npm.cmd");
    if !npm_cmd.exists() {
        return Err(format!("未找到npm.cmd可执行文件，路径: {}", npm_cmd.display()));
    }
    
    let package_json = frontend_dir.join("package.json");
    if !package_json.exists() {
        return Err(format!("未找到package.json文件，路径: {}", package_json.display()));
    }
    
    #[cfg(target_os = "windows")]
    let mut child = {
        // 极速启动模式：若开启且已有构建产物 dist，则用 vite preview 静态托管（秒级启动，无 HMR）；
        // 否则回退到 npm run dev（开发模式，有热更新但冷启动慢）
        let dist_index = frontend_dir.join("dist").join("index.html");
        let use_fast = config.frontend.fast_start && dist_index.exists();
        let port_str = config.frontend.port.to_string();
        let host_str = if config.frontend.host.trim().is_empty() { "0.0.0.0".to_string() } else { config.frontend.host.clone() };
        let mode_desc = if use_fast { "npm run preview (极速静态托管)" } else { "npm run dev (开发模式)" };

        let start_log = format!("[{}] 正在启动前端服务...\n[{}] npm路径: {}\n[{}] 工作目录: {}\n[{}] 执行命令: {}\n", 
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
            npm_cmd.display(),
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
            frontend_dir.display(),
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
            mode_desc
        );
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file)
            .and_then(|mut file| {
                use std::io::Write;
                file.write_all(start_log.as_bytes())
            });
        
        if !npm_cmd.is_file() {
            return Err(format!("npm.cmd文件不存在或不是文件: {}", npm_cmd.display()));
        }
        
        let args: Vec<&str> = if use_fast {
            vec!["run", "preview", "--", "--host", host_str.as_str(), "--port", port_str.as_str(), "--strictPort"]
        } else {
            vec!["run", "dev"]
        };
        let mut cmd = Command::new(&npm_cmd);
        cmd.args(&args)
            .current_dir(&frontend_dir)
            .env("NODE_OPTIONS", "--no-warnings")
            .env("FORCE_COLOR", "0")
            .env("NO_COLOR", "1")
            .env("PATH", format!("{};{}", root_dir.join("nodejs").display(), std::env::var("PATH").unwrap_or_default()))
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .creation_flags(0x08000000);
        
        cmd.spawn()
            .map_err(|e| format!("启动前端失败: {} (npm路径: {}, 工作目录: {})", e, npm_cmd.display(), frontend_dir.display()))?
    };
    
    #[cfg(not(target_os = "windows"))]
    let mut child = {
        let npm_cmd = root_dir.join("nodejs").join("npm");
        if !npm_cmd.exists() {
            return Err(format!("未找到npm可执行文件，路径: {}", npm_cmd.display()));
        }
        Command::new(&npm_cmd)
            .args(&["run", "dev"])
            .current_dir(&frontend_dir)
            .env("FORCE_COLOR", "0")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("启动前端失败: {} (npm路径: {}, 工作目录: {})", e, npm_cmd.display(), frontend_dir.display()))?
    };
    
    let pid = child.id();
    *state.frontend_pid.lock().unwrap() = Some(pid);
    
    let pid_log = format!("[{}] 前端进程已启动，PID: {}\n", 
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        pid
    );
    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .and_then(|mut file| {
            use std::io::Write;
            file.write_all(pid_log.as_bytes())
        });
    
    let log_file_clone = log_file.clone();
    let _frontend_process = state.frontend_process.clone();
    let _frontend_pid = state.frontend_pid.clone();
    
    thread::spawn(move || {
        if let Some(stdout) = child.stdout.take() {
            let log_file_stdout = log_file_clone.clone();
            let _stdout_thread = thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        let clean_line = strip_ansi_codes(&line);
                        if !clean_line.trim().is_empty() {
                            let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
                            let log_entry = format!("[{}] {}\n", timestamp, clean_line);
                            let _ = std::fs::OpenOptions::new()
                                .create(true)
                                .append(true)
                                .open(&log_file_stdout)
                                .and_then(|mut file| {
                                    use std::io::Write;
                                    file.write_all(log_entry.as_bytes())
                                });
                        }
                    }
                }
            });
        }
        
        if let Some(stderr) = child.stderr.take() {
            let log_file_stderr = log_file_clone.clone();
            let _stderr_thread = thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        let clean_line = strip_ansi_codes(&line);
                        if !clean_line.trim().is_empty() {
                            let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
                            let log_entry = format!("[{}] [ERROR] {}\n", timestamp, clean_line);
                            let _ = std::fs::OpenOptions::new()
                                .create(true)
                                .append(true)
                                .open(&log_file_stderr)
                                .and_then(|mut file| {
                                    use std::io::Write;
                                    file.write_all(log_entry.as_bytes())
                                });
                        }
                    }
                }
            });
        }
        
        match child.wait() {
            Ok(status) => {
                let exit_log = format!("[{}] 前端进程已退出，退出状态: {}\n", 
                    chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
                    status
                );
                let _ = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&log_file_clone)
                    .and_then(|mut file| {
                        use std::io::Write;
                        file.write_all(exit_log.as_bytes())
                    });
                
                *_frontend_process.lock().unwrap() = None;
                *_frontend_pid.lock().unwrap() = None;
            }
            Err(e) => {
                let error_log = format!("[{}] 等待前端进程失败: {}\n", 
                    chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
                    e
                );
                let _ = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&log_file_clone)
                    .and_then(|mut file| {
                        use std::io::Write;
                        file.write_all(error_log.as_bytes())
                    });
            }
        }
    });
    
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    
    if let Some(pid) = *state.frontend_pid.lock().unwrap() {
        #[cfg(target_os = "windows")]
        {
            let output = Command::new("tasklist")
                .args(&["/FI", &format!("PID eq {}", pid)])
                .creation_flags(0x08000000)
                .output();
            
            match output {
                Ok(output) => {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    if !output_str.contains(&pid.to_string()) {
                        return Err("前端进程启动后立即退出，请检查日志文件".to_string());
                    }
                }
                Err(_) => {}
            }
        }
        
        let success_log = format!("[{}] 前端服务启动成功，正在监听端口 {}\n", 
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
            config.frontend.port
        );
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file)
            .and_then(|mut file| {
                use std::io::Write;
                file.write_all(success_log.as_bytes())
            });
    }
    
    Ok(())
}
// 根据端口查找并杀死进程
#[cfg(target_os = "windows")]
fn kill_processes_by_port(port: u16) -> Result<(), String> {
    let output = std::process::Command::new("netstat")
        .args(&["-ano"])
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| format!("执行netstat失败: {}", e))?;
    
    let output_str = String::from_utf8_lossy(&output.stdout);
    
    let mut pids_to_kill = Vec::new();
    for line in output_str.lines() {
        if line.contains(&format!(":{}", port)) && line.contains("LISTENING") {
            if let Some(pid_str) = line.split_whitespace().last() {
                if let Ok(pid) = pid_str.parse::<u32>() {
                    if pid != 0 {
                        pids_to_kill.push(pid);
                    }
                }
            }
        }
    }
    
    for pid in pids_to_kill {
        let _ = std::process::Command::new("taskkill")
            .args(&["/F", "/T", "/PID", &pid.to_string()])
            .creation_flags(0x08000000)
            .output();
    }
    
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn kill_processes_by_port(port: u16) -> Result<(), String> {
    let output = std::process::Command::new("lsof")
        .args(&["-ti", &format!(":{}", port)])
        .output()
        .map_err(|e| format!("执行lsof失败: {}", e))?;
    
    let output_str = String::from_utf8_lossy(&output.stdout);
    
    for line in output_str.lines() {
        if let Ok(pid) = line.trim().parse::<u32>() {
            let _ = std::process::Command::new("kill")
                .args(&["-9", &pid.to_string()])
                .output();
        }
    }
    
    Ok(())
}

// 停止服务
#[tauri::command]
async fn stop_services(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let config = read_config().await?;
    
    if let Some(pid) = state.backend_pid.lock().unwrap().take() {
        kill_process_tree(pid);
    }
    if let Some(mut child) = state.backend_process.lock().unwrap().take() {
        let _ = child.kill();
    }
    
    if let Some(pid) = state.frontend_pid.lock().unwrap().take() {
        kill_process_tree(pid);
    }
    if let Some(mut child) = state.frontend_process.lock().unwrap().take() {
        let _ = child.kill();
    }
    
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    
    if is_port_in_use(config.backend.port) {
        kill_processes_by_port(config.backend.port)?;
    }
    
    if is_port_in_use(config.frontend.port) {
        kill_processes_by_port(config.frontend.port)?;
    }
    
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    
    Ok(())
}

// 读取本地版本号
fn get_local_version() -> Result<String, String> {
    let version_file = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .join("frontend")
        .join("src")
        .join("services")
        .join("version.ts");
    
    if !version_file.exists() {
        return Err("版本文件不存在".to_string());
    }
    
    let content = std::fs::read_to_string(&version_file)
        .map_err(|e| format!("读取版本文件失败: {}", e))?;
    
    for line in content.lines() {
        if line.contains("CURRENT_VERSION") && line.contains("=") {
            if let Some(start) = line.find('\'') {
                if let Some(end) = line.rfind('\'') {
                    if start < end {
                        return Ok(line[start + 1..end].to_string());
                    }
                }
            }
            if let Some(start) = line.find('"') {
                if let Some(end) = line.rfind('"') {
                    if start < end {
                        return Ok(line[start + 1..end].to_string());
                    }
                }
            }
        }
    }
    
    Err("无法从版本文件中提取版本号".to_string())
}

#[tauri::command]
async fn get_version() -> Result<String, String> {
    get_local_version()
}

#[tauri::command]
async fn check_service_status() -> Result<(bool, bool), String> {
    let config = read_config().await?;
    let backend_running = is_port_in_use(config.backend.port);
    let frontend_running = is_port_in_use(config.frontend.port);
    Ok((backend_running, frontend_running))
}

#[tauri::command]
async fn check_update(current_version: String) -> Result<VersionInfo, String> {
    let remote_url = "https://hub.pmhs.top/api/version";
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;
    
    let response = client.get(remote_url)
        .send()
        .await
        .map_err(|e| format!("获取远程版本信息失败: {}", e))?;
    
    let remote_info: RemoteVersionInfo = response.json()
        .await
        .map_err(|e| format!("解析远程版本信息失败: {}", e))?;
    
    let has_update = compare_versions(&current_version, &remote_info.version);
    
    let update_url = format!("https://github.com/pmh1314520/WebRPA/releases/tag/v{}", remote_info.version);
    
    Ok(VersionInfo {
        current_version,
        latest_version: remote_info.version,
        has_update,
        update_url,
        release_date: remote_info.release_date.unwrap_or_else(|| "未知".to_string()),
        changelog: remote_info.changelog.unwrap_or_else(|| "无更新说明".to_string()),
    })
}

fn compare_versions(local: &str, remote: &str) -> bool {
    let local_parts: Vec<u32> = local.split('.')
        .filter_map(|s| s.parse().ok())
        .collect();
    let remote_parts: Vec<u32> = remote.split('.')
        .filter_map(|s| s.parse().ok())
        .collect();
    
    for i in 0..local_parts.len().max(remote_parts.len()) {
        let local_part = local_parts.get(i).unwrap_or(&0);
        let remote_part = remote_parts.get(i).unwrap_or(&0);
        
        if remote_part > local_part {
            return true;
        } else if remote_part < local_part {
            return false;
        }
    }
    
    false
}
// 打开后端日志文件
// 解析 Windows 默认浏览器的可执行文件路径（尊重用户系统设置，不写死 Edge/Chrome）。
// 思路：读 https 的 UserChoice ProgId → 该 ProgId 的 shell\open\command → 提取 exe 路径。
#[cfg(target_os = "windows")]
fn resolve_default_browser_exe() -> Option<String> {
    fn reg_query(path: &str, value_arg: &[&str]) -> Option<String> {
        let mut args = vec!["query", path];
        args.extend_from_slice(value_arg);
        let output = std::process::Command::new("reg")
            .args(&args)
            .creation_flags(0x08000000)
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        Some(String::from_utf8_lossy(&output.stdout).to_string())
    }

    // 1) 读默认浏览器 ProgId（优先 https，回退 http）
    let progid = ["https", "http"].iter().find_map(|scheme| {
        let key = format!(
            "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\{}\\UserChoice",
            scheme
        );
        let out = reg_query(&key, &["/v", "ProgId"])?;
        // 行形如：    ProgId    REG_SZ    ChromeHTML
        out.lines().find_map(|line| {
            let l = line.trim();
            if l.starts_with("ProgId") {
                l.split_whitespace().last().map(|s| s.to_string())
            } else {
                None
            }
        })
    })?;

    // 2) 读该 ProgId 的打开命令
    let cmd_key = format!("HKCR\\{}\\shell\\open\\command", progid);
    let cmd_out = reg_query(&cmd_key, &["/ve"])?;
    // 取出默认值那一行的命令串（REG_SZ 之后的内容）
    let raw = cmd_out.lines().find_map(|line| {
        let l = line.trim();
        if l.contains("REG_SZ") {
            l.split("REG_SZ").nth(1).map(|s| s.trim().to_string())
        } else {
            None
        }
    })?;

    // 3) 从命令串中提取 exe 路径
    let exe = if raw.starts_with('"') {
        // "C:\...\app.exe" -- "%1"
        raw[1..].split('"').next().map(|s| s.to_string())
    } else {
        // C:\...\app.exe %1
        raw.split_whitespace().next().map(|s| s.to_string())
    }?;

    if exe.to_lowercase().ends_with(".exe") && std::path::Path::new(&exe).exists() {
        Some(exe)
    } else {
        None
    }
}

// 用系统默认浏览器打开指定的 file:// URL（日志文件可能很大，用浏览器而非记事本）。
// .log/.txt 的文件关联默认是记事本，所以不能用 `start`，必须显式调用默认浏览器 exe。
#[cfg(target_os = "windows")]
fn open_url_in_default_browser(file_url: &str) -> Result<(), String> {
    if let Some(browser) = resolve_default_browser_exe() {
        std::process::Command::new(&browser)
            .arg(file_url)
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("用默认浏览器打开失败: {}", e))?;
        return Ok(());
    }
    // 回退：交给系统 shell 处理（极少数无法解析默认浏览器的环境）
    std::process::Command::new("cmd")
        .args(&["/c", "start", "", file_url])
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|e| format!("打开日志文件失败: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn open_backend_log() -> Result<(), String> {
    let log_path = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .join("backend")
        .join("logs")
        .join("backend.log");
    
    // 如果日志文件不存在，创建一个空的日志文件
    if !log_path.exists() {
        std::fs::create_dir_all(log_path.parent().unwrap())
            .map_err(|e| format!("创建日志目录失败: {}", e))?;
        std::fs::write(&log_path, "# WebRPA 后端日志\n# 日志文件将在服务启动后自动更新\n")
            .map_err(|e| format!("创建日志文件失败: {}", e))?;
    }
    
    // 使用file://协议在默认浏览器中打开日志文件
    let file_url = format!("file:///{}", log_path.to_string_lossy().replace("\\", "/"));
    
    #[cfg(target_os = "windows")]
    {
        // 用系统默认浏览器打开（.log 默认关联记事本，必须显式调用默认浏览器 exe）
        open_url_in_default_browser(&file_url)?;
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&file_url)
            .spawn()
            .map_err(|e| format!("打开日志文件失败: {}", e))?;
    }
    
    Ok(())
}

// 打开前端日志文件
#[tauri::command]
async fn open_frontend_log() -> Result<(), String> {
    let log_path = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .join("frontend")
        .join("logs")
        .join("frontend.log");
    
    // 如果日志文件不存在，创建一个空的日志文件
    if !log_path.exists() {
        std::fs::create_dir_all(log_path.parent().unwrap())
            .map_err(|e| format!("创建日志目录失败: {}", e))?;
        std::fs::write(&log_path, "# WebRPA 前端日志\n# 日志文件将在服务启动后自动更新\n")
            .map_err(|e| format!("创建日志文件失败: {}", e))?;
    }
    
    // 使用file://协议在默认浏览器中打开日志文件
    let file_url = format!("file:///{}", log_path.to_string_lossy().replace("\\", "/"));
    
    #[cfg(target_os = "windows")]
    {
        // 用系统默认浏览器打开（.log 默认关联记事本，必须显式调用默认浏览器 exe）
        open_url_in_default_browser(&file_url)?;
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&file_url)
            .spawn()
            .map_err(|e| format!("打开日志文件失败: {}", e))?;
    }
    
    Ok(())
}

// 打开浏览器
#[tauri::command]
async fn open_browser(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/c", "start", &url])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| format!("打开浏览器失败: {}", e))?;
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("打开浏览器失败: {}", e))?;
    }
    
    Ok(())
}

// 统一停止前后端服务（窗口关闭、托盘退出共用）
fn shutdown_services(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<AppState>() {
        if let Some(pid) = state.backend_pid.lock().unwrap().take() {
            kill_process_tree(pid);
        }
        if let Some(mut child) = state.backend_process.lock().unwrap().take() {
            let _ = child.kill();
        }
        if let Some(pid) = state.frontend_pid.lock().unwrap().take() {
            kill_process_tree(pid);
        }
        if let Some(mut child) = state.frontend_process.lock().unwrap().take() {
            let _ = child.kill();
        }
    }
}

// 设置开机自启动（开 / 关）
#[tauri::command]
async fn set_autostart(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    if enable {
        manager.enable().map_err(|e| format!("开启开机自启动失败: {}", e))?;
    } else {
        manager.disable().map_err(|e| format!("关闭开机自启动失败: {}", e))?;
    }
    Ok(())
}

// 查询当前是否已设置开机自启动
#[tauri::command]
async fn get_autostart(app: tauri::AppHandle) -> Result<bool, String> {
    app.autolaunch()
        .is_enabled()
        .map_err(|e| format!("查询开机自启动状态失败: {}", e))
}

// 记录 Agent 窗口当前加载的语言（用于"语言变化才重载、否则保留会话"）
fn agent_lang_cell() -> &'static std::sync::Mutex<String> {
    static CELL: std::sync::OnceLock<std::sync::Mutex<String>> = std::sync::OnceLock::new();
    CELL.get_or_init(|| std::sync::Mutex::new(String::new()))
}

// 构造 Agent 窗口 URL（含 view/lang/backend_port），返回 (url, 规范化后的lang)
async fn build_agent_url(lang: Option<&str>) -> Result<(String, String), String> {
    let config = read_config().await?;
    let lang_q = match lang { Some("en") => "en", _ => "zh" };
    let url = format!(
        "http://localhost:{}/?view=assistant&lang={}&backend_port={}",
        config.frontend.port, lang_q, config.backend.port
    );
    Ok((url, lang_q.to_string()))
}

// 打开小助手「独立原生窗口（系统级 Agent）」：竖屏、无边框、置顶，可贴边自动隐藏
#[tauri::command]
async fn open_assistant_agent_window(app: tauri::AppHandle, lang: Option<String>) -> Result<(), String> {
    let (url_str, lang_q) = build_agent_url(lang.as_deref()).await?;
    // 已存在：语言变了就 navigate 重载（跟随启动器），语言没变则保留当前会话只置前
    if let Some(w) = app.get_webview_window("assistant") {
        let changed = {
            let mut g = agent_lang_cell().lock().unwrap();
            if *g != lang_q { *g = lang_q.clone(); true } else { false }
        };
        if changed {
            if let Ok(parsed) = url::Url::parse(&url_str) {
                let _ = w.navigate(parsed);
            }
        }
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
        return Ok(());
    }
    let parsed = url::Url::parse(&url_str).map_err(|e| format!("URL 解析失败: {}", e))?;
    let win = tauri::WebviewWindowBuilder::new(&app, "assistant", tauri::WebviewUrl::External(parsed))
        .title("WebRPA Agent")
        .inner_size(380.0, 720.0)
        .min_inner_size(340.0, 520.0)
        .decorations(false)
        .resizable(true)
        .maximizable(false) // 禁用最大化 → 同时禁用 Windows 拖到边缘自动半屏(Aero Snap)
        .always_on_top(true)
        .skip_taskbar(false)
        .build()
        .map_err(|e| format!("创建小助手窗口失败: {}", e))?;
    *agent_lang_cell().lock().unwrap() = lang_q;
    if let Some(icon) = app.default_window_icon() {
        let _ = win.set_icon(icon.clone());
    }
    Ok(())
}

// 仅当 Agent 窗口已打开时，同步其语言（启动器切换语言时调用；窗口没开则什么都不做，不会弹出窗口）
#[tauri::command]
async fn sync_assistant_agent_lang(app: tauri::AppHandle, lang: Option<String>) -> Result<(), String> {
    if app.get_webview_window("assistant").is_none() {
        return Ok(());
    }
    let (url_str, lang_q) = build_agent_url(lang.as_deref()).await?;
    let changed = {
        let mut g = agent_lang_cell().lock().unwrap();
        if *g != lang_q { *g = lang_q.clone(); true } else { false }
    };
    if changed {
        if let Some(w) = app.get_webview_window("assistant") {
            if let Ok(parsed) = url::Url::parse(&url_str) {
                let _ = w.navigate(parsed);
            }
        }
    }
    Ok(())
}

// ---- Windows 全局光标位置（用于 Agent 窗口贴边自动隐藏/唤出）----
#[cfg(target_os = "windows")]
#[repr(C)]
struct PointApi { x: i32, y: i32 }

#[cfg(target_os = "windows")]
extern "system" {
    fn GetCursorPos(lp_point: *mut PointApi) -> i32;
}

#[cfg(target_os = "windows")]
fn global_cursor_pos() -> Option<(i32, i32)> {
    unsafe {
        let mut p = PointApi { x: 0, y: 0 };
        if GetCursorPos(&mut p) != 0 { Some((p.x, p.y)) } else { None }
    }
}

#[cfg(not(target_os = "windows"))]
fn global_cursor_pos() -> Option<(i32, i32)> { None }

// QQ 式贴边自动隐藏：窗口拖到屏幕边缘后，鼠标离开自动滑出屏幕只留极窄边；鼠标回到该边缘再滑回。
// 用全局光标轮询实现，避免依赖前端极窄条带捕获鼠标（不可靠）。
fn spawn_agent_autohide(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let mut docked: i32 = 0; // 0无 1左 2右 3上
        let mut hidden = false;
        let mut leave_at: Option<std::time::Instant> = None;
        // 缓存贴边时的显示器几何（隐藏后窗口移出屏幕，current_monitor 可能失效）
        let (mut dmx, mut dmy, mut dmw) = (0i32, 0i32, 0i32);
        let peek = 3i32;
        loop {
            std::thread::sleep(std::time::Duration::from_millis(120));
            let win = match app.get_webview_window("assistant") {
                Some(w) => w,
                None => {
                    // 窗口未打开（或已关闭）：重置贴边状态，继续轮询等待下次打开，线程常驻不退出
                    docked = 0;
                    hidden = false;
                    leave_at = None;
                    std::thread::sleep(std::time::Duration::from_millis(400));
                    continue;
                }
            };
            if win.is_minimized().unwrap_or(false) { continue; }
            let outer = match win.outer_position() { Ok(p) => p, Err(_) => continue };
            let size = match win.outer_size() { Ok(s) => s, Err(_) => continue };
            let (wx, wy, ww, wh) = (outer.x, outer.y, size.width as i32, size.height as i32);
            let cur = global_cursor_pos();

            if !hidden {
                // 取当前显示器几何：current_monitor() 对无边框置顶窗口偶发返回 None，
                // 那样 docked 永远是 0、永不收起。这里加兜底：用窗口中心点在所有显示器里找，
                // 再退到主显示器，确保几何一定拿得到。
                let mon_opt = win.current_monitor().ok().flatten()
                    .or_else(|| {
                        let (cx, cy) = (wx + ww / 2, wy + wh / 2);
                        win.available_monitors().ok().and_then(|list| {
                            list.into_iter().find(|m| {
                                let p = m.position(); let s = m.size();
                                cx >= p.x && cx < p.x + s.width as i32
                                    && cy >= p.y && cy < p.y + s.height as i32
                            })
                        })
                    })
                    .or_else(|| win.primary_monitor().ok().flatten());
                if let Some(mon) = mon_opt {
                    let mp = mon.position();
                    let ms = mon.size();
                    let (mx, my, mw) = (mp.x, mp.y, ms.width as i32);
                    let th = 20i32;
                    // 左 / 右 / 上 三个屏幕边缘都可贴边自动隐藏
                    let new_dock = if wx <= mx + th { 1 }
                        else if wx + ww >= mx + mw - th { 2 }
                        else if wy <= my + th { 3 }
                        else { 0 };
                    docked = new_dock;
                    if docked != 0 { dmx = mx; dmy = my; dmw = mw; }
                }
            }
            if docked == 0 { leave_at = None; continue; }

            let inside = match cur {
                Some((cx, cy)) => cx >= wx && cx <= wx + ww && cy >= wy && cy <= wy + wh,
                None => false,
            };
            let near_edge = match cur {
                Some((cx, cy)) => match docked {
                    1 => cx <= dmx + 3 && cy >= wy && cy <= wy + wh,
                    2 => cx >= dmx + dmw - 3 && cy >= wy && cy <= wy + wh,
                    3 => cy <= dmy + 3 && cx >= wx && cx <= wx + ww,
                    _ => false,
                },
                None => false,
            };

            if !hidden {
                if !inside {
                    match leave_at {
                        None => leave_at = Some(std::time::Instant::now()),
                        Some(t) => {
                            if t.elapsed() > std::time::Duration::from_millis(650) {
                                let (tx, ty) = match docked {
                                    1 => (dmx - (ww - peek), wy),
                                    2 => (dmx + dmw - peek, wy),
                                    3 => (wx, dmy - (wh - peek)),
                                    _ => (wx, wy),
                                };
                                animate_move(&win, wx, wy, tx, ty);
                                hidden = true;
                                leave_at = None;
                            }
                        }
                    }
                } else {
                    leave_at = None;
                }
            } else if near_edge {
                let (tx, ty) = match docked {
                    1 => (dmx, wy),
                    2 => (dmx + dmw - ww, wy),
                    3 => (wx, dmy),
                    _ => (wx, wy),
                };
                animate_move(&win, wx, wy, tx, ty);
                let _ = win.set_focus();
                hidden = false;
                leave_at = None;
            }
        }
    });
}

fn animate_move(win: &tauri::WebviewWindow, fx: i32, fy: i32, tx: i32, ty: i32) {
    use tauri::PhysicalPosition;
    let steps = 6;
    for i in 1..=steps {
        let x = fx + (tx - fx) * i / steps;
        let y = fy + (ty - fy) * i / steps;
        let _ = win.set_position(PhysicalPosition::new(x, y));
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
    let _ = win.set_position(PhysicalPosition::new(tx, ty));
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(AppState {
            backend_process: Arc::new(Mutex::new(None)),
            frontend_process: Arc::new(Mutex::new(None)),
            backend_pid: Arc::new(Mutex::new(None)),
            frontend_pid: Arc::new(Mutex::new(None)),
        })
        .setup(|app| {
            // 主动设置主窗口图标，解决 decorations:false 时任务栏显示默认图标的问题
            if let Some(window) = app.get_webview_window("main") {
                // 用 default_window_icon (从 tauri.conf.json 的 icon 列表里编译进来的)
                if let Some(icon) = app.default_window_icon() {
                    let _ = window.set_icon(icon.clone());
                }
            }

            // 常驻启动 Agent 窗口贴边自动隐藏线程（窗口没开时空转等待，开了就接管，确保始终生效）
            spawn_agent_autohide(app.handle().clone());

            // 系统托盘：最小化时隐藏到托盘，点击托盘图标或菜单可恢复
            let show_item = MenuItem::with_id(app, "tray_show", "显示主窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "tray_quit", "退出 WebRPA 启动器", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::new()
                .tooltip("WebRPA 启动器")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "tray_show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "tray_quit" => {
                        shutdown_services(app);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder.build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_config,
            save_config,
            start_backend,
            start_frontend,
            stop_services,
            check_update,
            check_service_status,
            open_browser,
            get_version,
            open_backend_log,
            open_frontend_log,
            set_autostart,
            get_autostart,
            open_assistant_agent_window,
            sync_assistant_agent_lang
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // 仅当主窗口关闭时才停止所有服务；关闭小助手 Agent 窗口不应影响前后端服务
                if window.label() == "main" {
                    shutdown_services(window.app_handle());
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}