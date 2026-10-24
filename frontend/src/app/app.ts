import { Component, signal } from '@angular/core';
import { PuzzleBoardComponent } from './features/puzzle-board/puzzle-board.component';
import { SolutionPathComponent } from './features/solution-path/solution-path.component';
import { SolutionTreeComponent } from './features/solution-tree/solution-tree.component';
import { Algorithm, GOAL_STATE, HeuristicComparison, PuzzleState, SolveRequest, SolveResponse } from './core/models/puzzle.models';
import { PuzzleApiService } from './core/services/puzzle-api.service';

@Component({
  selector: 'app-root',
  imports: [PuzzleBoardComponent, SolutionPathComponent, SolutionTreeComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly puzzleState = signal<PuzzleState>([1, 2, 5, 3, 4, 0, 6, 7, 8]);
  protected readonly solution = signal<SolveResponse | null>(null);
  protected readonly isSolving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly status = signal<'ready' | 'searching' | 'solved' | 'unsolved'>('ready');
  protected readonly comparison = signal<HeuristicComparison | null>(null);
  protected readonly currentStep = signal(0);

  constructor(private readonly puzzleApi: PuzzleApiService) {}

  protected onStateChange(state: PuzzleState): void {
    this.puzzleState.set(state);
    this.solution.set(null);
    this.comparison.set(null);
    this.status.set('ready');
    this.currentStep.set(0);
  }

  protected onPathStateChange(state: PuzzleState): void {
    this.puzzleState.set(state);
  }

  protected onStepChange(step: number): void {
    this.currentStep.set(step);
  }

  protected onStepSelect(step: number): void {
    this.currentStep.set(step);
    if (this.solution()?.path?.[step]) {
      this.puzzleState.set(this.solution()!.path![step]);
    }
  }

  protected solve(request: SolveRequest): void {
    this.isSolving.set(true);
    this.status.set('searching');
    this.solution.set(null);
    this.errorMessage.set(null);
    this.currentStep.set(0);
    this.puzzleApi.solve(request).subscribe({
      next: (response) => {
        this.solution.set(response);
        this.currentStep.set(0);
        this.isSolving.set(false);
        this.status.set(response.solved ? 'solved' : 'unsolved');
      },
      error: (error: { name?: string }) => {
        this.isSolving.set(false);
        this.status.set('ready');
        this.errorMessage.set(error.name === 'TimeoutError'
          ? 'The search exceeded the 60-second time limit. Try a simpler state or algorithm.'
          : 'The solver could not be reached. Check that the backend is running and try again.');
      },
    });
  }

  protected compare(request: SolveRequest): void {
    const baseRequest = { ...request, algorithm: 'astar' as Algorithm };
    this.isSolving.set(true);
    this.status.set('searching');
    this.errorMessage.set(null);
    this.comparison.set(null);
    this.puzzleApi.solve({ ...baseRequest, heuristic: 'manhattan' }).subscribe({
      next: (manhattan) => {
        this.puzzleApi.solve({ ...baseRequest, heuristic: 'euclidean' }).subscribe({
          next: (euclidean) => {
            this.comparison.set({ manhattan, euclidean });
            this.isSolving.set(false);
            this.status.set(manhattan.solved || euclidean.solved ? 'solved' : 'unsolved');
          },
          error: (error: { name?: string }) => this.handleError(error),
        });
      },
      error: (error: { name?: string }) => this.handleError(error),
    });
  }

  private handleError(error: { name?: string }): void {
    this.isSolving.set(false);
    this.status.set('ready');
    this.errorMessage.set(error.name === 'TimeoutError'
      ? 'The search exceeded the 60-second time limit. Try a simpler state or algorithm.'
      : 'The solver could not be reached. Check that the backend is running and try again.');
  }
}
