from collections import deque
from core.node import Node 
from core.puzzle import get_successors, is_goal, is_solvable
from core.result import SearchResult

import time

def bfs_search (initial_state) :
    start_time = time.time()
    
    # Check if the initial puzzle state is solvable before searching
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
    
    seen = set()  # all the states that in the queue or explored
    q = deque()  # FIFO queue explores nodes level by level
    start_node = Node(state=initial_state, parent=None, depth=0, g=0, action=None)
    
    q.append(start_node)
    seen.add(start_node.state)
    
    nodes_expanded = 0 
    max_depth = 0

    while q :
        # Pop the oldest node from the front of the queue
        current_node = q.popleft()       
        # Check if the current state matches the goal
        if is_goal(current_node.state) : 
                return SearchResult(
                solved=True,
                path=current_node.get_path(),
                actions=current_node.get_actions(),
                cost=current_node.g,
                nodes_expanded=nodes_expanded,
                max_depth=max_depth,
                running_time=time.time() - start_time
            )
                
        nodes_expanded += 1
         
        # Generate all legal moves (Up, Down, Left, Right)
        for next_action, next_state in get_successors(current_node.state):
            # Avoid revisiting states that are already explored or queued
            if next_state not in seen :
                
                next_node = Node(state=next_state,
                                 parent=current_node,
                                 depth=current_node.depth + 1,
                                 g=current_node.g + 1,
                                 action= next_action)
                
                if next_node.depth > max_depth:   
                    max_depth = next_node.depth
                
                q.append(next_node)
                seen.add(next_node.state)
                
    return SearchResult(
        solved=False,
        path=None,
        actions=None,
        cost=0,
        nodes_expanded=nodes_expanded,
        max_depth=max_depth,
        running_time=time.time() - start_time
    )