import { edgeToDestRegion, edgeToSourceRegion, fixedPointAsString, nodeAsDestText, nodeToGraphCommod, nodeToGraphRegion } from "../graph_model/formatting";
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

function makeNodeForDestination(edge, nodeDataById) {
    const toReg = edgeToDestRegion(edge);
    const nodeDetails = nodeDataById[edge.to_id];
    return {id: edge.to_id, v_id: edge.to_id, group: toReg, v_type: edge.to_type, ...nodeDetails}
}

function makeNodeForSource(edge, nodeDataById) {
    const fromReg = edgeToSourceRegion(edge);
    const nodeDetails = nodeDataById[edge.from_id];
    return {id: edge.from_id, v_id: edge.from_id, group: fromReg, v_type: edge.from_type, ...nodeDetails}
}

function annotateShockPaths(paths, reachableNodes) {
    const nodeDataById = {};
    reachableNodes.forEach(d => nodeDataById[d['v_id']] = d['attributes']);
    for (const path of paths) {
        for (const edge of path) {
            edge.source = makeNodeForSource(edge, nodeDataById);
            edge.target = makeNodeForDestination(edge, nodeDataById);
        }
    }
}

function nodeHoverTemplate(data) {
    // console.log('Got data', data);
    let lbl;
    try {
        lbl = nodeAsDestText(data);
    } catch (e) {
        console.log(e);
    }
    
    // console.log('lbl', lbl);
    return `<strong>${lbl}</strong>` +
    `<br>${fixedPointAsString(data.pct_of_national_output)}% of National Output` +
    `<br>$${fixedPointAsString(data.market_val_dollars)}M output` ;
}

function shortNodeNames({id, v_type}) {
    const reg = nodeToGraphRegion({v_type, v_id: id}).toUpperCase();
    const cmd = nodeToGraphCommod({v_type, v_id: id});
    return cmd ? `${cmd} (${reg})` : reg;
}

export function updateNetwork(network, shocks) {
    clearChildren(network.targetElem);
    console.log('Received shocks', shocks);
    const shockPaths = [...shocks['all_paths']];
    annotateShockPaths(shockPaths, shocks['reachable_nodes']);
    console.log('Annotated shock paths =', shockPaths);

    const vis = makeGraph({paths: shockPaths}, {
        nodeLabel: shortNodeNames, 
        labelIsMultiline: false,
        clientWidth: network.targetElem.clientWidth,
        parentElem: network.targetElem,
        nodeHoverTemplate});
    // const vis = makeGraph(shockData, {
    //     width: 900, 
    //     height: 600,
    //     nodeLabel: nodeTextMultiline,
    // });
    network.targetElem.appendChild(vis);

}