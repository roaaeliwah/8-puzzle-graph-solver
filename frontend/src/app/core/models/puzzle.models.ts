export type PuzzleState = [
  number, number, number,
  number, number, number,
  number, number, number
];

export type Algorithm = 'bfs' | 'dfs' | 'iddfs' | 'astar';
export type Heuristic = 'manhattan' | 'euclidean';

export interface SolveRequest {
  initial_state: PuzzleState;
  algorithm: Algorithm;
  heuristic?: Heuristic;
}

export interface SolveResponse {
  algorithm: Algorithm;
  heuristic: Heuristic | null;
  solved: boolean;
  path: PuzzleState[] | null;
  actions: string[] | null;
  cost: number;
  nodes_expanded: number;
  max_depth: number;
  running_time: number;
}

export interface HeuristicComparison {
  manhattan: SolveResponse;
  euclidean: SolveResponse;
}

export const GOAL_STATE: PuzzleState = [0, 1, 2, 3, 4, 5, 6, 7, 8];
export const SAMPLE_STATE: PuzzleState = [1, 2, 5, 3, 4, 0, 6, 7, 8];
