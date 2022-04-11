import { edgeToGraphRegions, nodeToUserTextComponents } from "../graph_model/formatting";
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

function preprocessShockData(edges) {
    const nodes = [];
    const links = [];
    const seenNodes = new Set();
    for (const e of edges) {
        console.log('Preprocessing', e);
        const [fromReg, toReg] = edgeToGraphRegions(e);
        if (!seenNodes.has(e.from_id)) {
            seenNodes.add(e.from_id);
            nodes.push({id: e.from_id, group: fromReg, v_type: e.from_type});
        }
        if (!seenNodes.has(e.to_id)) {
            seenNodes.add(e.to_id);
            nodes.push({id: e.to_id, group: toReg, v_type: e.to_type});
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
    const chart = makeGraph(shockData, {
        width: 900, 
        height: 600,
        nodeLabel: nodeTextMultiline,
    });
    network.targetElem.appendChild(chart);
}