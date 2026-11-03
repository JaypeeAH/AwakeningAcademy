import { videoMarkdown } from '@/utils/media'
import type { CourseSeedModule } from '@/@types/courses/CourseSeed'

/*
 * Unit 4: Networks and Graphs (LAS lessons 4.1–4.5). The LAS figures can't be shown, so every graph is
 * written out as a vertex set and an edge list. Every route, degree count, search order and shortest
 * distance below was checked by computation.
 */

const LAS_CREDIT = '*Video suggested in the DepEd Learning Activity Sheets for Finite Mathematics 2, on YouTube.*'

const OBJ = {
    // 4.1
    graphDef: 'Define a graph G = (V, E) and identify its vertices and edges',
    degree: 'Find the degree of a vertex and the vertices adjacent to it',
    types: 'Differentiate types of graphs: simple, directed, mixed, complete, bipartite, path, cycle, tree, regular',
    model: 'Model real-life networks (transport, social, communication) as graphs',
    // 4.2
    eulerDef: 'Define Eulerian paths and circuits',
    eulerThm: 'Apply Euler’s theorem to decide whether an Eulerian path or circuit exists',
    eulerTrace: 'Trace an Eulerian path or circuit using Fleury’s procedure',
    // 4.3
    hamDef: 'Define Hamiltonian paths and circuits',
    dirac: 'Apply Dirac’s condition to confirm a Hamiltonian circuit',
    hamTrace: 'Trace Hamiltonian paths and circuits in a connected graph',
    eulerVsHam: 'Differentiate Eulerian (every edge) from Hamiltonian (every vertex) problems',
    // 4.4
    tree: 'Define trees and spanning trees and explain why they matter in network design',
    bfs: 'Apply Breadth-First Search (BFS) to find a spanning tree',
    dfs: 'Apply Depth-First Search (DFS) to find a spanning tree',
    // 4.5
    weighted: 'Define a weighted graph, the length of a path and the shortest-path problem',
    dijkstra: 'Apply Dijkstra’s algorithm to find shortest paths from one source',
    floyd: 'Apply the Floyd-Warshall algorithm to find shortest paths between all pairs',
    compare: 'Compare Dijkstra’s and Floyd-Warshall algorithms',
}

// ── Lesson 4.1 ────────────────────────────────────────────────────────────────────────────────────

const graphBasics = [
    '## Points and connections',
    'Look at a jeepney route map, a group chat, or the power lines of a barangay. Each one is made of **things** (stops, people, posts) and **connections** between them (roads, friendships, wires). Mathematicians call this structure a **graph**.',
    '## What is a graph?',
    'A graph is written as an ordered pair\n\n**G = (V, E)**\n\nwhere **V** is the set of **vertices** (points, also called nodes) and **E** is the set of **edges** (connections, also called arcs when they have a direction).',
    '- An edge between A and B is written **AB** (two-way).\n- A one-way connection from E to D is written **E→D** (an arc).',
    '## Adjacency and degree',
    'Two vertices are **adjacent** if an edge joins them. The **degree** of a vertex is the number of edges that touch it (a loop counts twice).',
    '> [!TIP]\n> **Handshake check.** Every edge has two ends, so the degrees always add up to **2 × (number of edges)**. If your degree list doesn’t, you missed or double-counted an edge.',
    '> [!NOTE]\n> **Worked example.** V = {A, B, C, D, E} and E = {AB, AC, BC, CE, E→D, B→D}. Here four connections are two-way and two (E→D and B→D) are one-way.\n>\n> | Vertex | Degree | Adjacent to |\n> | --- | --- | --- |\n> | A | 2 | B, C |\n> | B | 3 | A, C, D |\n> | C | 3 | A, B, E |\n> | D | 2 | B, E |\n> | E | 2 | C, D |\n>\n> Check: 2 + 3 + 3 + 2 + 2 = 12 = 2 × 6 edges. ✔',
    '## In-degree and out-degree',
    'When connections have a direction, we also count **in-degree** (arcs pointing **into** a vertex) and **out-degree** (arcs pointing **out of** it). In the example, D has in-degree 2 (from E and from B) and out-degree 0: you can reach D, but you can’t leave it along an arc.',
    '## Types of graphs',
    [
        '| Type | What it means | Real-life example |',
        '| --- | --- | --- |',
        '| Simple | No loops, no two edges joining the same pair | A friendship network |',
        '| Directed (digraph) | Every edge has a direction | One-way streets, following someone online |',
        '| Mixed | Some edges two-way, some one-way | A city map with two-way and one-way roads |',
        '| Complete (Kₙ) | Every pair of distinct vertices is joined | 4 friends who are all friends with each other |',
        '| Bipartite | Vertices split into two groups; edges only go between the groups | “Boys vs. girls” passing game; players vs. teams |',
        '| Connected | There is a route between every pair of vertices | A road network with no isolated barangay |',
        '| Path | Vertices in a line, each joined to the next | Stops along a single jeepney route |',
        '| Cycle | A closed loop; every vertex has degree 2 | A circular bus loop |',
        '| Tree | Connected, with no cycle (n vertices, n − 1 edges) | A family tree, water pipes from one tank |',
        '| Regular | Every vertex has the same degree | A cycle (all degree 2); K₄ (all degree 3) |',
    ].join('\n'),
    '> [!NOTE]\n> **Which type?**\n>\n> - Four students who are all friends with one another → **complete graph** K₄.\n> - A network of one-way streets → **directed graph**.\n> - Passing the ball only to a member of the other team → **bipartite graph**.\n> - Some roads two-way, some one-way → **mixed graph**.',
    '## Modelling a real network: AirLink Philippines',
    'AirLink serves Manila (M), Cebu (C), Davao (D), Basco (B) and Puerto Princesa (P). There are two-way flights M–C and C–D, a one-way flight D→M and a one-way flight M→B. Puerto Princesa has no flight yet.',
    '- Graph: V = {M, C, D, B, P}, edges {MC, CD}, arcs {D→M, M→B}.\n- It is **mixed** (both kinds of connection).\n- It is **not connected**: P has degree 0, so no route reaches it — even though the other four towns are linked.\n- D has in-degree 0 and out-degree 1 (only D→M is an arc at D; CD is two-way).',
    '> [!WARNING]\n> A graph is connected only if **every** vertex can be reached. One isolated vertex is enough to make it disconnected.',
    '## Watch',
    videoMarkdown('https://www.youtube.com/watch?v=Aj55yJ9Gz8Y', 'Introduction to graph theory'),
    videoMarkdown('https://www.youtube.com/watch?v=dxhFQyivdUs', 'Types of graphs'),
    LAS_CREDIT,
    '## Check yourself',
    '- In a complete graph on 5 vertices, what is the degree of each vertex? (4)\n- A tree has 7 vertices. How many edges? (6)\n- Why does every graph have an even total degree?',
].join('\n\n')

