import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Algorithm, GOAL_STATE, Heuristic, PuzzleState, SAMPLE_STATE, SolveRequest } from '../../core/models/puzzle.models';

@Component({
  selector: 'app-puzzle-board',
  imports: [FormsModule],
  templateUrl: './puzzle-board.component.html',
  styleUrl: './puzzle-board.component.css',
})
export class PuzzleBoardComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) state!: PuzzleState;
  @Input() path: PuzzleState[] = [];
  @Input() disabled = false;
  @Input() selectedStep = 0;
  @Output() stateChange = new EventEmitter<PuzzleState>();
  @Output() pathStateChange = new EventEmitter<PuzzleState>();
  @Output() stepChange = new EventEmitter<number>();
  @Output() solve = new EventEmitter<SolveRequest>();
  @Output() compare = new EventEmitter<SolveRequest>();

  protected algorithm: Algorithm = 'astar';
  protected heuristic: Heuristic = 'manhattan';
  protected initialStateInput = SAMPLE_STATE.join(' ');
  protected inputError: string | null = null;
  protected moveCount = 0;
  protected playing = false;
  private playbackTimer: ReturnType<typeof setInterval> | null = null;
  protected readonly goalState = GOAL_STATE;

  protected precomputedActions: string[] = [];
  readonly windowThreshold = 40;
  readonly windowRadius = 15;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['path']) {
      this.selectedStep = 0;
      this.stepChange.emit(0);
      this.stopPlayback();
      this.precomputeActions();
    } else if (changes['selectedStep'] && !changes['selectedStep'].firstChange) {
      const step = changes['selectedStep'].currentValue;
      if (this.path.length && this.path[step]) {
        this.pathStateChange.emit(this.path[step]);
      }
    }
  }

  private precomputeActions(): void {
    this.precomputedActions = [];
    if (!this.path || this.path.length < 2) return;
    for (let i = 1; i < this.path.length; i++) {
      const prevBlank = this.path[i - 1].indexOf(0);
      const currBlank = this.path[i].indexOf(0);
      const delta = currBlank - prevBlank;
      this.precomputedActions.push(
        delta === -3 ? 'Up' : delta === 3 ? 'Down' : delta === -1 ? 'Left' : 'Right'
      );
    }
  }

  get isWindowed(): boolean {
    return this.path.length > this.windowThreshold;
  }

  get windowStart(): number {
    if (!this.isWindowed) return 0;
    const start = Math.max(0, this.selectedStep - this.windowRadius);
    const end = Math.min(this.path.length - 1, this.selectedStep + this.windowRadius);
    if (end === this.path.length - 1) {
      return Math.max(0, this.path.length - 1 - this.windowRadius * 2);
    }
    return start;
  }

  get windowEnd(): number {
    if (!this.isWindowed) return Math.max(0, this.path.length - 1);
    const start = Math.max(0, this.selectedStep - this.windowRadius);
    if (start === 0) {
      return Math.min(this.path.length - 1, this.windowRadius * 2);
    }
    return Math.min(this.path.length - 1, this.selectedStep + this.windowRadius);
  }

  get visibleSteps(): { index: number; state: PuzzleState; action: string }[] {
    if (!this.path.length) return [];
    const start = this.windowStart;
    const end = this.windowEnd;
    const steps: { index: number; state: PuzzleState; action: string }[] = [];
    for (let i = start; i <= end; i++) {
      steps.push({
        index: i,
        state: this.path[i],
        action: i === 0 ? 'start' : (this.precomputedActions[i - 1] ?? ''),
      });
    }
    return steps;
  }

  protected submit(): void {
    this.solve.emit(this.request());
  }

  protected compareHeuristics(): void {
    this.compare.emit({ ...this.request(), algorithm: 'astar', heuristic: 'manhattan' });
  }

  private request(): SolveRequest {
    return {
      initial_state: this.state,
      algorithm: this.algorithm,
      ...(this.algorithm === 'astar' ? { heuristic: this.heuristic } : {}),
    };
  }

  protected reset(): void {
    this.stopPlayback();
    this.selectedStep = 0;
    this.stepChange.emit(0);
    this.stateChange.emit([...this.goalState]);
    this.initialStateInput = SAMPLE_STATE.join(' ');
    this.inputError = null;
    this.moveCount = 0;
  }

  protected shuffle(): void {
    this.stopPlayback();
    this.selectedStep = 0;
    this.stepChange.emit(0);
    let shuffled = [...this.goalState] as PuzzleState;
    let blank = 0;
    for (let step = 0; step < 30; step++) {
      const row = Math.floor(blank / 3);
      const col = blank % 3;
      const candidates = [blank - 3, blank + 3, col > 0 ? blank - 1 : -1, col < 2 ? blank + 1 : -1]
        .filter((index) => index >= 0 && index < 9 && Math.abs(Math.floor(index / 3) - row) + Math.abs(index % 3 - col) === 1);
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      [shuffled[blank], shuffled[next]] = [shuffled[next], shuffled[blank]];
      blank = next;
    }
    this.moveCount = 0;
    this.initialStateInput = shuffled.join(' ');
    this.stateChange.emit(shuffled);
  }

  protected loadInitialState(): void {
    const values = this.initialStateInput.trim().split(/[\s,]+/).map(Number);
    const isValid = values.length === 9
      && values.every(Number.isInteger)
      && new Set(values).size === 9
      && values.every((value) => value >= 0 && value <= 8);

    if (!isValid) {
      this.inputError = 'Enter each number from 0 to 8 exactly once.';
      return;
    }
    if (!this.isSolvable(values)) {
      this.inputError = 'This initial state is unsolvable (its inversion parity does not match the goal).';
      return;
    }

    this.inputError = null;
    this.moveCount = 0;
    this.stateChange.emit(values as PuzzleState);
  }

  private isSolvable(values: number[]): boolean {
    let inversions = 0;
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        if (values[i] !== 0 && values[j] !== 0 && values[i] > values[j]) inversions++;
      }
    }
    return inversions % 2 === 0;
  }

  protected move(tileIndex: number): void {
    const emptyIndex = this.state.indexOf(0);
    const sameRow = Math.floor(tileIndex / 3) === Math.floor(emptyIndex / 3);
    const adjacent = sameRow && Math.abs(tileIndex - emptyIndex) === 1
      || Math.abs(tileIndex - emptyIndex) === 3;
    if (!adjacent) {
      return;
    }

    const nextState = [...this.state] as PuzzleState;
    [nextState[tileIndex], nextState[emptyIndex]] = [nextState[emptyIndex], nextState[tileIndex]];
    this.moveCount++;
    this.stateChange.emit(nextState);
  }

  protected tileLabel(tile: number): string {
    return tile === 0 ? 'Empty' : `Tile ${tile}`;
  }

  protected slideClass(index: number): string {
    if (this.selectedStep === 0 || !this.path[this.selectedStep] || index !== this.path[this.selectedStep - 1].indexOf(0)) {
      return '';
    }

    const previousBlank = this.path[this.selectedStep - 1].indexOf(0);
    const currentBlank = this.path[this.selectedStep].indexOf(0);
    const delta = currentBlank - previousBlank;
    return delta === -3 ? 'slide-down' : delta === 3 ? 'slide-up' : delta === -1 ? 'slide-right' : 'slide-left';
  }

  protected firstStep(): void { this.selectStep(0); }
  protected previousStep(): void { this.selectStep(Math.max(this.selectedStep - 1, 0)); }
  protected nextStep(): void { this.selectStep(Math.min(this.selectedStep + 1, Math.max(this.path.length - 1, 0))); }
  protected lastStep(): void { this.selectStep(Math.max(this.path.length - 1, 0)); }
  protected selectStepFromTree(index: number): void { this.selectStep(index); }

  protected get currentMove(): string {
    if (this.selectedStep === 0 || !this.path[this.selectedStep]) return 'Initial state';
    return this.precomputedActions[this.selectedStep - 1] ?? 'Move';
  }

  protected actionAt(index: number): string {
    if (index === 0) return 'start';
    return this.precomputedActions[index - 1] ?? '';
  }

  protected track(index: number): number {
    return index;
  }

  protected togglePlayback(): void {
    if (this.playing) {
      this.stopPlayback();
      return;
    }
    if (this.path.length < 2) return;
    if (this.selectedStep >= this.path.length - 1) this.firstStep();
    this.playing = true;
    this.playbackTimer = setInterval(() => {
      if (this.selectedStep >= this.path.length - 1) this.stopPlayback();
      else this.nextStep();
    }, 700);
  }

  private selectStep(index: number, emitStep = true): void {
    if (!this.path.length) return;
    this.selectedStep = index;
    this.pathStateChange.emit(this.path[index]);
    if (emitStep) {
      this.stepChange.emit(index);
    }
  }

  private stopPlayback(): void {
    this.playing = false;
    if (this.playbackTimer) clearInterval(this.playbackTimer);
    this.playbackTimer = null;
  }

  ngOnDestroy(): void {
    this.stopPlayback();
  }
}
