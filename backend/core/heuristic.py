import math

def compute_Manhattan (state, goal = (0,1,2,3,4,5,6,7,8) ):
    total_distance = 0
    
    for current_idx, value in enumerate(state):
        
        if value == 0:
            continue
            
        goal_idx = goal.index(value)

        cur_row = current_idx // 3
        cur_col = current_idx % 3
        
        goal_row = goal_idx // 3
        goal_col = goal_idx % 3

        distance = abs(cur_row - goal_row) + abs(cur_col - goal_col)
        total_distance += distance
        
    return total_distance


def compute_euclidean (state, goal= (0,1,2,3,4,5,6,7,8)):
    total_distance = 0
    
    for current_idx, value in enumerate(state):
        
        if value == 0:
            continue
            
        goal_idx = goal.index(value)

        cur_row = current_idx // 3
        cur_col = current_idx % 3
        
        goal_row = goal_idx // 3
        goal_col = goal_idx % 3

        distance = math.sqrt((cur_row - goal_row )**2 + (cur_col - goal_col)**2)
        total_distance += distance
        
    return total_distance
    