// ── Lesson 4.2 ────────────────────────────────────────────────────────────────────────────────────

const eulerian = [
    '## The seven bridges of Königsberg',
    'In the 1700s, the city of Königsberg had four land areas joined by seven bridges. People asked: can you take a walk that crosses **every bridge exactly once**? In 1736, Leonhard Euler showed it is impossible — and invented graph theory doing it.',
    'Make each land area a vertex and each bridge an edge. The four land areas have degrees **5, 3, 3 and 3**. All four are odd, and (as you’ll see) that settles it.',
    '## Eulerian paths and circuits',
    '- An **Eulerian path** is a route that uses **every edge exactly once**. It may start and end at different vertices, and it may pass through a vertex many times.\n- An **Eulerian circuit** is an Eulerian path that **ends where it started**.',
    '## Euler’s theorem',
    'For a **connected** graph, count the vertices of **odd degree**:',
    [
        '| Odd-degree vertices | What exists |',
        '| --- | --- |',
        '| 0 | An Eulerian circuit (start anywhere) |',
        '| 2 | An Eulerian path, not a circuit — it must start at one odd vertex and end at the other |',
        '| 4, 6, 8, … | Neither |',
    ].join('\n'),
    '> [!NOTE]\n> **Why?** Each time a route passes through a vertex it uses two edges — one in, one out. So every vertex in the middle of the route needs an even degree. Only the start and the end can be odd.',
    '> [!TIP]\n> A graph can never have exactly **one** odd vertex: the total degree is always even, so odd vertices come in pairs.',
    '## Fleury’s procedure',
    '1. For a circuit, start anywhere. For a path, start at one of the two odd vertices.\n2. Choose an edge leaving the current vertex — but **don’t cross a bridge** (an edge whose removal cuts the remaining edges into two separate pieces) unless it is the only choice.\n3. Travel along that edge and erase it.\n4. Repeat until every edge is used.',
    '## Worked examples',
    '> [!NOTE]\n> **Example 1 — a path.** E = {AB, AE, BE, BC, CD, DE}.\n>\n> Degrees: A 2, B 3, C 2, D 2, E 3. Exactly two odd vertices (B and E), so there is an Eulerian path from B to E but no circuit.\n>\n> Route: **B → A → E → B → C → D → E** (6 edges, each once).',
    '> [!NOTE]\n> **Example 2 — a path.** E = {AE, ED, DF, EF, EB, BF, FC}.\n>\n> Degrees: A 1, B 2, C 1, D 2, E 4, F 4. Odd vertices: A and C.\n>\n> Route: **A → E → D → F → E → B → F → C**.',
    '> [!NOTE]\n> **Example 3 — a circuit.** A pentagon A–B–C–D–E–A: every vertex has degree 2, so an Eulerian circuit exists: **A → B → C → D → E → A**.',
    '> [!NOTE]\n> **Example 4 — neither.** A square A–B–C–D–A with two extra “tails” A–E and C–F.\n>\n> Degrees: A 3, B 2, C 3, D 2, E 1, F 1 → four odd vertices, so no Eulerian path and no circuit.\n>\n> **Repair it:** add one edge between two odd vertices, e.g. **EF**. Now only A and C are odd, so an Eulerian path from A to C exists. Each new edge changes the degree of two vertices by one.',
    '## Where it’s used',
    'Street sweepers, garbage trucks, mail carriers and meter readers want to cover **every street** without repeating — an Eulerian problem.',
    '## Watch',
    videoMarkdown('https://www.youtube.com/watch?v=5M-m62qTR-s&t=138s', 'Euler paths and circuits'),
    LAS_CREDIT,
    '> [!WARNING]\n> Always check that the graph is **connected** first. Euler’s theorem only applies to connected graphs.',
].join('\n\n')

// ── Lesson 4.3 ────────────────────────────────────────────────────────────────────────────────────

const hamiltonian = [
    '## Visit every place exactly once',
    'A delivery rider leaves the depot, must stop at every customer exactly once, and come back. A tour guide wants to visit every landmark in Intramuros once. These problems are about **vertices**, not edges.',
    '## Hamiltonian paths and circuits',
    '- A **Hamiltonian path** visits **every vertex exactly once**.\n- A **Hamiltonian circuit** visits every vertex exactly once and **returns to the start**. On n vertices it uses exactly n edges.',
    [
        '| | Eulerian | Hamiltonian |',
        '| --- | --- | --- |',
        '| Must use… | every **edge** once | every **vertex** once |',
        '| Simple test? | Yes: count odd degrees (if and only if) | No general test is known |',
        '| Typical problem | Sweep every street | Visit every customer |',
    ].join('\n'),
    '## Dirac’s condition',
    'There is no quick “if and only if” test for Hamiltonian circuits. But there is a useful **sufficient** condition:',
    '> [!IMPORTANT]\n> **Dirac’s theorem.** If a simple graph has n ≥ 3 vertices and **every vertex has degree at least n/2**, then it has a Hamiltonian circuit.',
    '- Condition met → a Hamiltonian circuit is **guaranteed**.\n- Condition not met → **we can’t tell** from Dirac alone. The graph may still have one; try to build it by hand.',
    '> [!NOTE]\n> **Example 1 — Dirac applies.** V = {A, B, C, D, E}, E = {AB, AC, AE, BC, BD, CD, CE, DE}.\n>\n> n = 5, so n/2 = 2.5. Degrees: A 3, B 3, C 4, D 3, E 3 — all at least 2.5. A Hamiltonian circuit is guaranteed. One is **A → B → C → D → E → A**.',
    '> [!NOTE]\n> **Example 2 — Dirac fails, but a circuit exists.** A hexagon A–B–C–D–E–F–A with two diagonals AC and DF.\n>\n> n = 6, so n/2 = 3. Degrees: A 3, B 2, C 3, D 3, E 2, F 3. B and E are below 3, so Dirac doesn’t apply. Yet the outer loop **A → B → C → D → E → F → A** is a Hamiltonian circuit.',
    '> [!NOTE]\n> **Example 3 — a path but no circuit.** E = {AB, AD, BC, BD, CD, DE}.\n>\n> E has degree 1, so any route that reaches E is stuck there: no Hamiltonian circuit. A Hamiltonian path starts (or ends) at E: **E → D → A → B → C**.',
    '> [!WARNING]\n> A vertex of degree 1 can never be on a Hamiltonian circuit: a circuit needs two different edges at every vertex — one to arrive, one to leave.',
    '## Euler or Hamilton?',
    '- Mail carrier walking every street once → **Eulerian** (edges).\n- Tour guide visiting every landmark once → **Hamiltonian** (vertices).\n- Inspector crossing every bridge once → **Eulerian**.\n- Delivery driver visiting five stops once and returning → **Hamiltonian circuit**.',
    '## Watch',
    videoMarkdown('https://www.youtube.com/watch?v=AamHZhAmR7o', 'Hamiltonian paths and circuits'),
    videoMarkdown('https://www.youtube.com/watch?v=OGh5JKso0y4', 'Hamiltonian circuits examples'),
    LAS_CREDIT,
].join('\n\n')

