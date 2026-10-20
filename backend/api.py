from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator, model_validator
from typing import List, Optional
from core.heuristic import compute_Manhattan, compute_euclidean
from core.algorithms.astar import a_star_search
from core.algorithms.dfs import dfs_search
from core.algorithms.iddfs import iddfs_search

from enum import Enum

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"]
)

class Algorithm(str, Enum):
    bfs = "bfs"
    dfs = "dfs"
    iddfs = "iddfs"
    astar = "astar"

class Heuristic(str, Enum):
    manhattan = "manhattan"
    euclidean = "euclidean"

# make sure that the call matches
class SolveRequest(BaseModel):
    initial_state : List[int]
    algorithm: Algorithm
    # only for A*
    heuristic : Optional[Heuristic] = None

    @field_validator('initial_state')
    @classmethod
    def validate_initial_state(cls, v):
        if len(v) != 9:
            raise ValueError('initial_state must have exactly 9 elements')
        if sorted(v) != list(range(9)):
            raise ValueError('initial_state must contain numbers 0 to 8 exactly once')
        return v

    @model_validator(mode="after")
    def heuristic_required_for_astar(self):
        if self.algorithm == Algorithm.astar and self.heuristic is None:
            raise ValueError("heuristic is required when algorithm is astar")
        return self

def run_algorithm(state, algorithm, heuristic):
    if algorithm == Algorithm.astar and heuristic == Heuristic.manhattan :
        return a_star_search(state, compute_Manhattan)
    if algorithm == Algorithm.astar and heuristic == Heuristic.euclidean:
        return a_star_search(state, compute_euclidean)

    if algorithm == Algorithm.dfs:
        return dfs_search(state)
    if algorithm == Algorithm.iddfs:
        return iddfs_search(state)



@app.post("/solve")
def solve(request:SolveRequest):
    # enum automatically handles this
    # raise HTTPException(status_code=400, detail="heuristic must be manhattan or euclidean")
    initial_state = tuple(request.initial_state)
    
    result = run_algorithm(initial_state, request.algorithm, request.heuristic)

    return {
        "algorithm": request.algorithm,
        "heuristic": request.heuristic if request.algorithm == Algorithm.astar else None,
        "solved": result.solved,
        "path": result.path,
        "cost": result.cost,
        "nodes_expanded": result.nodes_expanded,
        "max_depth": result.max_depth,
        "running_time": result.running_time
    }
