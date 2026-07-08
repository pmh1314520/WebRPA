"""手势识别服务 - 基于MediaPipe的自定义手势识别"""
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import json
import os
from pathlib import Path
import threading
import time
from typing import Optional, Dict, List, Tuple, Callable


class GestureRecognitionService:
    """手势识别服务"""
    
    def __init__(self):
        self.is_running = False
        self.recognition_thread: Optional[threading.Thread] = None
        self.custom_gestures: Dict[str, List[List[float]]] = {}  # {gesture_name: [landmarks]}
        self.gesture_callback: Optional[Callable[[str], None]] = None
        self.camera_index = 0
        self.debug_window = False
        self.cap: Optional[cv2.VideoCapture] = None
        
        # 初始化MediaPipe Hand Landmarker
        # 获取backend/data/mediapipe_models目录
        current_file = Path(__file__).resolve()  # backend/app/services/gesture_recognition_service.py
        app_dir = current_file.parent.parent  # backend/app
        backend_dir = app_dir.parent  # backend
        model_path = backend_dir / "data" / "mediapipe_models" / "hand_landmarker.task"
        
        if not model_path.exists():
            raise FileNotFoundError(f"Hand landmarker model not found at {model_path}")
        
        base_options = python.BaseOptions(model_asset_path=str(model_path))
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=1,  # 只检测一只手
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.hand_landmarker = vision.HandLandmarker.create_from_options(options)
        
        # 加载自定义手势
        self.load_custom_gestures()
        print("[GestureRecognitionService] 服务已初始化")
    
    def load_custom_gestures(self) -> Dict[str, List[List[float]]]:
        """加载自定义手势数据"""
        current_file = Path(__file__).resolve()
        app_dir = current_file.parent.parent
        backend_dir = app_dir.parent
        gestures_file = backend_dir / "data" / "custom_gestures.json"
        
        if gestures_file.exists():
            try:
                with open(gestures_file, 'r', encoding='utf-8') as f:
                    self.custom_gestures = json.load(f)
                print(f"[GestureRecognition] 已加载 {len(self.custom_gestures)} 个自定义手势")
            except Exception as e:
                print(f"[GestureRecognition] 加载自定义手势失败: {e}")
                self.custom_gestures = {}
        else:
            self.custom_gestures = {}
        return self.custom_gestures
    
    def save_custom_gestures(self):
        """保存自定义手势数据"""
        current_file = Path(__file__).resolve()
        app_dir = current_file.parent.parent
        backend_dir = app_dir.parent
        gestures_file = backend_dir / "data" / "custom_gestures.json"
        gestures_file.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(gestures_file, 'w', encoding='utf-8') as f:
                json.dump(self.custom_gestures, f, ensure_ascii=False, indent=2)
            print(f"[GestureRecognition] 已保存 {len(self.custom_gestures)} 个自定义手势")
        except Exception as e:
            print(f"[GestureRecognition] 保存自定义手势失败: {e}")
    
    def normalize_landmarks(self, landmarks: List) -> List[List[float]]:
        """归一化手部关键点坐标（相对于手腕位置）"""
        if not landmarks or len(landmarks) == 0:
            return []
        
        # 提取所有关键点的坐标
        points = [[lm.x, lm.y, lm.z] for lm in landmarks]
        
        # 以手腕（第0个点）为原点进行归一化
        wrist = np.array(points[0])
        normalized = []
        for point in points:
            normalized.append([
                point[0] - wrist[0],
                point[1] - wrist[1],
                point[2] - wrist[2]
            ])
        
        return normalized
    
    def calculate_gesture_similarity(self, landmarks1: List[List[float]], landmarks2: List[List[float]]) -> float:
        """计算两个手势的相似度（0-1之间，1表示完全相同）"""
        if len(landmarks1) != len(landmarks2):
            return 0.0
        
        # 计算欧氏距离
        total_distance = 0.0
        for p1, p2 in zip(landmarks1, landmarks2):
            distance = np.sqrt(sum((a - b) ** 2 for a, b in zip(p1, p2)))
            total_distance += distance
        
        # 归一化距离（平均每个关键点的距离）
        avg_distance = total_distance / len(landmarks1)
        
        # 转换为相似度（距离越小，相似度越高）
        # 使用指数衰减函数，距离为0时相似度为1，距离增大时相似度快速下降
        similarity = np.exp(-avg_distance * 10)  # 10是调节参数，可以调整敏感度
        
        return similarity
    
    def match_gesture(self, current_landmarks: List[List[float]]) -> Optional[str]:
        """匹配当前手势与已保存的自定义手势"""
        if not current_landmarks:
            return None
        
        best_match = None
        best_similarity = 0.0
        # 相似度阈值（默认 0.60，可由手势触发器的 confidenceThreshold 覆盖）
        threshold = getattr(self, 'match_threshold', 0.60)
        
        for gesture_name, saved_landmarks in self.custom_gestures.items():
            similarity = self.calculate_gesture_similarity(current_landmarks, saved_landmarks)
            if similarity > best_similarity and similarity >= threshold:
                best_similarity = similarity
                best_match = gesture_name
        
        if best_match:
            print(f"[GestureRecognition] 匹配到手势: {best_match} (相似度: {best_similarity:.2f})")
        
        return best_match

    
    def record_gesture(self, gesture_name: str, camera_index: int = 0) -> bool:
        """录制自定义手势"""
        print(f"[GestureRecognition] 开始录制手势: {gesture_name}")
        
        cap = cv2.VideoCapture(camera_index)
        if not cap.isOpened():
            print(f"[GestureRecognition] 无法打开摄像头 {camera_index}")
            return False
        
        # 设置摄像头分辨率
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        recorded_landmarks = None
        window_name = "Gesture Recording - Press SPACE to confirm, ESC to cancel"
        
        try:
            cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
            cv2.setWindowProperty(window_name, cv2.WND_PROP_TOPMOST, 1)
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("[GestureRecognition] 无法读取摄像头画面")
                    break
                
                # 水平翻转画面（镜像效果）
                frame = cv2.flip(frame, 1)
                
                # 转换为RGB（MediaPipe需要RGB格式）
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                
                # 检测手部关键点
                detection_result = self.hand_landmarker.detect(mp_image)
                
                # 绘制关键点和连接线
                if detection_result.hand_landmarks:
                    for hand_landmarks in detection_result.hand_landmarks:
                        # 绘制关键点
                        for landmark in hand_landmarks:
                            x = int(landmark.x * frame.shape[1])
                            y = int(landmark.y * frame.shape[0])
                            cv2.circle(frame, (x, y), 5, (0, 255, 0), -1)
                        
                        # 绘制连接线
                        connections = [
                            (0, 1), (1, 2), (2, 3), (3, 4),  # 大拇指
                            (0, 5), (5, 6), (6, 7), (7, 8),  # 食指
                            (0, 9), (9, 10), (10, 11), (11, 12),  # 中指
                            (0, 13), (13, 14), (14, 15), (15, 16),  # 无名指
                            (0, 17), (17, 18), (18, 19), (19, 20),  # 小指
                            (5, 9), (9, 13), (13, 17)  # 手掌连接
                        ]
                        for connection in connections:
                            start_idx, end_idx = connection
                            start = hand_landmarks[start_idx]
                            end = hand_landmarks[end_idx]
                            start_point = (int(start.x * frame.shape[1]), int(start.y * frame.shape[0]))
                            end_point = (int(end.x * frame.shape[1]), int(end.y * frame.shape[0]))
                            cv2.line(frame, start_point, end_point, (255, 0, 0), 2)
                        
                        # 保存当前检测到的关键点（用于录制）
                        recorded_landmarks = self.normalize_landmarks(hand_landmarks)
                    
                    # 显示提示文本（检测到手势）
                    cv2.putText(frame, "Hand detected! Press SPACE to save", (10, 30),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                else:
                    # 显示提示文本（未检测到手势）
                    cv2.putText(frame, "No hand detected. Show your hand gesture.", (10, 30),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                
                # 显示录制信息
                cv2.putText(frame, f"Recording: {gesture_name}", (10, 60),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                cv2.putText(frame, "SPACE: Confirm | ESC: Cancel", (10, frame.shape[0] - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                
                cv2.imshow(window_name, frame)
                
                # 等待按键
                key = cv2.waitKey(1) & 0xFF
                if key == 32:  # 空格键
                    if recorded_landmarks:
                        self.custom_gestures[gesture_name] = recorded_landmarks
                        self.save_custom_gestures()
                        print(f"[GestureRecognition] 手势 '{gesture_name}' 录制成功")
                        break
                    else:
                        print("[GestureRecognition] 未检测到手势，请重试")
                elif key == 27:  # ESC键
                    print("[GestureRecognition] 录制已取消")
                    recorded_landmarks = None
                    break
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
        
        return recorded_landmarks is not None
    
    def delete_gesture(self, gesture_name: str) -> bool:
        """删除自定义手势"""
        if gesture_name in self.custom_gestures:
            del self.custom_gestures[gesture_name]
            self.save_custom_gestures()
            print(f"[GestureRecognition] 已删除手势: {gesture_name}")
            return True
        return False

    
    def start_recognition(self, camera_index: int = 0, debug_window: bool = False, callback: Optional[Callable[[str], None]] = None) -> bool:
        """启动手势识别"""
        if self.is_running:
            print("[GestureRecognition] 手势识别已在运行中")
            return False
        
        if not self.custom_gestures:
            print("[GestureRecognition] 没有可用的自定义手势，请先录制手势")
            return False
        
        self.camera_index = camera_index
        self.debug_window = debug_window
        self.gesture_callback = callback
        self.is_running = True
        
        # 在新线程中运行识别
        self.recognition_thread = threading.Thread(target=self._recognition_loop, daemon=True)
        self.recognition_thread.start()
        
        print(f"[GestureRecognition] 手势识别已启动 (摄像头: {camera_index}, 调试窗口: {debug_window})")
        return True
    
    def _recognition_loop(self):
        """手势识别主循环（在独立线程中运行）"""
        self.cap = cv2.VideoCapture(self.camera_index)
        if not self.cap.isOpened():
            print(f"[GestureRecognition] 无法打开摄像头 {self.camera_index}")
            self.is_running = False
            return
        
        # 设置摄像头分辨率
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        window_name = "Gesture Recognition (Press ESC to stop)"
        if self.debug_window:
            cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
            cv2.setWindowProperty(window_name, cv2.WND_PROP_TOPMOST, 1)
        
        last_matched_gesture = None
        last_match_time = 0
        cooldown = 2.0  # 同一手势的冷却时间（秒）
        
        try:
            while self.is_running:
                ret, frame = self.cap.read()
                if not ret:
                    print("[GestureRecognition] 无法读取摄像头画面")
                    break
                
                # 水平翻转画面（镜像效果）
                frame = cv2.flip(frame, 1)
                
                # 转换为RGB（MediaPipe需要RGB格式）
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                
                # 检测手部关键点
                detection_result = self.hand_landmarker.detect(mp_image)
                
                matched_gesture = None
                if detection_result.hand_landmarks:
                    for hand_landmarks in detection_result.hand_landmarks:
                        # 归一化关键点
                        normalized_landmarks = self.normalize_landmarks(hand_landmarks)
                        
                        # 匹配手势
                        matched_gesture = self.match_gesture(normalized_landmarks)
                        
                        # 如果匹配到手势且不在冷却期内，触发回调
                        current_time = time.time()
                        if matched_gesture and (matched_gesture != last_matched_gesture or current_time - last_match_time > cooldown):
                            print(f"[GestureRecognition] 触发手势: {matched_gesture}")
                            if self.gesture_callback:
                                try:
                                    self.gesture_callback(matched_gesture)
                                except Exception as e:
                                    print(f"[GestureRecognition] 回调函数执行失败: {e}")
                            last_matched_gesture = matched_gesture
                            last_match_time = current_time
                        
                        # 绘制调试信息
                        if self.debug_window:
                            # 绘制关键点
                            for landmark in hand_landmarks:
                                x = int(landmark.x * frame.shape[1])
                                y = int(landmark.y * frame.shape[0])
                                cv2.circle(frame, (x, y), 5, (0, 255, 0), -1)
                            
                            # 绘制连接线
                            connections = [
                                (0, 1), (1, 2), (2, 3), (3, 4),
                                (0, 5), (5, 6), (6, 7), (7, 8),
                                (0, 9), (9, 10), (10, 11), (11, 12),
                                (0, 13), (13, 14), (14, 15), (15, 16),
                                (0, 17), (17, 18), (18, 19), (19, 20),
                                (5, 9), (9, 13), (13, 17)
                            ]
                            for connection in connections:
                                start_idx, end_idx = connection
                                start = hand_landmarks[start_idx]
                                end = hand_landmarks[end_idx]
                                start_point = (int(start.x * frame.shape[1]), int(start.y * frame.shape[0]))
                                end_point = (int(end.x * frame.shape[1]), int(end.y * frame.shape[0]))
                                cv2.line(frame, start_point, end_point, (255, 0, 0), 2)
                
                # 显示调试窗口
                if self.debug_window:
                    # 显示状态信息
                    if matched_gesture:
                        cv2.putText(frame, f"Matched: {matched_gesture}", (10, 30),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    else:
                        cv2.putText(frame, "No gesture matched", (10, 30),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                    
                    cv2.putText(frame, "Press ESC to stop", (10, frame.shape[0] - 10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                    
                    cv2.imshow(window_name, frame)
                    
                    # 检查ESC键
                    if cv2.waitKey(1) & 0xFF == 27:
                        print("[GestureRecognition] 用户停止识别")
                        break
                else:
                    # 不显示窗口时也要有短暂延迟，避免CPU占用过高
                    time.sleep(0.03)  # 约30fps
        
        finally:
            if self.cap:
                self.cap.release()
                self.cap = None
            if self.debug_window:
                cv2.destroyAllWindows()
            self.is_running = False
            print("[GestureRecognition] 手势识别已停止")
    
    def stop_recognition(self) -> bool:
        """停止手势识别"""
        if not self.is_running:
            print("[GestureRecognition] 手势识别未在运行")
            return False
        
        self.is_running = False
        if self.recognition_thread:
            self.recognition_thread.join(timeout=2.0)
        
        print("[GestureRecognition] 手势识别已停止")
        return True
    
    def get_status(self) -> Dict:
        """获取识别状态"""
        return {
            "is_running": self.is_running,
            "camera_index": self.camera_index,
            "debug_window": self.debug_window,
            "gesture_count": len(self.custom_gestures)
        }


# 全局单例
gesture_service = GestureRecognitionService()