// ── Lesson 4.4 ────────────────────────────────────────────────────────────────────────────────────

const spanningTrees = [
    '## Connected, without the extras',
    'A barangay wants to connect six sitios with power lines, using as few lines as possible but leaving no sitio cut off. The answer is a **spanning tree**.',
    '## Trees and spanning trees',
    '- A **tree** is a connected graph with **no cycle**. A tree on n vertices always has exactly **n − 1 edges**.\n- A **spanning tree** of a connected graph is a tree that uses **every vertex** of the graph and only some of its edges.',
    '> [!TIP]\n> A spanning tree is the minimal backbone of a network. Remove any one of its edges and the network splits in two. Add any other edge of the graph and you create a cycle.',
    '## The sitio network',
    'V = {A, B, C, D, E, F}, E = {AB, AC, BC, BD, CE, DE, DF, EF} (8 edges). A spanning tree keeps all 6 sitios connected with only 6 − 1 = **5** lines.',
    [
        '| Vertex | Neighbours (alphabetical) |',
        '| --- | --- |',
        '| A | B, C |',
        '| B | A, C, D |',
        '| C | A, B, E |',
        '| D | B, E, F |',
        '| E | C, D, F |',
        '| F | D, E |',
    ].join('\n'),
    '## Breadth-First Search (BFS)',
    'BFS explores **level by level** using a **queue** (first in, first out). Rule: when a vertex has several unvisited neighbours, take them in alphabetical order. The edge that first reaches each vertex becomes a tree edge.',
    '1. Visit A. Queue: A.\n2. Take A out; its unvisited neighbours are B and C. Add **AB, AC**. Queue: B, C.\n3. Take B out; unvisited neighbour D. Add **BD**. Queue: C, D.\n4. Take C out; unvisited neighbour E. Add **CE**. Queue: D, E.\n5. Take D out; unvisited neighbour F. Add **DF**. Queue: E, F.\n6. Take E, then F — nothing new. The queue is empty.',
    '**BFS order:** A, B, C, D, E, F. **BFS tree:** AB, AC, BD, CE, DF.',
    '## Depth-First Search (DFS)',
    'DFS goes **as deep as possible** first, using a **stack** — think of it as the trail you walk back along. From the current vertex, move to its first unvisited neighbour (alphabetically). When stuck, back up and try the next neighbour.',
    '1. Visit A, go deeper to B. Add **AB**.\n2. From B, go to C (A is visited). Add **BC**.\n3. From C, go to E. Add **CE**.\n4. From E, go to D. Add **DE**.\n5. From D, go to F. Add **DF**.\n6. F has no unvisited neighbour; back up to A. Done.',
    '**DFS order:** A, B, C, E, D, F. **DFS tree:** AB, BC, CE, DE, DF.',
    '## Comparing the two',
    [
        '| | BFS | DFS |',
        '| --- | --- | --- |',
        '| Explores | level by level | one deep branch first |',
        '| Uses | a queue | a stack (backtracking) |',
        '| Tree shape | short and bushy | long and thin |',
        '| Sitio tree | AB, AC, BD, CE, DF | AB, BC, CE, DE, DF |',
    ].join('\n'),
    'Both trees have 5 edges and reach all 6 sitios — they just choose different edges. In BFS, each vertex is reached in order of its distance (number of edges) from the root.',
    '> [!WARNING]\n> A **disconnected** graph has no spanning tree: no set of its edges can reach every vertex.',
    '## Watch',
    videoMarkdown('https://www.youtube.com/shorts/umHJzlKFGlU', 'BFS Breadth First Search'),
    '*Video: “BFS Breadth First Search” by @boraxalgo, a YouTube Short suggested in the DepEd LAS.*',
].join('\n\n')

// ── Lesson 4.5 ────────────────────────────────────────────────────────────────────────────────────

const shortestPaths = [
    '## Weighted graphs',
    'On a road map, edges carry numbers: kilometres, minutes or pesos. A **weighted graph** has a number (its **weight**) on each edge. The **length** of a path is the **sum of its edge weights** — not the number of edges.',
    'The **shortest-path problem** has two forms:\n\n- **Single-source:** the shortest path from one vertex to every other vertex.\n- **All-pairs:** the shortest path between every pair of vertices.',
    '## Dijkstra’s algorithm (single-source)',
    'Works when **no weight is negative**.\n\n1. Give the source distance 0 and every other vertex ∞.\n2. **Finalize** the unfinalized vertex with the smallest tentative distance.\n3. For each of its neighbours, if going through it is shorter, lower the neighbour’s distance.\n4. Repeat until every vertex is finalized.',
    '**Example.** Source A. Edges and weights:',
    [
        '| Edge | AB | AC | BC | BD | CD | CE | DE |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        '| Weight | 2 | 5 | 1 | 7 | 3 | 8 | 2 |',
    ].join('\n'),
    [
        '| Step | Finalize | A | B | C | D | E |',
        '| --- | --- | --- | --- | --- | --- | --- |',
        '| Start | — | 0 | ∞ | ∞ | ∞ | ∞ |',
        '| 1 | A (0) | **0** | 2 | 5 | ∞ | ∞ |',
        '| 2 | B (2) | | **2** | min(5, 2 + 1) = 3 | 2 + 7 = 9 | ∞ |',
        '| 3 | C (3) | | | **3** | min(9, 3 + 3) = 6 | 3 + 8 = 11 |',
        '| 4 | D (6) | | | | **6** | min(11, 6 + 2) = 8 |',
        '| 5 | E (8) | | | | | **8** |',
    ].join('\n'),
    '**Shortest distances from A:** B = 2, C = 3, D = 6, E = 8. The shortest-path tree uses AB, BC, CD, DE.',
    '> [!TIP]\n> The direct edge A–C weighs 5, but A → B → C costs only 3. The shortest path is not always the one with the fewest edges.',
    '## Floyd-Warshall algorithm (all pairs)',
    'Works with negative weights too, as long as there is **no negative cycle**.\n\n1. Write the **distance matrix**: 0 on the diagonal, the edge weight where an edge exists, ∞ where none does.\n2. For each vertex k in turn, check every pair i, j: is i → k → j shorter than the current entry? If so, replace it.\n3. After every vertex has served as k, the matrix holds every shortest distance.',
    '**Example.** A four-vertex loop: AB = 3, BC = 1, CD = 2, AD = 7.',
    '**Initial matrix**',
    [
        '| | A | B | C | D |',
        '| --- | --- | --- | --- | --- |',
        '| A | 0 | 3 | ∞ | 7 |',
        '| B | 3 | 0 | 1 | ∞ |',
        '| C | ∞ | 1 | 0 | 2 |',
        '| D | 7 | ∞ | 2 | 0 |',
    ].join('\n'),
    '- Through A: B → D becomes 3 + 7 = 10.\n- Through B: A → C becomes 3 + 1 = 4.\n- Through C: A → D becomes 4 + 2 = 6; B → D becomes 1 + 2 = 3.\n- Through D: nothing improves.',
    '**Final matrix**',
    [
        '| | A | B | C | D |',
        '| --- | --- | --- | --- | --- |',
        '| A | 0 | 3 | 4 | 6 |',
        '| B | 3 | 0 | 1 | 3 |',
        '| C | 4 | 1 | 0 | 2 |',
        '| D | 6 | 3 | 2 | 0 |',
    ].join('\n'),
    '> [!NOTE]\n> The matrix stores distances only. To recover the actual route, keep a companion “next vertex” table while updating, then follow it from the start.',
    '## Comparing the two',
    [
        '| | Dijkstra | Floyd-Warshall |',
        '| --- | --- | --- |',
        '| Finds | one source to all | every pair |',
        '| Edge weights | non-negative only | general, no negative cycle |',
        '| Best when | one starting point | all pairs needed often |',
        '| Output | a distance list | a distance matrix |',
    ].join('\n'),
    'If you need only one starting point, a single Dijkstra run is lighter. A transit app that answers “how far from station X to station Y?” many times can run Floyd-Warshall once and just look up the matrix.',
    '## Watch',
    videoMarkdown('https://www.youtube.com/shorts/8kucL88Ci8E', 'Dijkstra’s Algorithm in 60 Seconds'),
    '*Video: “Dijkstra’s Algorithm in 60 Seconds” by Web Dev Simplified, a YouTube Short suggested in the DepEd LAS.*',
].join('\n\n')

