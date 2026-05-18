// tests/mapLogicTest.ts
// Run: npx tsx tests/mapLogicTest.ts

function keepConnected(sel: string[], removed: string, adj: Map<string, Set<string>>): string[] {
  const remaining = sel.filter(c => c !== removed)
  const primary = remaining[0]
  if (!primary) return []
  const visited = new Set([primary])
  const q = [primary]
  while (q.length) {
    const cur = q.shift()!
    for (const nb of (adj.get(cur) ?? new Set<string>())) {
      if (remaining.includes(nb) && !visited.has(nb)) { visited.add(nb); q.push(nb) }
    }
  }
  return remaining.filter(c => visited.has(c))
}

function filterConnected(sel: string[], adj: Map<string, Set<string>>): string[] {
  if (sel.length <= 1) return sel
  const primary = sel[0]
  const visited = new Set([primary])
  const q = [primary]
  while (q.length) {
    const cur = q.shift()!
    for (const nb of (adj.get(cur) ?? new Set<string>())) {
      if (sel.includes(nb) && !visited.has(nb)) { visited.add(nb); q.push(nb) }
    }
  }
  return sel.filter(c => visited.has(c))
}

// simulateOnUp mirrors the production onUp handler.
function simulateOnUp(params: {
  sel: string[]; d: { name: string; moved: boolean }
  snap: { name: string } | null; adj: Map<string, Set<string>>; elapsed: number
}): string[] {
  const { sel, d, snap, adj, elapsed } = params
  if (!d.moved && elapsed < 1000) {
    if (sel.includes(d.name)) return keepConnected(sel, d.name, adj)
    if (sel.length === 0) return [d.name]
    return sel
  }
  if (d.moved && snap) {
    const snapValid = sel.length === 0 || sel.includes(d.name) || sel.includes(snap.name)
    if (!snapValid) return sel
    const rawSel = [...new Set([...sel, d.name, snap.name])]
    return filterConnected(rawSel, adj)
  }
  if (d.moved) return sel
  return sel
}

function makeAdj(pairs: [string, string][]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>()
  for (const [a, b] of pairs) {
    if (!adj.has(a)) adj.set(a, new Set()); if (!adj.has(b)) adj.set(b, new Set())
    adj.get(a)!.add(b); adj.get(b)!.add(a)
  }
  return adj
}

const chain  = makeAdj([['A','B'],['B','C'],['C','D']])
const star   = makeAdj([['B','A'],['B','C'],['B','D']])
const island = makeAdj([['A','B'],['C','D']])
const square = makeAdj([['A','B'],['B','C'],['C','D'],['D','A']])

let passed = 0, failed = 0
function arrEq(a: string[], b: string[]) { return a.length === b.length && a.every((v, i) => v === b[i]) }
function test(desc: string, actual: string[], expected: string[]) {
  if (arrEq(actual, expected)) { console.log(`  PASS  ${desc}`); passed++ }
  else { console.log(`  FAIL  ${desc}\n        expected: [${expected.join(', ')}]\n        actual:   [${actual.join(', ')}]`); failed++ }
}

// ── keepConnected ─────────────────────────────────────────────────────────────
console.log('\n== keepConnected ==')
test('remove bridge B from [A,B,C,D] chain → [A]',
  keepConnected(['A','B','C','D'], 'B', chain), ['A'])
test('remove tail D from [A,B,C,D] → [A,B,C]',
  keepConnected(['A','B','C','D'], 'D', chain), ['A','B','C'])
test('remove primary A → [B,C,D]',
  keepConnected(['A','B','C','D'], 'A', chain), ['B','C','D'])
test('remove only county → []',
  keepConnected(['A'], 'A', chain), [])
test('remove Z not in sel → unchanged [A,B,C]',
  keepConnected(['A','B','C'], 'Z', chain), ['A','B','C'])
test('star: remove center B (primary=A) → [A]',
  keepConnected(['A','B','C','D'], 'B', star), ['A'])

// ── filterConnected ───────────────────────────────────────────────────────────
console.log('\n== filterConnected ==')
test('chain fully connected → unchanged',
  filterConnected(['A','B','C','D'], chain), ['A','B','C','D'])
test('island [A,B,C,D] primary A → [A,B]',
  filterConnected(['A','B','C','D'], island), ['A','B'])
test('square fully connected → unchanged',
  filterConnected(['A','B','C','D'], square), ['A','B','C','D'])
test('singleton → [A]',
  filterConnected(['A'], chain), ['A'])
test('empty → []',
  filterConnected([], chain), [])

