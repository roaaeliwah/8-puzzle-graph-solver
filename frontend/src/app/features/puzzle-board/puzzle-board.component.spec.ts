import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PuzzleBoardComponent } from './puzzle-board.component';
import { PuzzleState } from '../../core/models/puzzle.models';

describe('PuzzleBoardComponent', () => {
  let component: PuzzleBoardComponent;
  let fixture: ComponentFixture<PuzzleBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PuzzleBoardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PuzzleBoardComponent);
    component = fixture.componentInstance;
    component.state = [1, 2, 5, 3, 4, 0, 6, 7, 8];
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render all steps directly when path length is small (e.g. 5 steps)', () => {
    const s0: PuzzleState = [3, 1, 2, 6, 0, 5, 7, 4, 8];
    const s1: PuzzleState = [3, 1, 2, 6, 4, 5, 7, 0, 8];
    const s2: PuzzleState = [3, 1, 2, 6, 4, 5, 0, 7, 8];
    const s3: PuzzleState = [3, 1, 2, 0, 4, 5, 6, 7, 8];
    const s4: PuzzleState = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    component.path = [s0, s1, s2, s3, s4];
    component.ngOnChanges({
      path: { currentValue: component.path, previousValue: [], firstChange: true, isFirstChange: () => true },
    });
    fixture.detectChanges();

    expect(component.isWindowed).toBe(false);
    expect(component.visibleSteps.length).toBe(5);
    expect(component.visibleSteps[0].action).toBe('start');
    expect(component.visibleSteps[1].action).toBe('Down');
    expect(component.visibleSteps[2].action).toBe('Left');
  });

  it('should use a sliding window for massive paths (e.g. 10,000 steps)', () => {
    const stateA: PuzzleState = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const stateB: PuzzleState = [1, 0, 2, 3, 4, 5, 6, 7, 8];
    const bigPath: PuzzleState[] = [];
    for (let i = 0; i < 10001; i++) {
      bigPath.push(i % 2 === 0 ? stateA : stateB);
    }

    component.path = bigPath;
    component.selectedStep = 0;
    component.ngOnChanges({
      path: { currentValue: component.path, previousValue: [], firstChange: true, isFirstChange: () => true },
    });
    fixture.detectChanges();

    expect(component.isWindowed).toBe(true);
    // At step 0, window starts at 0 and extends radius * 2 (30)
    expect(component.windowStart).toBe(0);
    expect(component.windowEnd).toBe(30);
    expect(component.visibleSteps.length).toBe(31);

    // Now advance selectedStep to 500
    component.selectedStep = 500;
    expect(component.windowStart).toBe(485);
    expect(component.windowEnd).toBe(515);
    expect(component.visibleSteps.length).toBe(31);
    expect(component.visibleSteps[0].index).toBe(485);
    expect(component.visibleSteps[component.visibleSteps.length - 1].index).toBe(515);

    // Jump to the end (10000)
    component.selectedStep = 10000;
    expect(component.windowEnd).toBe(10000);
    expect(component.windowStart).toBe(10000 - 30);
    expect(component.visibleSteps.length).toBe(31);
  });
});

