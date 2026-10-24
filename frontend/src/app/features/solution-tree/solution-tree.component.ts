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
import { PuzzleState } from '../../core/models/puzzle.models';

/** A positioned real-path node in the solution diagram. */
export interface TreeNode {
  index: number;
  chunkIndex: number;
  isChunkRoot: boolean;
  isChunkHandoff: boolean;
  isGoal: boolean;
  x: number;
  y: number;
  state: PuzzleState;
  action: string | null; // null for initial root
}

/** A single edge segment (bezier curve) along the real solved path. */
export interface TreeEdge {
  index: number; // 1 .. n-1 (step that leads to node i)
  fromIndex: number;
  toIndex: number;
  d: string;
  length: number; // measured via getTotalLength()
}

/** Real computed branch node (alternative candidate move). */
export interface BranchNode {
  id: string;
  chunkIndex: number;
  parentIndex: number; // which real-path node this branches from
  revealStep: number;  // step index when this branch reveals
  parentX: number;
  parentY: number;
  action: string;      // the move that produced it ('Up', 'Down', 'Left', 'Right')
  state: PuzzleState;  // the real resulting state
  x: number;
  y: number;
  edgeD: string;       // curved connector from parent to this node
}

/** Visual squiggly dashed divider across chunks at handoff boundaries. */
export interface ChunkHandoffConnector {
  fromChunk: number;
  toChunk: number;
  stepIndex: number;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface LayoutNode {
  id: string;
  chunkIndex: number;
  depth: number;
  state: PuzzleState;
  action: string | null;
  incomingAction: string | null;
  isRealPath: boolean;
  stepIndex: number;
  revealStep: number;
  isChunkRoot: boolean;
  isChunkHandoff: boolean;
  isGoal: boolean;
  parent: LayoutNode | null;
  children: LayoutNode[];
  subtreeWidth: number;
  x: number;
  y: number;
}

const MOVES: [string, number, number][] = [
  ['Up', -1, 0],
  ['Down', 1, 0],
  ['Left', 0, -1],
  ['Right', 0, 1],
];

const REVERSE: Record<string, string> = {
  Up: 'Down',
  Down: 'Up',
  Left: 'Right',
  Right: 'Left',
};

const ACTION_ORDER: Record<string, number> = {
  Up: 0,
  Down: 1,
  Left: 2,
  Right: 3,
};

function getSuccessors(state: PuzzleState): [string, PuzzleState][] {
  const idx = state.indexOf(0);
  const r = Math.floor(idx / 3);
  const c = idx % 3;
  const out: [string, PuzzleState][] = [];
  for (const [action, dr, dc] of MOVES) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) {
      const nIdx = nr * 3 + nc;
      const next = [...state] as PuzzleState;
      [next[idx], next[nIdx]] = [next[nIdx], next[idx]];
      out.push([action, next]);
    }
  }
  return out;
}