// ── simulateOnUp ──────────────────────────────────────────────────────────────
console.log('\n== simulateOnUp ==')
// click: unselected when sel active → no-op
test('click unselected D when sel=[A,B,C] → no-op [A,B,C]',
  simulateOnUp({ sel:['A','B','C'], d:{name:'D',moved:false}, snap:null, adj:chain, elapsed:200 }), ['A','B','C'])
test('click unselected D when sel=[B] → no-op [B]',
  simulateOnUp({ sel:['B'], d:{name:'D',moved:false}, snap:null, adj:chain, elapsed:100 }), ['B'])
// click: empty sel → select
test('click unselected D when sel=[] → [D]',
  simulateOnUp({ sel:[], d:{name:'D',moved:false}, snap:null, adj:chain, elapsed:200 }), ['D'])
// click: group county → remove (BFS from remaining[0])
test('click primary A in [A,B,C] → [B,C]',
  simulateOnUp({ sel:['A','B','C'], d:{name:'A',moved:false}, snap:null, adj:chain, elapsed:200 }), ['B','C'])
test('click non-primary C in [A,B,C,D] → [A,B]',
  simulateOnUp({ sel:['A','B','C','D'], d:{name:'C',moved:false}, snap:null, adj:chain, elapsed:200 }), ['A','B'])
test('click primary A in [A] (sole member) → []',
  simulateOnUp({ sel:['A'], d:{name:'A',moved:false}, snap:null, adj:chain, elapsed:200 }), [])
// hold → no-op
test('hold 1500ms no move → unchanged [A,B,C]',
  simulateOnUp({ sel:['A','B','C'], d:{name:'B',moved:false}, snap:null, adj:chain, elapsed:1500 }), ['A','B','C'])
// snap: empty sel
test('empty-sel snap: dragged C is primary → [C,D]',
  simulateOnUp({ sel:[], d:{name:'C',moved:true}, snap:{name:'D'}, adj:chain, elapsed:300 }), ['C','D'])
test('empty-sel snap reversed: dragged D is primary → [D,C]',
  simulateOnUp({ sel:[], d:{name:'D',moved:true}, snap:{name:'C'}, adj:chain, elapsed:300 }), ['D','C'])
test('empty-sel snap star: dragged A snaps B → [A,B]',
  simulateOnUp({ sel:[], d:{name:'A',moved:true}, snap:{name:'B'}, adj:star, elapsed:300 }), ['A','B'])
// snap: extend existing group (dragged is in sel → snap to adjacent unselected)
test('group drag B (sel=[A,B]) snaps C → [A,B,C]',
  simulateOnUp({ sel:['A','B'], d:{name:'B',moved:true}, snap:{name:'C'}, adj:chain, elapsed:300 }), ['A','B','C'])
// snap: unselected drag snaps to sel member (valid extension)
test('unselected C snaps to selected B (sel=[A,B]) → [A,B,C]',
  simulateOnUp({ sel:['A','B'], d:{name:'C',moved:true}, snap:{name:'B'}, adj:chain, elapsed:300 }), ['A','B','C'])
// snap: unselected → unselected when sel active → blocked
test('snap blocked: sel=[A,B], drag C snaps D (both unselected) → [A,B]',
  simulateOnUp({ sel:['A','B'], d:{name:'C',moved:true}, snap:{name:'D'}, adj:chain, elapsed:500 }), ['A','B'])
test('snap blocked: sel=[A], drag C snaps D (island) → [A]',
  simulateOnUp({ sel:['A'], d:{name:'C',moved:true}, snap:{name:'D'}, adj:island, elapsed:500 }), ['A'])
// drag away: selection unchanged regardless of who dragged
test('empty-sel drag away → [] (no snap = no group formed)',
  simulateOnUp({ sel:[], d:{name:'C',moved:true}, snap:null, adj:chain, elapsed:300 }), [])
test('group drag A away (no snap) → sel unchanged [A,B,C,D]',
  simulateOnUp({ sel:['A','B','C','D'], d:{name:'A',moved:true}, snap:null, adj:chain, elapsed:300 }), ['A','B','C','D'])
test('group drag B away (no snap) → sel unchanged [A,B,C,D]',
  simulateOnUp({ sel:['A','B','C','D'], d:{name:'B',moved:true}, snap:null, adj:chain, elapsed:300 }), ['A','B','C','D'])
test('group drag C away (no snap) → sel unchanged [A,B,C,D]',
  simulateOnUp({ sel:['A','B','C','D'], d:{name:'C',moved:true}, snap:null, adj:chain, elapsed:500 }), ['A','B','C','D'])
test('unselected drag away (no snap) → sel unchanged [A,B]',
  simulateOnUp({ sel:['A','B'], d:{name:'D',moved:true}, snap:null, adj:chain, elapsed:300 }), ['A','B'])

console.log(`\n${'─'.repeat(50)}\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests`)
if (failed > 0) process.exit(1)
