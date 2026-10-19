from core.node import Node
from core.result import SearchResult

def is_goal(state):
    goal = (0, 1, 2, 3, 4, 5, 6, 7, 8)
    if state == goal:
        return True
    return False

def get_successors(state):
    moves = (("Up", -1, 0), ("Down", 1, 0), ("Left", 0, -1), ("Right", 0, 1))
    idx = state.index(0)
    arr = []

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
