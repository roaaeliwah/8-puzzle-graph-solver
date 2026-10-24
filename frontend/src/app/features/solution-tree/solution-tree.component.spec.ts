import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SolutionTreeComponent } from './solution-tree.component';
import { PuzzleState } from '../../core/models/puzzle.models';

describe('SolutionTreeComponent', () => {
  let component: SolutionTreeComponent;
  let fixture: ComponentFixture<SolutionTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolutionTreeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SolutionTreeComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render empty state message when no path is provided', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.tree-empty')?.textContent).toContain(
      'Solve the puzzle with any algorithm'
    );
  });

  it('should render tree nodes and edges for A* solution with actions', () => {
    // 3 1 2 6 0 5 7 4 8 -> goal in 4 steps: Down, Left, Up, Up
    const s0: PuzzleState = [3, 1, 2, 6, 0, 5, 7, 4, 8];
    const s1: PuzzleState = [3, 1, 2, 6, 4, 5, 7, 0, 8];
    const s2: PuzzleState = [3, 1, 2, 6, 4, 5, 0, 7, 8];
    const s3: PuzzleState = [3, 1, 2, 0, 4, 5, 6, 7, 8];
    const s4: PuzzleState = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    component.algorithm = 'astar';
    component.path = [s0, s1, s2, s3, s4];
    component.actions = ['Down', 'Left', 'Up', 'Up'];

    component.ngOnChanges({
      path: { currentValue: component.path, previousValue: [], firstChange: true, isFirstChange: () => true },
    });
    fixture.detectChanges();

    expect(component.nodes.length).toBeGreaterThan(0);
    expect(component.totalSolutionSteps).toBe(4);
    expect(component.algorithmLabel).toBe('A*');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('svg.tree-svg')).toBeTruthy();
    expect(compiled.querySelector('.tree-legend')?.textContent).toContain('actual A* solution');
  });

  it('should automatically derive actions if actions input is missing or empty', () => {
    const s0: PuzzleState = [1, 2, 5, 3, 4, 0, 6, 7, 8];
    const s1: PuzzleState = [1, 2, 0, 3, 4, 5, 6, 7, 8];
    const s2: PuzzleState = [1, 0, 2, 3, 4, 5, 6, 7, 8];
    const s3: PuzzleState = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    component.algorithm = 'iddfs';
    component.path = [s0, s1, s2, s3];
    component.actions = []; // deliberately empty to test fallback derivation

    component.ngOnChanges({
      path: { currentValue: component.path, previousValue: [], firstChange: true, isFirstChange: () => true },
    });
    fixture.detectChanges();

    expect(component.nodes.length).toBeGreaterThan(0);
    expect(component.totalSolutionSteps).toBe(3);
    expect(component.algorithmLabel).toBe('Iterative DFS');
  });

  it('should safely cap very long paths (like DFS) at maxStepsToRender', () => {
    // Generate mock alternating path of 150 steps
    const mockPath: PuzzleState[] = [];
    const stateA: PuzzleState = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const stateB: PuzzleState = [1, 0, 2, 3, 4, 5, 6, 7, 8];
    for (let i = 0; i < 151; i++) {
      mockPath.push(i % 2 === 0 ? stateA : stateB);
    }

    component.algorithm = 'dfs';
    component.path = mockPath;
    component.actions = deriveActions(mockPath);

    component.ngOnChanges({
      path: { currentValue: component.path, previousValue: [], firstChange: true, isFirstChange: () => true },
    });
    fixture.detectChanges();

    expect(component.truncatedSteps).toBe(true);
    expect(component.totalSolutionSteps).toBe(150);
    expect(component.algorithmLabel).toBe('DFS');
  });
});

function deriveActions(path: PuzzleState[]): string[] {
  const actions: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const fromIdx = path[i].indexOf(0);
    const toIdx = path[i + 1].indexOf(0);
    actions.push(toIdx > fromIdx ? 'Right' : 'Left');
  }
  return actions;
}
