import time
from core.puzzle import Node, SearchResult, is_goal, get_successors, is_solvable

def dfs_search(initial_state):
    start_time = time.time()

    if not is_solvable(initial_state):
        return SearchResult(
            solved=False,
            path=None,
            actions=None,
            cost=0,
            nodes_expanded=0,
            max_depth=0,
            running_time=time.time() - start_time
        )
    
    start_node = Node(state=initial_state, parent=None, depth=0, g=0, action=None)

    stack = [start_node]
    visited = {initial_state}
    nodes_expanded = 0
    max_depth = 0

    while stack:
        cur = stack.pop()

        if is_goal(cur.state):
            return SearchResult(
                solved=True,
                path=cur.get_path(),
                actions=cur.get_actions(),
                cost=cur.depth,
                nodes_expanded=nodes_expanded,
                max_depth=max_depth,
                running_time=time.time() - start_time
            ) 
               
        nodes_expanded += 1
        
        # Reverse successors so LIFO stack pops in Up -> Down -> Left -> Right order
        for action, state in reversed(list(get_successors(cur.state))):
            if state not in visited:     
                visited.add(state)
                stack.append(Node(state=state, parent=cur, depth=cur.depth + 1, g=cur.g+1, action=action))
                max_depth = max(max_depth, cur.depth + 1)

    return SearchResult(
        solved=False,
        path=None,
        actions=None,
        cost=0,
        nodes_expanded=nodes_expanded,
        max_depth=max_depth,
        running_time=time.time() - start_time
    )
