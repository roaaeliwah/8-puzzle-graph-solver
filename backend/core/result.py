from dataclasses import dataclass

@dataclass
class SearchResult:
    solved: bool
    path: list[tuple[int, ...]] | None = None
    actions: list[str] | None = None
    cost: int = 0
    nodes_expanded: int = 0
    max_depth: int = 0
    running_time: float = 0.0
