"""工作流解析器 - 将工作流JSON解析为可执行结构"""
from typing import Optional
from collections import defaultdict

from app.models.workflow import Workflow, WorkflowNode, WorkflowEdge


class ExecutionGraph:
    """执行图 - 表示节点的执行顺序"""
    
    def __init__(self):
        self.nodes: dict[str, WorkflowNode] = {}
        self.edges: list[WorkflowEdge] = []
        self.adjacency: dict[str, list[str]] = defaultdict(list)  # node_id -> [next_node_ids]
        self.reverse_adjacency: dict[str, list[str]] = defaultdict(list)  # node_id -> [prev_node_ids]
        self.start_nodes: list[str] = []  # 没有入边的节点
        # condition_branches: source -> {handle: [target_ids]} 支持一对多
        self.condition_branches: dict[str, dict[str, list[str]]] = {}
        self.loop_branches: dict[str, dict[str, list[str]]] = {}  # loop_node_id -> {handle: [target_node_ids]}
        self.error_branches: dict[str, list[str]] = {}  # node_id -> [error_handler_node_ids]
        # 错误边的反向映射：error 目标节点 -> {来源节点}。
        # 用于"多前驱汇合等待"时排除错误边来源——错误边是异常路径，
        # 若把它当普通前驱，"出错回流到上层"形成的环会让上层节点永远等待下游而死锁。
        self.error_pred: dict[str, set[str]] = defaultdict(set)
    
    def get_node(self, node_id: str) -> Optional[WorkflowNode]:
        return self.nodes.get(node_id)
    
    def get_next_nodes(self, node_id: str, handle: Optional[str] = None) -> list[str]:
        """获取下一个要执行的节点ID列表"""
        if handle and node_id in self.condition_branches:
            # 条件分支（支持一个 handle 接多个下游）
            return list(self.condition_branches[node_id].get(handle, []))
        if handle and node_id in self.loop_branches:
            # 循环分支
            return list(self.loop_branches[node_id].get(handle, []))
        return list(self.adjacency.get(node_id, []))
    
    def get_loop_body_nodes(self, node_id: str) -> list[str]:
        """获取循环体节点（loop handle）"""
        if node_id in self.loop_branches:
            return self.loop_branches[node_id].get('loop', [])
        return []
    
    def get_loop_done_nodes(self, node_id: str) -> list[str]:
        """获取循环结束后的节点（done handle）"""
        if node_id in self.loop_branches:
            return self.loop_branches[node_id].get('done', [])
        return []
    
    def get_error_nodes(self, node_id: str) -> list[str]:
        """获取异常处理节点（error handle）"""
        return self.error_branches.get(node_id, [])
    
    def get_prev_nodes(self, node_id: str) -> list[str]:
        """获取前置节点ID列表"""
        return self.reverse_adjacency.get(node_id, [])

    def _forward_reachable(self, node_id: str) -> set:
        """从 node_id 出发、沿正常控制流（普通边 + 条件分支 + 循环分支）能正向到达的节点集合。
        用于识别"回边前驱"：若某前驱 p 在此集合内，则 p→node_id 是环上的回边。"""
        seen: set = set()
        stack = [node_id]
        while stack:
            cur = stack.pop()
            succ = list(self.adjacency.get(cur, []))
            for tgts in self.condition_branches.get(cur, {}).values():
                succ.extend(tgts)
            for tgts in self.loop_branches.get(cur, {}).values():
                succ.extend(tgts)
            for n in succ:
                if n not in seen:
                    seen.add(n)
                    stack.append(n)
        return seen

    def get_join_prev_nodes(self, node_id: str) -> list[str]:
        """获取用于"多前驱汇合等待"的前置节点：排除错误边来源 + 排除"回边"前驱。

        - 错误边（出错回流到上层）是异常路径，不应让节点等待其下游错误处理节点先完成，
          否则"出错→回到上层重试"形成的环会导致上层节点永久等待而死锁。
        - 回边前驱：若某前驱 p 能从本节点正向到达（本节点→…→p→本节点 构成环），
          则 p→本节点 属于循环回边（如：循环体末端回连到循环节点）。这类回边只有在
          本节点先运行、进入循环体后才可能完成，绝不能纳入"进入前的多前驱汇合等待"，
          否则会形成"循环等回边、回边等循环"的死锁——典型表现为：在循环前串接一个模块
          后从该模块开始运行，就再也进不了循环。
        """
        prev = list(self.reverse_adjacency.get(node_id, []))
        errs = self.error_pred.get(node_id)
        if errs:
            prev = [p for p in prev if p not in errs]
        if len(prev) <= 1:
            return prev
        # 排除回边前驱（能从本节点正向到达的前驱）
        reachable = self._forward_reachable(node_id)
        filtered = [p for p in prev if p not in reachable]
        return filtered
    
    def get_start_nodes(self) -> list[str]:
        """获取起始节点ID列表"""
        return self.start_nodes.copy()


