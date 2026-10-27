from core.node import Node
from core.result import SearchResult

def is_goal(state):
    return state == (0, 1, 2, 3, 4, 5, 6, 7, 8)

def get_successors(state):
    # Moves describe shifting the blank space (0) in row/column delta order
    moves = (("Up", -1, 0), ("Down", 1, 0), ("Left", 0, -1), ("Right", 0, 1))
    idx = state.index(0)

    r = idx // 3
    c = idx % 3

    for action, row, col in moves:
        nr = r+row
        nc = c+col
        if 3 > nr >= 0 and 3 > nc >= 0:
            neighbor_idx = nr * 3 + nc
            new_state = list(state)
            new_state[idx], new_state[neighbor_idx] = new_state[neighbor_idx], new_state[idx]
            yield action, tuple(new_state)  
      
def is_solvable(state):
    # On an odd-width board (3x3), an instance is solvable iff inversion count is even
    inversions = 0 
    for i in range (0,9) :
        if state[i] == 0 :
            continue
        for j in range(i+1,9) :
            if state[j] == 0 :
                continue
            if state[i] > state[j] :
                inversions += 1

    if inversions % 2 == 1:
        return False
    return True