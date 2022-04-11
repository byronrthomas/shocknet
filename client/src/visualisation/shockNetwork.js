import { edgeToDestRegion, edgeToSourceRegion, nodeToUserTextComponents } from "../graph_model/formatting";
import { makeGraph } from "./forceGraph"


export function initShockNetwork(targetElem) {
    const state = {
        targetElem
    };
    return state;
}

function clearChildren(tgt) {
    const allChildren = [...tgt.childNodes];
    for (const child of allChildren) {
        tgt.removeChild(child);
    }
}

function makeNodeForDestination(edge) {
    const toReg = edgeToDestRegion(edge);
    return {id: edge.to_id, group: toReg, v_type: edge.to_type}
}

function makeNodeForSource(edge) {
    const fromReg = edgeToSourceRegion(edge);
    return {id: edge.from_id, group: fromReg, v_type: edge.from_type}
}

function annotateShockPaths(paths) {
    for (const path of paths) {
        for (const edge of path) {
            edge.source = makeNodeForSource(edge);
            edge.target = makeNodeForDestination(edge);
        }
    }
}

function preprocessShockData(edges) {
    const nodes = [];
    const links = [];
    const seenNodes = new Set();
    for (const e of edges) {
        console.log('Preprocessing', e);
        if (!seenNodes.has(e.from_id)) {
            seenNodes.add(e.from_id);
            nodes.push(makeNodeForSource(e));
        }
        if (!seenNodes.has(e.to_id)) {
            seenNodes.add(e.to_id);
            nodes.push(makeNodeForDestination(e));
        }
        links.push({source: e.from_id, target: e.to_id});
    }
    return {nodes, links};
}

function nodeTextMultiline({id, v_type}) {
    const comps = nodeToUserTextComponents({v_id: id, v_type: v_type});
    if (comps.length > 1) {
        comps[0] = comps[0] + " in";
    }
    return comps;
}

export function updateNetwork(network, shocks) {
    clearChildren(network.targetElem);
    console.log('Received shocks', shocks);
    const shockData = preprocessShockData(shocks['reachable_edges']);
    const shockPaths = shocks['all_paths'];
    annotateShockPaths(shockPaths);
    console.log('Annotated shock paths =', shockPaths);
    shockData.paths = shockPaths;
    const vis = makeGraph(shockData, {nodeLabel: nodeTextMultiline});
    // const vis = makeGraph(shockData, {
    //     width: 900, 
    //     height: 600,
    //     nodeLabel: nodeTextMultiline,
    // });
    network.targetElem.appendChild(vis);

}