export const unit4: CourseSeedModule = {
    title: 'Unit 4: Networks and Graphs',
    description:
        'Model networks as graphs, then plan routes with Euler and Hamilton, build spanning trees with BFS and DFS, and find shortest paths with Dijkstra and Floyd-Warshall.',
    activities: [
        // ── 4.1 ──
        {
            key: 'u4-l1',
            kind: 'lesson',
            title: 'Fundamental concepts of graph theory',
            summary: 'Vertices, edges, degree, adjacency and the main types of graphs, with real networks.',
            body: graphBasics,
            objectives: [OBJ.graphDef, OBJ.degree, OBJ.types, OBJ.model],
            difficulty: 1,
            estimatedMinutes: 20,
        },
        {
            key: 'u4-q1',
            kind: 'quiz',
            title: 'Quiz: Graph basics',
            summary: 'Vertices, degrees, adjacency and graph types.',
            objectives: [OBJ.graphDef, OBJ.degree, OBJ.types, OBJ.model],
            difficulty: 1,
            estimatedMinutes: 15,
            requires: ['u4-l1'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'In the notation G = (V, E), the set V is the set of:',
                    objective: OBJ.graphDef,
                    options: [
                        { label: 'edges' },
                        { label: 'arcs' },
                        { label: 'vertices', correct: true },
                        { label: 'regions' },
                    ],
                    explanation: 'V stands for vertices (the points); E stands for edges (the connections).',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A graph has edge set E = {AB, AC, AD, BC}. What is the degree of vertex A?',
                    objective: OBJ.degree,
                    options: [{ label: '1' }, { label: '2' }, { label: '3', correct: true }, { label: '4' }],
                    explanation: 'A appears in AB, AC and AD — three edges touch it, so deg(A) = 3.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Using the same graph, E = {AB, AC, AD, BC}, which vertices are adjacent to C?',
                    objective: OBJ.degree,
                    options: [
                        { label: 'A only' },
                        { label: 'A and B', correct: true },
                        { label: 'B and D' },
                        { label: 'A, B and D' },
                    ],
                    explanation:
                        'The edges touching C are AC and BC, so C is adjacent to A and B. There is no CD edge.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Every edge joins a vertex in group X to a vertex in group Y, and no edge joins two vertices in the same group. The graph is:',
                    objective: OBJ.types,
                    options: [
                        { label: 'bipartite', correct: true },
                        { label: 'complete' },
                        { label: 'regular' },
                        { label: 'a cycle' },
                    ],
                    explanation:
                        'Splitting the vertices into two groups with edges only between the groups is the definition of bipartite.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A city map has two-way roads and one-way streets together. As a graph it is best called:',
                    objective: OBJ.model,
                    options: [
                        { label: 'simple' },
                        { label: 'complete' },
                        { label: 'mixed', correct: true },
                        { label: 'regular' },
                    ],
                    explanation:
                        'Two-way roads are undirected edges and one-way streets are arcs; a graph with both is mixed.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'In a directed graph, the number of arcs pointing INTO a vertex is its:',
                    objective: OBJ.degree,
                    options: [
                        { label: 'out-degree' },
                        { label: 'in-degree', correct: true },
                        { label: 'total degree' },
                        { label: 'order' },
                    ],
                    explanation:
                        'Arcs arriving at a vertex count toward its in-degree; arcs leaving it count toward its out-degree.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'A simple graph has vertices J, K, L, M with degrees J = 3, K = 3, L = 2, M = 2. How many edges does it have? (Just the number.)',
                    objective: OBJ.graphDef,
                    acceptedAnswers: ['5', '5 edges', 'five'],
                    explanation:
                        'The degrees add up to 3 + 3 + 2 + 2 = 10 = 2 × (edges), so there are 5 edges. (They are JK, JL, JM, KL, KM.)',
                },
                {
                    kind: 'true_false',
                    prompt: 'The sum of all vertex degrees in a graph equals the number of edges.',
                    objective: OBJ.degree,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation: 'Each edge has two ends, so the sum of the degrees is TWICE the number of edges.',
                },
                {
                    kind: 'true_false',
                    prompt: 'A tree with seven vertices has seven edges.',
                    objective: OBJ.types,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation:
                        'A tree on n vertices has n − 1 edges, so 7 vertices give 6 edges. A seventh edge would create a cycle.',
                },
                {
                    kind: 'true_false',
                    prompt: 'AirLink flies M–C (two-way), C–D (two-way), D→M and M→B (one-way). Puerto Princesa (P) has no flight. This network is connected.',
                    objective: OBJ.model,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation:
                        'P has degree 0, so no route reaches it. One isolated vertex makes the graph disconnected.',
                },
            ],
        },
        // ── 4.2 ──
        {
            key: 'u4-l2',
            kind: 'lesson',
            title: 'Eulerian paths and circuits',
            summary: 'Königsberg’s bridges, Euler’s theorem and Fleury’s procedure: covering every edge exactly once.',
            body: eulerian,
            objectives: [OBJ.eulerDef, OBJ.eulerThm, OBJ.eulerTrace],
            difficulty: 2,
            estimatedMinutes: 20,
            requires: ['u4-q1'],
        },
        {
            key: 'u4-q2',
            kind: 'quiz',
            title: 'Quiz: Eulerian paths and circuits',
            summary: 'Count the odd vertices, classify the graph, trace the route.',
            objectives: [OBJ.eulerDef, OBJ.eulerThm, OBJ.eulerTrace],
            difficulty: 2,
            estimatedMinutes: 15,
            requires: ['u4-l2'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'An Eulerian path uses every ____ of a connected graph exactly once.',
                    objective: OBJ.eulerDef,
                    options: [
                        { label: 'vertex' },
                        { label: 'edge', correct: true },
                        { label: 'region' },
                        { label: 'label' },
                    ],
                    explanation:
                        'Eulerian routes are about edges. (Visiting every vertex once is the Hamiltonian idea.)',
                },
                {
                    kind: 'single_choice',
                    prompt: 'An Eulerian circuit differs from an Eulerian path because it:',
                    objective: OBJ.eulerDef,
                    options: [
                        { label: 'returns to its starting vertex', correct: true },
                        { label: 'skips some edges' },
                        { label: 'visits every vertex exactly once' },
                        { label: 'uses some edges twice' },
                    ],
                    explanation: 'Both use every edge exactly once; a circuit also ends where it began.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A connected graph has neither an Eulerian path nor an Eulerian circuit when:',
                    objective: OBJ.eulerThm,
                    options: [
                        { label: 'exactly two vertices are odd' },
                        { label: 'all vertices are even' },
                        { label: 'more than two vertices are odd', correct: true },
                        { label: 'it contains a cycle' },
                    ],
                    explanation: 'Euler’s theorem: 0 odd vertices → circuit, 2 → path, 4 or more → neither.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A connected graph has vertex degrees 2, 2, 4, 4. The graph has:',
                    objective: OBJ.eulerThm,
                    options: [
                        { label: 'an Eulerian path but not a circuit' },
                        { label: 'an Eulerian circuit', correct: true },
                        { label: 'neither' },
                        { label: 'only a Hamiltonian path' },
                    ],
                    explanation: 'All four degrees are even (0 odd vertices), so there is an Eulerian circuit.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A connected graph has vertex degrees 2, 3, 3, 4. The graph has:',
                    objective: OBJ.eulerThm,
                    options: [
                        { label: 'an Eulerian path that is not a circuit', correct: true },
                        { label: 'an Eulerian circuit' },
                        { label: 'neither' },
                        { label: 'an Eulerian circuit, because the total degree is even' },
                    ],
                    explanation:
                        'Exactly two vertices (the two 3s) are odd, so an Eulerian path exists, running between them, but no circuit.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A connected graph has degrees P = 2, Q = 4, R = 2, S = 3, T = 3. Where must an Eulerian path start and end?',
                    objective: OBJ.eulerTrace,
                    options: [
                        { label: 'At P and R' },
                        { label: 'At S and T', correct: true },
                        { label: 'Anywhere, and it returns to the start' },
                        { label: 'No Eulerian path exists' },
                    ],
                    explanation:
                        'The odd vertices are S and T (two of them), so the path starts at one and ends at the other.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'A graph has edges AB, AC, AD, BC, CD, CE, DE. How many vertices have odd degree? (Just the number.)',
                    objective: OBJ.eulerThm,
                    acceptedAnswers: ['2', 'two'],
                    explanation:
                        'Degrees: A 3, B 2, C 4, D 3, E 2. Only A and D are odd — 2 odd vertices, so an Eulerian path runs from A to D (e.g. A → B → C → A → D → C → E → D).',
                },
                {
                    kind: 'true_false',
                    prompt: 'An Eulerian path may pass through the same vertex more than once.',
                    objective: OBJ.eulerDef,
                    options: [{ label: 'True', correct: true }, { label: 'False' }],
                    explanation:
                        'Only edges are limited to once; vertices can be revisited (e.g. E in A → E → D → F → E → …).',
                },
                {
                    kind: 'true_false',
                    prompt: 'A connected graph with exactly one odd-degree vertex can still have an Eulerian path.',
                    objective: OBJ.eulerThm,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation:
                        'Such a graph can’t exist: the degrees add up to an even number, so odd vertices always come in pairs.',
                },
                {
                    kind: 'true_false',
                    prompt: 'The seven bridges of Königsberg can be walked so that each bridge is crossed exactly once.',
                    objective: OBJ.eulerThm,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation:
                        'The four land areas have degrees 5, 3, 3, 3 — four odd vertices, so no Eulerian path exists.',
                },
            ],
        },
        // ── 4.3 ──
        {
            key: 'u4-l3',
            kind: 'lesson',
            title: 'Hamiltonian paths and circuits',
            summary: 'Visiting every vertex exactly once, Dirac’s condition, and telling Euler and Hamilton apart.',
            body: hamiltonian,
            objectives: [OBJ.hamDef, OBJ.dirac, OBJ.hamTrace, OBJ.eulerVsHam],
            difficulty: 3,
            estimatedMinutes: 20,
            requires: ['u4-q2'],
        },
        {
            key: 'u4-q3',
            kind: 'quiz',
            title: 'Quiz: Hamiltonian paths and circuits',
            summary: 'Dirac’s condition, tracing routes, and Euler versus Hamilton.',
            objectives: [OBJ.hamDef, OBJ.dirac, OBJ.hamTrace, OBJ.eulerVsHam],
            difficulty: 3,
            estimatedMinutes: 15,
            requires: ['u4-l3'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'A Hamiltonian path is best described as a route that:',
                    objective: OBJ.hamDef,
                    options: [
                        { label: 'uses every edge of a graph exactly once' },
                        { label: 'visits every vertex of a graph exactly once', correct: true },
                        { label: 'uses every edge and returns to the start' },
                        { label: 'visits only the vertices of odd degree' },
                    ],
                    explanation: 'Hamiltonian = every vertex once. Every edge once is Eulerian.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Dirac’s condition guarantees a Hamiltonian circuit in a simple graph with n ≥ 3 vertices when:',
                    objective: OBJ.dirac,
                    options: [
                        { label: 'the graph has an even number of edges' },
                        { label: 'every vertex has degree at least n/2', correct: true },
                        { label: 'exactly two vertices have odd degree' },
                        { label: 'the graph is a tree' },
                    ],
                    explanation: 'Dirac’s theorem: minimum degree ≥ n/2 is enough for a Hamiltonian circuit.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A simple graph has 6 vertices. By Dirac’s condition, a Hamiltonian circuit is guaranteed if every vertex has degree at least:',
                    objective: OBJ.dirac,
                    options: [{ label: '2' }, { label: '3', correct: true }, { label: '4' }, { label: '6' }],
                    explanation: 'n/2 = 6/2 = 3.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Which task is a Hamiltonian problem rather than an Eulerian one?',
                    objective: OBJ.eulerVsHam,
                    options: [
                        { label: 'A mail carrier wants to walk every street exactly once.' },
                        { label: 'A tour guide wants to visit every landmark exactly once.', correct: true },
                        { label: 'A street sweeper wants to clean every road exactly once.' },
                        { label: 'An inspector wants to cross every bridge exactly once.' },
                    ],
                    explanation:
                        'Landmarks are vertices (Hamiltonian); streets, roads and bridges are edges (Eulerian).',
                },
                {
                    kind: 'single_choice',
                    prompt: 'In a graph, vertex F is joined to only one other vertex. A Hamiltonian circuit:',
                    objective: OBJ.hamTrace,
                    options: [
                        { label: 'must pass through F twice' },
                        {
                            label: 'is impossible, because a circuit needs two different edges at every vertex',
                            correct: true,
                        },
                        { label: 'is still guaranteed by Dirac’s condition' },
                        { label: 'exists only if F has degree 0' },
                    ],
                    explanation:
                        'A circuit arrives at and leaves every vertex along different edges, so each vertex needs degree ≥ 2.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Graph G has vertices A–E and edges AB, BC, CD, DE, EA, CE. Which statement is true?',
                    objective: OBJ.dirac,
                    options: [
                        { label: 'Dirac’s condition holds, so a Hamiltonian circuit exists.' },
                        {
                            label: 'Dirac’s condition fails, yet A → B → C → D → E → A is a Hamiltonian circuit.',
                            correct: true,
                        },
                        { label: 'Dirac’s condition fails, so there is no Hamiltonian circuit.' },
                        { label: 'The graph has no Hamiltonian path.' },
                    ],
                    explanation:
                        'Degrees: A 2, B 2, C 3, D 2, E 3. n/2 = 2.5, and A, B, D are below it, so Dirac doesn’t apply. But AB, BC, CD, DE, EA are all edges, so the circuit exists — Dirac is sufficient, not necessary.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'A graph has edges AB, AD, BC, BD, CD, DE. Write a Hamiltonian path that starts at E (e.g. "E, D, …").',
                    objective: OBJ.hamTrace,
                    acceptedAnswers: [
                        'E, D, A, B, C',
                        'E D A B C',
                        'EDABC',
                        'E-D-A-B-C',
                        'E → D → A → B → C',
                        'E, D, C, B, A',
                        'E D C B A',
                        'EDCBA',
                        'E-D-C-B-A',
                        'E → D → C → B → A',
                    ],
                    explanation:
                        'E’s only neighbour is D, so start E → D. Then D → A → B → C (edges DA, AB, BC) or D → C → B → A (edges DC, CB, BA). E has degree 1, so no Hamiltonian circuit exists.',
                },
                {
                    kind: 'true_false',
                    prompt: 'Every graph that has a Hamiltonian path also has a Hamiltonian circuit.',
                    objective: OBJ.hamDef,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation:
                        'The path A–B–C (a line) has the Hamiltonian path A → B → C but no circuit: there is no edge back from C to A.',
                },
                {
                    kind: 'true_false',
                    prompt: 'Dirac’s condition is both necessary and sufficient for a Hamiltonian circuit.',
                    objective: OBJ.dirac,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation:
                        'It is only sufficient. A hexagon has degree 2 < 6/2 = 3 at every vertex, yet it is itself a Hamiltonian circuit.',
                },
                {
                    kind: 'true_false',
                    prompt: 'A Hamiltonian circuit on n vertices uses exactly n edges.',
                    objective: OBJ.hamDef,
                    options: [{ label: 'True', correct: true }, { label: 'False' }],
                    explanation:
                        'It visits n vertices and returns to the start, using one edge per step: n steps, n edges.',
                },
            ],
        },
        // ── 4.4 ──
        {
            key: 'u4-l4',
            kind: 'lesson',
            title: 'Spanning trees with BFS and DFS',
            summary: 'Trees, spanning trees, and building them level by level (BFS) or deep first (DFS).',
            body: spanningTrees,
            objectives: [OBJ.tree, OBJ.bfs, OBJ.dfs],
            difficulty: 3,
            estimatedMinutes: 25,
            requires: ['u4-q3'],
        },
        {
            key: 'u4-q4',
            kind: 'quiz',
            title: 'Quiz: Spanning trees',
            summary: 'Tree facts, BFS and DFS traces. Visit neighbours in alphabetical order.',
            objectives: [OBJ.tree, OBJ.bfs, OBJ.dfs],
            difficulty: 3,
            estimatedMinutes: 20,
            requires: ['u4-l4'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'A tree on 9 vertices has how many edges?',
                    objective: OBJ.tree,
                    options: [{ label: '8', correct: true }, { label: '9' }, { label: '10' }, { label: '16' }],
                    explanation: 'A tree on n vertices has n − 1 edges: 9 − 1 = 8.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Which statement describes a tree?',
                    objective: OBJ.tree,
                    options: [
                        { label: 'Any graph with no cycle' },
                        { label: 'A connected graph with exactly one cycle' },
                        { label: 'A connected graph with no cycle', correct: true },
                        { label: 'Any graph that has n − 1 edges' },
                    ],
                    explanation:
                        'A tree must be connected AND have no cycle. A graph with no cycle that isn’t connected is a forest.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'In a BFS spanning tree from a root, each vertex is first reached:',
                    objective: OBJ.bfs,
                    options: [
                        { label: 'by going as deep as possible first' },
                        { label: 'in order of its distance in edges from the root', correct: true },
                        { label: 'in reverse alphabetical order' },
                        { label: 'only after every other vertex' },
                    ],
                    explanation:
                        'BFS works level by level: first the root’s neighbours (distance 1), then their neighbours (distance 2), and so on.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'DFS from a root explores by:',
                    objective: OBJ.dfs,
                    options: [
                        { label: 'finishing each level before starting the next' },
                        { label: 'choosing the closest unvisited vertex anywhere in the graph' },
                        { label: 'going as deep as possible, then backing up when stuck', correct: true },
                        { label: 'removing edges that form cycles first' },
                    ],
                    explanation: 'Depth-first search follows one branch as far as it goes, then backtracks.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'A network has edges AB, AC, BD, CD, CE. Run BFS from A (neighbours in alphabetical order). Write the visit order, e.g. "A, B, …".',
                    objective: OBJ.bfs,
                    acceptedAnswers: [
                        'A, B, C, D, E',
                        'A B C D E',
                        'ABCDE',
                        'A-B-C-D-E',
                        'A → B → C → D → E',
                        'A,B,C,D,E',
                    ],
                    explanation:
                        'Queue A → visit B, C (edges AB, AC). Take B → visit D (BD). Take C → visit E (CE). Order A, B, C, D, E; BFS tree AB, AC, BD, CE.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'For the same network (AB, AC, BD, CD, CE), run DFS from A. Write the visit order.',
                    objective: OBJ.dfs,
                    acceptedAnswers: [
                        'A, B, D, C, E',
                        'A B D C E',
                        'ABDCE',
                        'A-B-D-C-E',
                        'A → B → D → C → E',
                        'A,B,D,C,E',
                    ],
                    explanation:
                        'A → B (first neighbour) → D (B’s only new neighbour) → C (D’s new neighbour) → E. Order A, B, D, C, E; DFS tree AB, BD, CD, CE. Edge AC is in the BFS tree but not the DFS tree.',
                },
                {
                    kind: 'true_false',
                    prompt: 'A spanning tree of a connected graph on 7 vertices has 6 edges.',
                    objective: OBJ.tree,
                    options: [{ label: 'True', correct: true }, { label: 'False' }],
                    explanation: 'Every tree on n vertices has n − 1 edges: 7 − 1 = 6.',
                },
                {
                    kind: 'true_false',
                    prompt: 'Adding a non-tree edge of the graph to a spanning tree creates a cycle.',
                    objective: OBJ.tree,
                    options: [{ label: 'True', correct: true }, { label: 'False' }],
                    explanation: 'Its two ends are already connected through the tree, so the new edge closes a loop.',
                },
                {
                    kind: 'true_false',
                    prompt: 'BFS and DFS from the same root always produce the same spanning tree.',
                    objective: OBJ.dfs,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation: 'In the sitio network, BFS gives AB, AC, BD, CE, DF but DFS gives AB, BC, CE, DE, DF.',
                },
                {
                    kind: 'true_false',
                    prompt: 'A disconnected graph has a spanning tree.',
                    objective: OBJ.tree,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation:
                        'A spanning tree must be connected and reach every vertex — impossible if the graph is in separate pieces.',
                },
            ],
        },
        // ── 4.5 ──
        {
            key: 'u4-l5',
            kind: 'lesson',
            title: 'Shortest paths: Dijkstra and Floyd-Warshall',
            summary: 'Weighted graphs and two algorithms for the cheapest route — one source, or every pair.',
            body: shortestPaths,
            objectives: [OBJ.weighted, OBJ.dijkstra, OBJ.floyd, OBJ.compare],
            difficulty: 4,
            estimatedMinutes: 30,
            requires: ['u4-q4'],
        },
        {
            key: 'u4-q5',
            kind: 'quiz',
            title: 'Quiz: Shortest paths',
            summary: 'Path lengths, Dijkstra traces and the Floyd-Warshall matrix.',
            objectives: [OBJ.weighted, OBJ.dijkstra, OBJ.floyd, OBJ.compare],
            difficulty: 4,
            estimatedMinutes: 20,
            requires: ['u4-l5'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'The length (or weight) of a path in a weighted graph is:',
                    objective: OBJ.weighted,
                    options: [
                        { label: 'the number of edges it uses' },
                        { label: 'the sum of its edge weights', correct: true },
                        { label: 'its largest edge weight' },
                        { label: 'the number of vertices it visits' },
                    ],
                    explanation: 'Add up the weights of the edges along the path.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Dijkstra’s algorithm requires that:',
                    objective: OBJ.dijkstra,
                    options: [
                        { label: 'the graph is a tree' },
                        { label: 'all weights are equal' },
                        { label: 'the graph has no cycle' },
                        { label: 'every edge weight is non-negative', correct: true },
                    ],
                    explanation:
                        'Dijkstra finalizes the closest vertex for good; a negative edge found later could undercut it.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'In Dijkstra’s algorithm, the next vertex to finalize is:',
                    objective: OBJ.dijkstra,
                    options: [
                        { label: 'the alphabetically first vertex' },
                        { label: 'the unfinalized vertex with the smallest tentative distance', correct: true },
                        { label: 'the vertex with the most neighbours' },
                        { label: 'any vertex not yet visited' },
                    ],
                    explanation: 'Always finalize the smallest tentative distance; ties may be broken alphabetically.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A transit app must answer the shortest distance between any two stations, many times a day. The better choice is to:',
                    objective: OBJ.compare,
                    options: [
                        { label: 'run Dijkstra from scratch for every request' },
                        { label: 'run Floyd-Warshall once and look up the matrix', correct: true },
                        { label: 'use Floyd-Warshall only if some weight is negative' },
                        { label: 'use Dijkstra because it is always faster' },
                    ],
                    explanation: 'Floyd-Warshall computes every pair once; after that each answer is a table lookup.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'Edges: AB = 2, AC = 6, BC = 3, BD = 5, CD = 1. Using Dijkstra from A, what is the shortest distance from A to D? (Just the number.)',
                    objective: OBJ.dijkstra,
                    acceptedAnswers: ['6'],
                    explanation:
                        'Finalize A (0): B = 2, C = 6. Finalize B (2): C = min(6, 2 + 3) = 5, D = 2 + 5 = 7. Finalize C (5): D = min(7, 5 + 1) = 6. Finalize D (6). Path A → B → C → D.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'For the same graph (AB = 2, AC = 6, BC = 3, BD = 5, CD = 1), give the C-row of the Floyd-Warshall matrix: the shortest distances from C to A, B, C, D, in that order.',
                    objective: OBJ.floyd,
                    acceptedAnswers: ['5, 3, 0, 1', '5 3 0 1', '5,3,0,1', '5; 3; 0; 1'],
                    explanation:
                        'C → A: C → B → A = 3 + 2 = 5 (beats the direct 6). C → B = 3. C → C = 0. C → D = 1. Row: 5, 3, 0, 1.',
                },
                {
                    kind: 'true_false',
                    prompt: 'The shortest path always uses the fewest edges.',
                    objective: OBJ.weighted,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation:
                        'With AB = 2, BC = 1 and AC = 5, the two-edge route A → B → C (3) beats the one-edge route A → C (5).',
                },
                {
                    kind: 'true_false',
                    prompt: 'Floyd-Warshall finds the shortest distance between every pair of vertices.',
                    objective: OBJ.floyd,
                    options: [{ label: 'True', correct: true }, { label: 'False' }],
                    explanation: 'It is the all-pairs algorithm: its output is a full distance matrix.',
                },
                {
                    kind: 'true_false',
                    prompt: 'Dijkstra’s algorithm can be used when some edge weights are negative.',
                    objective: OBJ.compare,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation:
                        'Dijkstra needs non-negative weights. Floyd-Warshall handles negative weights as long as there is no negative cycle.',
                },
            ],
        },
        // ── Boss ──
        {
            key: 'u4-boss',
            kind: 'boss_battle',
            title: 'Boss battle: The Labyrinth Warden',
            summary: 'Three halls, one warden. Map the maze, find every route, and take the shortest way out.',
            objectives: [OBJ.eulerThm, OBJ.hamTrace, OBJ.bfs, OBJ.dfs, OBJ.dijkstra, OBJ.compare],
            difficulty: 4,
            estimatedMinutes: 20,
            requires: ['u4-q5'],
            boss: {
                name: 'The Labyrinth Warden',
                phases: ['The Hall of Bridges', 'The Hall of Trails', 'The Weighted Gate'],
            },
            questions: [
                {
                    kind: 'single_choice',
                    phase: 1,
                    prompt: 'Five barangays P, Q, R, S, T are joined by roads PQ, QR, RS, ST, TP and PR. A street sweeper wants to clean every road exactly once. What is possible?',
                    objective: OBJ.eulerThm,
                    options: [
                        { label: 'An Eulerian circuit starting anywhere' },
                        { label: 'An Eulerian path starting at P and ending at R (or the reverse)', correct: true },
                        { label: 'An Eulerian path starting at Q and ending at S' },
                        { label: 'Neither a path nor a circuit' },
                    ],
                    explanation:
                        'Degrees: P 3, Q 2, R 3, S 2, T 2. Exactly two odd vertices, P and R, so the path must run between them, e.g. P → Q → R → S → T → P → R.',
                },
                {
                    kind: 'true_false',
                    phase: 1,
                    prompt: 'The complete graph K₅ (5 vertices, every pair joined) has an Eulerian circuit.',
                    objective: OBJ.eulerThm,
                    options: [{ label: 'True', correct: true }, { label: 'False' }],
                    explanation:
                        'Each vertex of K₅ has degree 5 − 1 = 4, which is even, and K₅ is connected — so an Eulerian circuit exists.',
                },
                {
                    kind: 'short_answer',
                    phase: 1,
                    prompt: 'K₄ (4 vertices, every pair joined) has all four vertices of odd degree. What is the fewest number of extra edges (repeated edges between the same two vertices allowed) you must add so it has an Eulerian CIRCUIT? (Just the number.)',
                    objective: OBJ.eulerThm,
                    acceptedAnswers: ['2', 'two'],
                    explanation:
                        'Each new edge fixes two odd vertices. Four odd vertices need 2 new edges (e.g. a second AB and a second CD), making every degree 4.',
                },
                {
                    kind: 'single_choice',
                    phase: 2,
                    prompt: 'A hexagon A–B–C–D–E–F–A has one extra edge AD. Which statement is true?',
                    objective: OBJ.hamTrace,
                    options: [
                        { label: 'Dirac’s condition holds, so a Hamiltonian circuit is guaranteed.' },
                        { label: 'Dirac’s condition fails, so no Hamiltonian circuit exists.' },
                        {
                            label: 'Dirac’s condition fails, but A → B → C → D → E → F → A is a Hamiltonian circuit.',
                            correct: true,
                        },
                        { label: 'The graph has no Hamiltonian path.' },
                    ],
                    explanation:
                        'n = 6, n/2 = 3, but B, C, E, F have degree 2, so Dirac doesn’t apply. The outer hexagon still visits every vertex once and returns.',
                },
                {
                    kind: 'short_answer',
                    phase: 2,
                    prompt: 'A maze has edges AB, AE, BC, BD, CF, DF, EF. Run BFS from A (neighbours in alphabetical order). Write the visit order.',
                    objective: OBJ.bfs,
                    acceptedAnswers: [
                        'A, B, E, C, D, F',
                        'A B E C D F',
                        'ABECDF',
                        'A-B-E-C-D-F',
                        'A → B → E → C → D → F',
                        'A,B,E,C,D,F',
                    ],
                    explanation:
                        'A → B, E (level 1). Take B → C, D. Take E → F. Order A, B, E, C, D, F; tree AB, AE, BC, BD, EF.',
                },
                {
                    kind: 'single_choice',
                    phase: 2,
                    prompt: 'Same maze (AB, AE, BC, BD, CF, DF, EF). Which edges form the DFS tree from A (alphabetical neighbours)?',
                    objective: OBJ.dfs,
                    options: [
                        { label: 'AB, AE, BC, BD, EF' },
                        { label: 'AB, BC, CF, DF, EF', correct: true },
                        { label: 'AB, BD, DF, CF, AE' },
                        { label: 'AE, EF, CF, BC, BD' },
                    ],
                    explanation:
                        'A → B → C → F → D (F’s first new neighbour); D is stuck, back to F → E. Order A, B, C, F, D, E; tree AB, BC, CF, DF, EF.',
                },
                {
                    kind: 'short_answer',
                    phase: 3,
                    prompt: 'Weighted roads: AB = 4, AC = 1, BC = 2, BD = 5, CD = 8, CE = 10, DE = 2, DF = 6, EF = 3. Using Dijkstra from A, what is the shortest distance from A to F? (Just the number.)',
                    objective: OBJ.dijkstra,
                    acceptedAnswers: ['13'],
                    explanation:
                        'Finalize A (0): C = 1, B = 4. C (1): B = 3, D = 9, E = 11. B (3): D = 8. D (8): E = 10, F = 14. E (10): F = 13. Route A → C → B → D → E → F = 1 + 2 + 5 + 2 + 3 = 13.',
                },
                {
                    kind: 'single_choice',
                    phase: 3,
                    prompt: 'A logistics map has one road with a negative weight (a toll refund) but no negative cycle. You need the cheapest cost between every pair of depots. Which algorithm fits?',
                    objective: OBJ.compare,
                    options: [
                        { label: 'Dijkstra’s algorithm, once' },
                        { label: 'Breadth-First Search' },
                        { label: 'Floyd-Warshall', correct: true },
                        { label: 'Fleury’s procedure' },
                    ],
                    explanation:
                        'All pairs plus a negative weight (no negative cycle) is exactly Floyd-Warshall’s job; Dijkstra needs non-negative weights.',
                },
            ],
        },
    ],
}
