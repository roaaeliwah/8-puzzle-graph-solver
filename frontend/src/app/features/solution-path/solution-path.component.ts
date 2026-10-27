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

  copied = false;

  protected async copyResults(): Promise<void> {
    if (!this.result) return;
    const text = [
      `Algorithm: ${this.result.algorithm}${this.result.heuristic ? ` (${this.result.heuristic})` : ''}`,
      `Solved: ${this.result.solved}`,
      `path to goal: ${this.result.actions ? JSON.stringify(this.result.actions) : '[]'}`,
      `cost of path: ${this.result.cost}`,
      `nodes expanded: ${this.result.nodes_expanded}`,
      `search depth: ${this.result.max_depth}`,
      `running time: ${this.result.running_time} s`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    this.copied = true;
    setTimeout(() => {
      this.copied = false;
    }, 2000);
  }
}
