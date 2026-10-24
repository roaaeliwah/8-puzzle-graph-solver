import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { line, curveCatmullRom } from 'd3-shape';
import { PuzzleState } from '../../core/models/puzzle.models';

/** A positioned node in the solution-path diagram. */
export interface TreeNode {
  index: number;
  x: number;
  y: number;
  state: PuzzleState;
  action: string | null; // null for root
}

/** A single edge segment (bezier curve) between node i-1 and node i. */
export interface TreeEdge {
  index: number; // 1 .. n-1 (step that leads to node i)
  fromIndex: number;
  toIndex: number;
  d: string;
  length: number; // measured via getTotalLength()
}

/** A dummy stub emanating from a real node. */
export interface StubLine {
  nodeIndex: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Splits a continuous SVG path string into per-segment paths. */
function splitPath(fullPath: string, points: [number, number][]): string[] {
  if (!fullPath) return [];
  const commands = fullPath.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
  if (commands.length <= 1) return [];
  const edges: string[] = [];
  for (let i = 1; i < commands.length; i++) {
    const prev = points[i - 1];
    edges.push(`M${prev[0]},${prev[1]}${commands[i]}`);
  }
  return edges;
}

@Component({
  selector: 'app-solution-tree',
  templateUrl: './solution-tree.component.html',
  styleUrl: './solution-tree.component.css',
  standalone: true,
})
export class SolutionTreeComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() path: PuzzleState[] = [];
  @Input() actions: string[] = [];
  @Input() currentStep = 0;
  @Output() stepSelect = new EventEmitter<number>();

