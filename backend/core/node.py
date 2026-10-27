class Node:
    """Represents a search tree node containing state, cost metrics, and parent linkage."""
    def __init__(self, state, parent=None, depth=0, g=0, action=None):
        self.state = state
        self.parent = parent
        self.depth = depth
        self.g = g
        self.action = action

    def get_path(self):
        # Trace parent pointers back to root and reverse to produce root-to-goal order
        cur = self
        path = []

        while cur is not None:
            path.append(cur.state)
            cur = cur.parent

        return path[::-1]

    def get_actions(self):
        # Collect transition actions from root down to this node
        cur = self
        actions = []

        while cur.parent is not None:
            actions.append(cur.action)
            cur = cur.parent

        return actions[::-1]
