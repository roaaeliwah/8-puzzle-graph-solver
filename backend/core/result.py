from dataclasses import dataclass

@dataclass
class SearchResult:
    solved: bool
    path: list[tuple[int, ...]] | None
    cost: int
    nodes_expanded: int
    max_depth: int
    running_time: float