  @ViewChild('treeContainer', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  /** Layout data consumed by template. */
  nodes: TreeNode[] = [];
  edges: TreeEdge[] = [];
  stubs: StubLine[] = [];
  svgWidth = 0;
  svgHeight = 0;

  /** Animation tracking: only the actively advancing step gets the transition. */
  animatingStep = -1;
  previousStep = 0;

  /** Node visual constants. */
  readonly nodeRadius = 18;
  readonly stubLength = 28;

  private resizeObserver: ResizeObserver | null = null;
  private containerWidth = 600; // fallback

  // ───────────────────────── lifecycle ──────────────────────────

  ngAfterViewInit(): void {
    this.measureContainer();
    this.resizeObserver = new ResizeObserver(() => {
      this.measureContainer();
      this.recompute();
    });
    if (this.containerRef?.nativeElement) {
      this.resizeObserver.observe(this.containerRef.nativeElement);
    }
    this.recompute();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['path'] || changes['actions']) {
      this.recompute();
      this.previousStep = 0;
      this.animatingStep = -1;
    }

    if (changes['currentStep']) {
      const prev = changes['currentStep'].previousValue ?? 0;
      const curr = this.currentStep;

      if (curr === prev + 1) {
        // Step-for-step forward advance (playback or single next-step click)
        this.animatingStep = curr;
      } else {
        // Jump / scrub / backward seek / initial load
        this.animatingStep = -1;
      }

      this.previousStep = curr;
      this.scrollToNode(curr);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  // ───────────────────────── layout engine ──────────────────────

  private measureContainer(): void {
    if (this.containerRef?.nativeElement) {
      this.containerWidth = this.containerRef.nativeElement.clientWidth || 600;
    }
  }

  private recompute(): void {
    if (!this.path?.length || this.path.length < 2 || !this.actions?.length) {
      this.nodes = [];
      this.edges = [];
      this.stubs = [];
      this.svgWidth = 0;
      this.svgHeight = 0;
      return;
    }

    const n = this.path.length;

    // ── 1. Cumulative horizontal signal from actions ──
    const rawX: number[] = [0];
    let cumulative = 0;
    for (const action of this.actions) {
      if (action === 'Left') cumulative -= 1;
      else if (action === 'Right') cumulative += 1;
      // Up / Down → 0 horizontal pull
      rawX.push(cumulative);
    }

    // ── 2. Find extremes ──
    let minX = Infinity;
    let maxX = -Infinity;
    for (const val of rawX) {
      if (val < minX) minX = val;
      if (val > maxX) maxX = val;
    }

    // ── 3. Rescale into pixel band (80% of container width) ──
    const usableWidth = this.containerWidth * 0.8;
    const centerX = this.containerWidth / 2;
    const range = maxX - minX;

    const scaledX: number[] = rawX.map((val) => {
      if (range === 0) return centerX;
      return centerX + ((val - (minX + maxX) / 2) / range) * usableWidth;
    });

    // ── 4. Derive rowHeight from container height / path length ──
    const containerHeight = 600;
    const rawRowHeight = containerHeight / n;
    const rowHeight = Math.max(34, Math.min(rawRowHeight, 80));
    const topPad = 34;

    // ── 5. Build node positions ──
    this.nodes = this.path.map((state, i) => ({
      index: i,
      x: scaledX[i],
      y: topPad + i * rowHeight,
      state,
      action: i === 0 ? null : this.actions[i - 1],
    }));

    this.svgWidth = this.containerWidth;
    this.svgHeight = topPad + (n - 1) * rowHeight + topPad;

    // ── 6. Spline through nodes via d3 Catmull-Rom & split into edges ──
    const points: [number, number][] = this.nodes.map((nd) => [nd.x, nd.y]);
    const lineGen = line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveCatmullRom.alpha(0.5));
    const fullPath = lineGen(points) ?? '';
    const edgePaths = splitPath(fullPath, points);

    this.edges = edgePaths.map((d, i) => {
      const fromNode = this.nodes[i];
      const toNode = this.nodes[i + 1];
      const estLen = Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y) * 1.35 + 10;
      return {
        index: i + 1,
        fromIndex: i,
        toIndex: i + 1,
        d,
        length: Math.ceil(estLen),
      };
    });

    // ── 7. Dummy stub branches ──
    this.stubs = [];
    const possibleActions = ['Up', 'Down', 'Left', 'Right'];
    for (const node of this.nodes) {
      const usedAction = node.action;
      const outgoingAction =
        node.index < this.actions.length ? this.actions[node.index] : null;
      const unused = possibleActions.filter(
        (a) => a !== usedAction && a !== outgoingAction
      );
      const stubActions = unused.slice(0, 2);
      for (const sa of stubActions) {
        let dx = 0;
        let dy = 0;
        if (sa === 'Left') dx = -1;
        else if (sa === 'Right') dx = 1;
        else if (sa === 'Up') dy = -1;
        else dy = 1;

        const len = this.stubLength;
        const angle = Math.atan2(dy, dx);
        this.stubs.push({
          nodeIndex: node.index,
          x1: node.x,
          y1: node.y,
          x2: node.x + Math.cos(angle) * len,
          y2: node.y + Math.sin(angle) * len,
        });
      }
    }

    // Measure exact edge lengths on the next animation frame
    requestAnimationFrame(() => this.measureEdgeLengths());
  }

  /** Measure the exact path length of each edge SVG path element. */
  private measureEdgeLengths(): void {
    if (!this.containerRef?.nativeElement) return;
    const pathEls = this.containerRef.nativeElement.querySelectorAll<SVGPathElement>('.edge-path');
    pathEls.forEach((el) => {
      const idxAttr = el.getAttribute('data-edge-index');
      if (idxAttr != null) {
        const edgeIndex = Number(idxAttr);
        const edge = this.edges.find((e) => e.index === edgeIndex);
        if (edge) {
          try {
            const len = el.getTotalLength();
            if (len > 0) {
              edge.length = Math.ceil(len);
            }
          } catch {
            // Fall back to estimated length
          }
        }
      }
    });
  }

  private scrollToNode(index: number): void {
    if (!this.containerRef?.nativeElement || !this.nodes[index]) return;
    const container = this.containerRef.nativeElement;
    const node = this.nodes[index];
    const targetY = node.y - container.clientHeight / 2;
    container.scrollTo({
      top: Math.max(0, targetY),
      behavior: 'smooth',
    });
  }

  onNodeClick(index: number): void {
    this.stepSelect.emit(index);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
