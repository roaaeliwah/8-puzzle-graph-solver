import time
from core.puzzle import Node, SearchResult, is_goal, get_successors, is_solvable

def depth_limited_search(initial_state, limit):
    start_node = Node(state=initial_state, parent=None, depth=0, g=0, action=None)

    stack = [start_node]
    # Tracks the shallowest depth each state has been reached at in this iteration
    best_depth = {initial_state: 0}
    nodes_expanded = 0
    max_depth = 0

    while stack:
        cur = stack.pop()
        
        # Skip if a strictly shallower path to this state was already processed
        if cur.depth > best_depth[cur.state]:
            continue 

        if is_goal(cur.state):
            return cur, nodes_expanded, max_depth
            
        # Depth cutoff: do not expand beyond the current limit
        if cur.depth == limit:
            continue
               
        nodes_expanded += 1
        
        # Reverse successors so LIFO stack pops in Up -> Down -> Left -> Right order
        for action, state in reversed(list(get_successors(cur.state))):
            new_depth = cur.depth + 1 

            # Only push if state is unseen or reached via a strictly shallower path
            if state not in best_depth or new_depth < best_depth[state]:     
                best_depth[state] = new_depth
                stack.append(Node(state=state, parent=cur, depth=new_depth, g=cur.g+1, action=action))
                max_depth = max(max_depth, new_depth)
    
    return None, nodes_expanded, max_depth

def iddfs_search(initial_state):
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

    total_nodes_expanded = 0
    overall_max_depth = 0
    
    # Max optimal solution depth for any solvable 8-puzzle configuration is 31
    for limit in range(32):
        goal, nodes_expanded, max_depth = depth_limited_search(initial_state=initial_state, limit=limit)

        total_nodes_expanded += nodes_expanded
        overall_max_depth = max(max_depth, overall_max_depth)

        if goal is not None:
            return SearchResult(
                solved=True,
                path=goal.get_path(),
                actions=goal.get_actions(),
                cost=goal.depth,
                nodes_expanded=total_nodes_expanded,
                max_depth=overall_max_depth,
                running_time=time.time() - start_time
            )

    return SearchResult(
        solved=False,
        path=None,
        actions=None,
        cost=0,
        nodes_expanded=total_nodes_expanded,
        max_depth=overall_max_depth,
        running_time=time.time() - start_time
    )
