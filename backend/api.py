from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List
from core.heuristic import compute_Manhattan, compute_euclidean
from core.algorithms.astar import a_star_search


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"]
)
# make sure that the call matches
class SolveRequest(BaseModel):
    initial_state : List[int]
    heuristic : str
    @field_validator('initial_state')
    def validate_initial_state(cls, v):
        if len(v) != 9:
            raise ValueError('initial_state must have exactly 9 elements')
        if sorted(v) != list(range(9)):
            raise ValueError('initial_state must contain numbers 0 to 8 exactly once')
        return v

@app.post("/solve/astar")
def solve(request:SolveRequest):
    
    if request.heuristic == "manhattan":
        heuristic_func = compute_Manhattan
    elif request.heuristic == "euclidean":
        heuristic_func = compute_euclidean
    else:
        raise HTTPException(status_code=400, detail="heuristic must be manhattan or euclidean")

    initial_state = tuple(request.initial_state)
    
    result = a_star_search(initial_state, heuristic_func)

    return {
        "solved": result.solved,
        "path": result.path,
        "cost": result.cost,
        "nodes_expanded": result.nodes_expanded,
        "max_depth": result.max_depth,
        "running_time": result.running_time
    }
