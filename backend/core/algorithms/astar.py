import heapq
import time

from itertools import count

from core.puzzle import Node, SearchResult, is_goal, get_successors

# the 8 puzzle game is admissible and consistent and consistency 
# means that once we explore a node from the priority queue then
# if we found that node again we will not find a smaller g(n) than the one that we already found

def a_star_search(initial_state, heuristic_func):
    start_time = time.time()
    # he wants here to check the solvability before or not ? 
    count2 = check_solvability(initial_state) 
    if count2 % 2 == 1 :
            return SearchResult(
        solved=False,
        path=None,
        cost=0,
        nodes_expanded=0,
        max_depth=0,
        running_time=time.time() - start_time
    )
    start_node = Node(state=initial_state, parent=None, depth=0, g=0, action=None)
    
    frontier = []
    tie_breaker = count() # the older one wins

    start_h = heuristic_func(start_node.state)
    heapq.heappush(frontier, (start_node.g + start_h, next(tie_breaker), start_node))

    best_g = {initial_state: 0}
    
    nodes_expanded = 0
    max_depth = 0
    
    while frontier:

        f_score, _, current_node = heapq.heappop(frontier)

        if is_goal(current_node.state):
            return SearchResult(
                solved=True,
                path=current_node.get_path(),
                cost=current_node.g,
                nodes_expanded=nodes_expanded,
                max_depth=max_depth,
                running_time=time.time() - start_time
            )

        nodes_expanded = nodes_expanded + 1
        
        #might be a better approach for the redundant nodes here
        
        for action, next_state in get_successors(current_node.state):
            new_g = current_node.g + 1 
            new_depth = current_node.depth + 1
            
            if new_depth > max_depth:
                max_depth = new_depth

            if next_state not in best_g or new_g < best_g[next_state]:
                best_g[next_state] = new_g
                
                next_node = Node(
                    state=next_state, 
                    parent=current_node, 
                    depth=new_depth, 
                    g=new_g, 
                    action=action
                )

                h_score = heuristic_func(next_state)
                new_f_score = new_g + h_score
                
                heapq.heappush(frontier, (new_f_score, next(tie_breaker), next_node))

    return SearchResult(
        solved=False,
        path=None,
        cost=0,
        nodes_expanded=nodes_expanded,
        max_depth=max_depth,
        running_time=time.time() - start_time
    )
    
    
def check_solvability (state):
    inversions = 0 
    for i in range (0,9) :
        if state[i] == 0 :
            continue
        for j in range(i+1,9) :
            if state[j] == 0 :
                continue
            if state[i] > state[j] :
                inversions += 1
    return inversions