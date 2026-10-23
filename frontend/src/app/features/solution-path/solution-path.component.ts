import { Component, Input } from '@angular/core';
import { HeuristicComparison, PuzzleState, SolveResponse } from '../../core/models/puzzle.models';

@Component({
  selector: 'app-solution-path',
  templateUrl: './solution-path.component.html',
  styleUrl: './solution-path.component.css',
})
export class SolutionPathComponent {
  @Input() path: PuzzleState[] = [];
  @Input() result: SolveResponse | null = null;
  @Input() comparison: HeuristicComparison | null = null;
  @Input() loading = false;

  protected async copyResults(): Promise<void> {
    if (!this.result) return;
    const text = [
      `Algorithm: ${this.result.algorithm}${this.result.heuristic ? ` (${this.result.heuristic})` : ''}`,
      `Solved: ${this.result.solved}`,
      `Path cost: ${this.result.cost}`,
      `Nodes expanded: ${this.result.nodes_expanded}`,
      `Search depth: ${this.result.max_depth}`,
      `Running time: ${this.result.running_time} s`,
      `Path: ${this.path.map((state) => state.join(' ')).join(' -> ')}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
  }
}