function statesEqual(a: PuzzleState, b: PuzzleState): boolean {
  for (let i = 0; i < 9; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function deriveActionsFromPath(path: PuzzleState[]): string[] {
  if (!path || path.length < 2) return [];
  const actions: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const fromIdx = path[i].indexOf(0);
    const toIdx = path[i + 1].indexOf(0);
    const delta = toIdx - fromIdx;
    if (delta === -3) actions.push('Up');
    else if (delta === 3) actions.push('Down');
    else if (delta === -1) actions.push('Left');
    else if (delta === 1) actions.push('Right');
    else actions.push('Move');
  }
  return actions;
}

/** Creates a loosely-curved, wiggling dashed vertical continuation line between chunks. */
function generateSquigglyPath(x1: number, y1: number, x2: number, y2: number): string {
  const dy = y2 - y1;
  const dx = x2 - x1;
  const w1 = 12;
  const w2 = -12;
  const midY1 = y1 + dy * 0.25;
  const midY2 = y1 + dy * 0.5;
  const midY3 = y1 + dy * 0.75;

  const cp1x = x1 + dx * 0.15 + w1;
  const cp2x = x1 + dx * 0.4 + w2;
  const cp3x = x1 + dx * 0.65 + w1;
  const cp4x = x1 + dx * 0.9 + w2;

  return (
    `M ${x1},${y1} ` +
    `C ${cp1x},${midY1 - dy * 0.08} ${cp1x},${midY1 + dy * 0.08} ${x1 + dx * 0.35 + (w1 + w2) / 2},${midY2} ` +
    `C ${cp2x},${midY2 + dy * 0.08} ${cp3x},${midY3 - dy * 0.08} ${x1 + dx * 0.75},${midY3} ` +
    `C ${cp4x},${midY3 + dy * 0.08} ${x2},${y2 - dy * 0.08} ${x2},${y2}`
  );
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
  @Input() algorithm?: string;
  @Input() currentStep = 0;
  @Input() chunkDepth = 3;
  @Output() stepSelect = new EventEmitter<number>();

  @ViewChild('treeContainer', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  /** Layout data consumed by template. */
  nodes: TreeNode[] = [];
  edges: TreeEdge[] = [];
  branches: BranchNode[] = [];
  chunkConnectors: ChunkHandoffConnector[] = [];
  svgWidth = 0;
  svgHeight = 0;

  /** Safeguard for deep search algorithms like DFS. */
  readonly maxStepsToRender = 100;
  truncatedSteps = false;
  totalSolutionSteps = 0;

  /** Animation tracking: only the actively advancing step gets the transition. */
  animatingStep = -1;
  previousStep = 0;

  get algorithmLabel(): string {
    if (!this.algorithm) return 'optimal';
    switch (this.algorithm.toLowerCase()) {
      case 'bfs': return 'BFS';
      case 'dfs': return 'DFS';
      case 'iddfs': return 'Iterative DFS';
      case 'astar': return 'A*';
      default: return this.algorithm.toUpperCase();
    }
  }

  /** Visual and tree configuration constants. */
  readonly nodeRadius = 18;
  readonly branchRadius = 11;
  readonly leafSlotWidth = 40;
  readonly siblingGap = 10;
  readonly rowHeight = 62;
  readonly chunkGap = 76;

  private resizeObserver: ResizeObserver | null = null;
  private containerWidth = 600; // fallback

  // ───────────────────────── lifecycle ──────────────────────────

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    this.measureContainer();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.measureContainer();
        this.recompute();
      });
      if (this.containerRef?.nativeElement) {
        this.resizeObserver.observe(this.containerRef.nativeElement);
      }
    }
    this.recompute();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['path'] || changes['actions'] || changes['chunkDepth'] || changes['algorithm']) {
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
    if (!this.path?.length) {
      this.nodes = [];
      this.edges = [];
      this.branches = [];
      this.chunkConnectors = [];
      this.svgWidth = 0;
      this.svgHeight = 0;
      return;
    }

    const effectiveActions = (this.actions && this.actions.length === this.path.length - 1)
      ? this.actions
      : deriveActionsFromPath(this.path);

    if (this.path.length > 1 && !effectiveActions.length) {
      this.nodes = [];
      this.edges = [];
      this.branches = [];
      this.chunkConnectors = [];
      this.svgWidth = 0;
      this.svgHeight = 0;
      return;
    }

    const totalSteps = effectiveActions.length;
    this.totalSolutionSteps = totalSteps;
    const cappedSteps = Math.min(totalSteps, this.maxStepsToRender);
    this.truncatedSteps = totalSteps > this.maxStepsToRender;

    const chunks: { chunkIndex: number; startIdx: number; endIdx: number }[] = [];
    let curr = 0;
    let cIdx = 0;

    while (curr < cappedSteps) {
      const next = Math.min(curr + this.chunkDepth, cappedSteps);
      chunks.push({ chunkIndex: cIdx++, startIdx: curr, endIdx: next });
      curr = next;
    }
    if (chunks.length === 0) {
      chunks.push({ chunkIndex: 0, startIdx: 0, endIdx: 0 });
    }

    const allNodes: TreeNode[] = [];
    const allEdges: TreeEdge[] = [];
    const allBranches: BranchNode[] = [];
    const allConnectors: ChunkHandoffConnector[] = [];

    const chunkCenterX = this.containerWidth / 2;
    let currentY = 40;
    let maxChunkWidth = 0;

    for (const chunk of chunks) {
      const { chunkIndex, startIdx, endIdx } = chunk;

      // ── 1. Root node of chunk ──
      const rootNode: LayoutNode = {
        id: `c${chunkIndex}_n${startIdx}`,
        chunkIndex,
        depth: 0,
        state: this.path[startIdx],
        action: startIdx === 0 ? null : effectiveActions[startIdx - 1],
        incomingAction: startIdx === 0 ? null : effectiveActions[startIdx - 1],
        isRealPath: true,
        stepIndex: startIdx,
        revealStep: startIdx,
        isChunkRoot: true,
        isChunkHandoff: false,
        isGoal: startIdx === totalSteps,
        parent: null,
        children: [],
        subtreeWidth: 0,
        x: 0,
        y: 0,
      };

      // ── 2. Recursive subtree generation down to chunkDepth ──
      const buildTree = (parent: LayoutNode): void => {
        if (parent.depth >= this.chunkDepth) return;
        if (parent.isGoal) return;

        const rawSuccessors = getSuccessors(parent.state);
        const reverseAction = parent.incomingAction ? REVERSE[parent.incomingAction] : null;
        const validMoves = rawSuccessors.filter(([act]) => act !== reverseAction);
        validMoves.sort((a, b) => (ACTION_ORDER[a[0]] ?? 99) - (ACTION_ORDER[b[0]] ?? 99));

        const canProduceRealPathChild =
          parent.isRealPath && parent.stepIndex >= startIdx && parent.stepIndex < endIdx;
        const nextRealAction = canProduceRealPathChild ? effectiveActions[parent.stepIndex] : null;
        const nextRealState = canProduceRealPathChild ? this.path[parent.stepIndex + 1] : null;

        for (let i = 0; i < validMoves.length; i++) {
          const [action, nextState] = validMoves[i];
          const isThisChildRealPath =
            canProduceRealPathChild &&
            action === nextRealAction &&
            statesEqual(nextState, nextRealState!);

          const childStepIndex = isThisChildRealPath ? parent.stepIndex + 1 : -1;
          const childRevealStep = isThisChildRealPath ? childStepIndex : parent.revealStep;
          const isGoal = isThisChildRealPath && childStepIndex === totalSteps;
          const isChunkHandoff =
            isThisChildRealPath && childStepIndex === endIdx && endIdx < totalSteps;

          const childNode: LayoutNode = {
            id: `${parent.id}_d${parent.depth + 1}_${i}_${action}_${isThisChildRealPath ? childStepIndex : 'alt'}`,
            chunkIndex,
            depth: parent.depth + 1,
            state: nextState,
            action,
            incomingAction: action,
            isRealPath: isThisChildRealPath,
            stepIndex: childStepIndex,
            revealStep: childRevealStep,
            isChunkRoot: false,
            isChunkHandoff,
            isGoal,
            parent,
            children: [],
            subtreeWidth: 0,
            x: 0,
            y: 0,
          };

          parent.children.push(childNode);
          buildTree(childNode);
        }
      };

      buildTree(rootNode);

      // ── 3. Bottom-up subtree sizing ──
      const computeWidth = (node: LayoutNode): number => {
        if (node.children.length === 0) {
          node.subtreeWidth = this.leafSlotWidth;
          return node.subtreeWidth;
        }
        let sum = 0;
        for (const ch of node.children) {
          sum += computeWidth(ch);
        }
        sum += (node.children.length - 1) * this.siblingGap;
        node.subtreeWidth = Math.max(this.leafSlotWidth, sum);
        return node.subtreeWidth;
      };

      computeWidth(rootNode);
      if (rootNode.subtreeWidth > maxChunkWidth) {
        maxChunkWidth = rootNode.subtreeWidth;
      }

      // ── 4. Top-down coordinate assignment (anchored at chunkCenterX) ──
      const chunkStartX = Math.max(24, chunkCenterX - rootNode.subtreeWidth / 2);

      const assignCoords = (node: LayoutNode, left: number): void => {
        node.x = left + node.subtreeWidth / 2;
        node.y = currentY + node.depth * this.rowHeight;

        if (node.children.length === 0) return;

        let totalChildrenWidth = 0;
        for (const ch of node.children) {
          totalChildrenWidth += ch.subtreeWidth;
        }
        totalChildrenWidth += (node.children.length - 1) * this.siblingGap;

        let childLeft = left + (node.subtreeWidth - totalChildrenWidth) / 2;
        for (const ch of node.children) {
          assignCoords(ch, childLeft);
          childLeft += ch.subtreeWidth + this.siblingGap;
        }
      };

      assignCoords(rootNode, chunkStartX);

      // ── 5. Flatten chunk tree nodes into allNodes, allEdges, allBranches ──
      let chunkHandoffNode: LayoutNode | null = null;
      let maxDepthInChunk = 0;

      const collect = (node: LayoutNode): void => {
        if (node.depth > maxDepthInChunk) {
          maxDepthInChunk = node.depth;
        }
        if (node.isChunkHandoff) {
          chunkHandoffNode = node;
        }

        if (node.isRealPath) {
          allNodes.push({
            index: node.stepIndex,
            chunkIndex,
            isChunkRoot: node.isChunkRoot,
            isChunkHandoff: node.isChunkHandoff,
            isGoal: node.isGoal,
            x: node.x,
            y: node.y,
            state: node.state,
            action: node.action,
          });

          if (node.parent && node.parent.isRealPath) {
            const p = node.parent;
            const midY = (p.y + node.y) / 2;
            const d = `M${p.x},${p.y}C${p.x},${midY},${node.x},${midY},${node.x},${node.y}`;
            const estLen = Math.hypot(node.x - p.x, node.y - p.y) * 1.3 + 10;
            allEdges.push({
              index: node.stepIndex,
              fromIndex: p.stepIndex,
              toIndex: node.stepIndex,
              d,
              length: Math.ceil(estLen),
            });
          }
        } else {
          const p = node.parent!;
          const midY = (p.y + node.y) / 2;
          const edgeD = `M${p.x},${p.y}C${p.x},${midY},${node.x},${midY},${node.x},${node.y}`;
          allBranches.push({
            id: node.id,
            chunkIndex,
            parentIndex: p.isRealPath ? p.stepIndex : node.revealStep,
            revealStep: node.revealStep,
            parentX: p.x,
            parentY: p.y,
            action: node.action ?? '',
            state: node.state,
            x: node.x,
            y: node.y,
            edgeD,
          });
        }

        for (const ch of node.children) {
          collect(ch);
        }
      };

      collect(rootNode);

      // ── 6. Connect to next chunk if handoff exists (squiggly divider) ──
      if (chunkIndex < chunks.length - 1 && chunkHandoffNode) {
        const handoff: LayoutNode = chunkHandoffNode;
        const nextRootX = chunkCenterX;
        const nextRootY = currentY + maxDepthInChunk * this.rowHeight + this.chunkGap;

        const x1 = handoff.x;
        const y1 = handoff.y + this.nodeRadius + 22; // clears 'continues below' label
        const x2 = nextRootX;
        const y2 = nextRootY - this.nodeRadius - 16; // clears 're-root step' label

        const curveD = generateSquigglyPath(x1, y1, x2, y2);
        allConnectors.push({
          fromChunk: chunkIndex,
          toChunk: chunkIndex + 1,
          stepIndex: endIdx,
          d: curveD,
          x1,
          y1,
          x2,
          y2,
        });
      }

      currentY += maxDepthInChunk * this.rowHeight + this.chunkGap;
    }

    this.nodes = allNodes;
    this.edges = allEdges;
    this.branches = allBranches;
    this.chunkConnectors = allConnectors;
    this.svgWidth = Math.max(this.containerWidth, maxChunkWidth + 48);
    this.svgHeight = currentY + 20;

    // Measure exact edge lengths on next animation frame
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.measureEdgeLengths());
    }
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
    if (!this.containerRef?.nativeElement) return;
    const container = this.containerRef.nativeElement;
    // Prefer node in active chunk or the first non-handoff occurrence
    const node =
      this.nodes.find((nd) => nd.index === index && !nd.isChunkHandoff) ??
      this.nodes.find((nd) => nd.index === index);
    if (!node) return;
    const targetY = node.y - container.clientHeight / 2;
    container.scrollTo({
      top: Math.max(0, targetY),
      behavior: 'smooth',
    });
  }

  onNodeClick(index: number): void {
    this.stepSelect.emit(index);
  }

  trackNodeKey(node: TreeNode): string {
    return `${node.chunkIndex}_${node.index}`;
  }

  trackBranchKey(branch: BranchNode): string {
    return `${branch.chunkIndex}_${branch.id}`;
  }

  trackConnectorKey(conn: ChunkHandoffConnector): string {
    return `${conn.fromChunk}_${conn.stepIndex}`;
  }
}
