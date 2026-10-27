from dataclasses import dataclass

@dataclass
class SearchResult:
    """Standardized search outcome metrics across all graph search algorithms."""
    solved: bool
    path: list[tuple[int, ...]] | None = None
    actions: list[str] | None = None
    cost: int = 0
    nodes_expanded: int = 0
    max_depth: int = 0  # Deepest level reached by any node added to the frontier
    running_time: float = 0.0