class WorkflowParser:
    """工作流解析器"""
    
    def __init__(self, workflow: Optional[Workflow] = None):
        self.workflow = workflow
    
    def parse(self, workflow: Optional[Workflow] = None) -> ExecutionGraph:
        """解析工作流为执行图"""
        wf = workflow or self.workflow
        if not wf:
            raise ValueError("没有提供工作流")
        
        graph = ExecutionGraph()
        
        # 需要跳过的视觉节点类型（不参与执行）
        visual_node_types = {'group', 'note'}
        
        # 添加所有节点（跳过视觉节点，它们只是用于注释和分组）
        for node in wf.nodes:
            if node.type not in visual_node_types:
                graph.nodes[node.id] = node
        
        # 添加所有边（跳过涉及视觉节点的边）
        visual_node_ids = {node.id for node in wf.nodes if node.type in visual_node_types}
        for edge in wf.edges:
            if edge.source in visual_node_ids or edge.target in visual_node_ids:
                continue
            graph.edges.append(edge)
        
        # 构建邻接表
        nodes_with_incoming = set()
        # 仅统计"普通入边"（排除 error 回流边）：用于起始节点兜底判定，
        # 避免"出错→回流到入口节点重试"被误判为无起始节点而整流程无法启动。
        nodes_with_normal_incoming = set()
        # 用 set 去重每个 source 的下游边集合（同一对 source/target 不重复）
        seen_adjacency: dict[str, set[str]] = defaultdict(set)
        seen_reverse: dict[str, set[str]] = defaultdict(set)
        seen_condition: dict[tuple, set[str]] = defaultdict(set)  # (source, handle) -> {targets}
        seen_loop: dict[tuple, set[str]] = defaultdict(set)
        seen_error: dict[str, set[str]] = defaultdict(set)
        
        for edge in graph.edges:
            source_id = edge.source
            target_id = edge.target
            source_node = graph.nodes.get(source_id)
            
            # 处理异常处理分支（所有模块的 error handle）
            if edge.sourceHandle == 'error':
                if target_id not in seen_error[source_id]:
                    seen_error[source_id].add(target_id)
                    if source_id not in graph.error_branches:
                        graph.error_branches[source_id] = []
                    graph.error_branches[source_id].append(target_id)
                # 记录错误边来源，供 join 等待排除
                graph.error_pred[target_id].add(source_id)
            # 处理条件分支（condition、face_recognition、element_exists、element_visible、image_exists、phone_image_exists、probability_trigger 模块的 true/false/path1/path2）
            elif edge.sourceHandle and source_node and source_node.type in ('condition', 'face_recognition', 'element_exists', 'element_visible', 'image_exists', 'phone_image_exists', 'probability_trigger'):
                handle = edge.sourceHandle
                if target_id not in seen_condition[(source_id, handle)]:
                    seen_condition[(source_id, handle)].add(target_id)
                    if source_id not in graph.condition_branches:
                        graph.condition_branches[source_id] = {}
                    if handle not in graph.condition_branches[source_id]:
                        graph.condition_branches[source_id][handle] = []
                    graph.condition_branches[source_id][handle].append(target_id)
            # 处理循环分支（loop/foreach/infinite_loop/foreach_dict 模块的 loop/done）
            elif edge.sourceHandle and source_node and source_node.type in ('loop', 'foreach', 'infinite_loop', 'foreach_dict'):
                if source_id not in graph.loop_branches:
                    graph.loop_branches[source_id] = {'loop': [], 'done': []}
                # 兼容前端传的 "loop-body" -> "loop"，"loop-done" -> "done"
                handle = edge.sourceHandle
                if handle == 'loop-body':
                    handle = 'loop'
                elif handle == 'loop-done':
                    handle = 'done'
                if handle in graph.loop_branches[source_id]:
                    if target_id not in seen_loop[(source_id, handle)]:
                        seen_loop[(source_id, handle)].add(target_id)
                        graph.loop_branches[source_id][handle].append(target_id)
            else:
                # 普通邻接边去重
                if target_id not in seen_adjacency[source_id]:
                    seen_adjacency[source_id].add(target_id)
                    graph.adjacency[source_id].append(target_id)
            
            # 反向邻接也去重
            if source_id not in seen_reverse[target_id]:
                seen_reverse[target_id].add(source_id)
                graph.reverse_adjacency[target_id].append(source_id)
            nodes_with_incoming.add(target_id)
            if edge.sourceHandle != 'error':
                nodes_with_normal_incoming.add(target_id)
        
        # 找出起始节点（没有入边的节点）
        for node_id in graph.nodes:
            if node_id not in nodes_with_incoming:
                graph.start_nodes.append(node_id)
        
        # 兜底：若所有节点都有入边（错误回流边构成环，例如"出错→回到入口节点重试"），
        # 上面会判定为无起始节点导致整个工作流无法启动。此时改用"普通入边"重新判定，
        # 把仅被错误边指向的节点（如入口节点）识别为起始节点。仅在常规判定为空时触发，
        # 不影响存在真实起始节点的普通工作流。
        if not graph.start_nodes:
            for node_id in graph.nodes:
                if node_id not in nodes_with_normal_incoming:
                    graph.start_nodes.append(node_id)
        
        return graph
    
    def validate(self, workflow: Workflow) -> tuple[bool, list[str]]:
        """验证工作流的有效性"""
        errors = []
        
        # 检查是否有节点
        if not workflow.nodes:
            errors.append("工作流没有任何节点")
            return False, errors
        
        # 检查节点ID唯一性
        node_ids = [node.id for node in workflow.nodes]
        if len(node_ids) != len(set(node_ids)):
            errors.append("存在重复的节点ID")
        
        # 检查边引用的节点是否存在
        node_id_set = set(node_ids)
        for edge in workflow.edges:
            if edge.source not in node_id_set:
                errors.append(f"边的源节点不存在: {edge.source}")
            if edge.target not in node_id_set:
                errors.append(f"边的目标节点不存在: {edge.target}")
        
        # 检查是否有起始节点
        graph = self.parse(workflow)
        if not graph.start_nodes:
            errors.append("工作流没有起始节点（所有节点都有入边，可能存在循环）")
        
        # 检查条件分支节点的出边完整性
        condition_types = {'condition', 'face_recognition', 'element_exists',
                          'element_visible', 'image_exists', 'phone_image_exists',
                          'probability_trigger'}
        for node in workflow.nodes:
            if node.type in condition_types:
                branches = graph.condition_branches.get(node.id, {})
                # 至少要有一个 true 分支或 path1 分支
                has_true = bool(branches.get('true') or branches.get('path1'))
                if not has_true and not branches:
                    errors.append(f"条件节点 '{node.id}' ({node.type}) 没有任何输出分支")
        
        # 检查循环节点的出边完整性
        loop_types = {'loop', 'foreach', 'infinite_loop', 'foreach_dict'}
        for node in workflow.nodes:
            if node.type in loop_types:
                branches = graph.loop_branches.get(node.id, {})
                if not branches.get('loop'):
                    errors.append(f"循环节点 '{node.id}' ({node.type}) 缺少循环体（loop 出边）")
        
        return len(errors) == 0, errors


def parse_workflow(workflow_dict: dict) -> tuple[Workflow, ExecutionGraph]:
    """便捷函数：解析工作流字典"""
    workflow = Workflow(**workflow_dict)
    parser = WorkflowParser()
    graph = parser.parse(workflow)
    return workflow, graph
