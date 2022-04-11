import { edgeToDestRegion, edgeToSourceRegion, fixedPointAsString, nodeAsDestText, nodeToGraphCommod, nodeToGraphRegion, formatGraphProducer,graphRegionToUserText, edgeToGraphRegions , nodeAsSourceText} from "../graph_model/formatting";
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

function edgeToText(edge) {
    console.log('Got edge data', edge);
    const tradedCommodity = formatGraphProducer(edge.from_id);
    if (edge.e_type === 'critical_industry_of') {
      const toReg = edgeToDestRegion(edge);
      const toLbl = graphRegionToUserText(toReg);
      return `${tradedCommodity} is a critical industry of ${toLbl} (${fixedPointAsString(edge.attributes.pct_of_national_output)}% of national output)`;
    }
    const [, toReg] = edgeToGraphRegions(edge);
    const toLbl = graphRegionToUserText(toReg);
    const fromText = nodeAsSourceText({v_id: edge.from_id, v_type: edge.from_type});
    const toText = nodeAsDestText({v_id: edge.to_id, v_type: edge.to_type});
    
    if (edge.e_type === 'trade_shock') {
      return `${fromText} is ${fixedPointAsString(edge.attributes.pct_of_imported_product_total)}% of the total imported into ${toLbl}, and imported [${tradedCommodity}] makes up ${fixedPointAsString(edge.attributes.pct_of_producer_input)}% of the inputs to ${toText}`
    }
    if (edge.e_type === 'production_shock') {
      return `[${tradedCommodity}] in ${toLbl} makes up ${fixedPointAsString(edge.attributes.pct_of_producer_input)}% of the inputs to ${toText}`;
    }
    throw Error('Unknown edge type ' + edge.e_type);
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
        nodeHoverTemplate,
        linkHoverTemplate: edgeToText});
    network.targetElem.appendChild(vis);

}