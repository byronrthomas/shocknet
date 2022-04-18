import {formatGraphProducer, fixedPointAsString, nodeAsDestText,graphProducerToGraphCommod} from '../graph_model/formatting';
import {nonTradables} from '../graph_model/refData';

function importerEdgeId(edge) {
    return `${formatGraphProducer(edge.from_id)}-imports-${edge.to_id}`;
}

function edgeToTableRows(edge, firstCellText, totalPathCount, visitedImportEdges, importerSummaries) {
    // console.log('Asked to make a row for', edge);
    // console.log('edge', edge);
    // console.log('firstCellText', firstCellText);
    // console.log('visitedImportEdges', visitedImportEdges);
    const tradedCommodity = formatGraphProducer(edge.from_id);
    const producedCommodity = formatGraphProducer(edge.to_id);
    
    if (edge.e_type === 'trade_shock') {
        const importEdgeId = importerEdgeId(edge);
        if (visitedImportEdges.has(importEdgeId)) return '';
        visitedImportEdges.add(importEdgeId);

        const pathCount = importerSummaries[importEdgeId];
        
        return `<tr><td>${firstCellText}</td>` + 
            `<td>${producedCommodity}</td>` +
            `<td>$${fixedPointAsString(edge.attributes.market_val_dollars)}M</td>` +
            `<td>${tradedCommodity} imports</td>` +
            `<td>${pathCount} of ${totalPathCount}</td></tr>\n`;
    }
    if (edge.e_type === 'production_shock') {
        return `<tr><td>${firstCellText}</td>` + 
            `<td>${producedCommodity}</td>` +
            `<td>$${fixedPointAsString(edge.attributes.market_val_dollars)}M</td>` +
            `<td>${tradedCommodity}</td>` +
            `<td>${edge.attributes.path_count} of ${totalPathCount}</td></tr>\n`;
    }
    throw Error('Unknown edge type ' + edge.e_type);
  }

function tradeableInput(producerId) {
    return !nonTradables.has(graphProducerToGraphCommod(producerId));
}

function summariseImporters(edges) {
    const importerSummaries = {};
    for (const edge of edges) {
        if (edge.e_type !== 'trade_shock') continue;
        const eid = importerEdgeId(edge);
        if (!(eid in importerSummaries)) {
            importerSummaries[eid] = edge.attributes.path_count;
        } else {
            importerSummaries[eid] += edge.attributes.path_count;
        }
    }
    return importerSummaries;
}

function formatEdgeList(targetId, edges, totalPathsToTarget) {
    // console.log('Running for targetId', targetId);
    // console.log('About to format edge list', edges);
    let result = '';
    let addedEdges = false;
    const visitedImportEdges = new Set();
    const importerSummaries = summariseImporters(edges);
    for (const edge of edges) {
        if (tradeableInput(edge['from_id'])) {
            // Only put the target in the first row
            const firstCellTxt = addedEdges ? '' : `<strong>${nodeAsDestText({v_type: 'producer', v_id: targetId})}</strong>`;
            result += edgeToTableRows(edge, firstCellTxt, totalPathsToTarget, visitedImportEdges, importerSummaries);
            result += '\n';
            addedEdges = true;
        }
    }
    return result;
  }


function showEdgesByTarget(shockPathDetails, shockDetailsOmitted, edgesByTarget, distinctPathCountsByTarget) {
    // console.log('Going to show paths based on ', mapData);
    // console.log('Will add to', pathsOutputElem);
    // console.log('Got paths', allPaths);
    let fullPathOutput = '';
    let noPaths = [];
    for (const tgt in edgesByTarget) {
        const tgtOutput = formatEdgeList(tgt, edgesByTarget[tgt], distinctPathCountsByTarget[tgt]);
        if (tgtOutput === '') {
            noPaths.push(tgt);
        } else {
            fullPathOutput += tgtOutput;
        }
    }
    shockPathDetails.innerHTML = fullPathOutput;
    if (noPaths.length > 0) {
        shockDetailsOmitted.innerHTML = `<strong>${noPaths.length} producers</strong> to protect had shock chains that were entirely made up of non-tradeable inputs (e.g. Capital) - we assume these can't be easily reduced or substituted.`
    }
}

export function updatePaths(shockPathDetails, shockDetailsOmitted, edgesByTarget, distinctPathCountsByTarget) {
    // Reset the path details view
    shockPathDetails.innerHTML = '';
    shockDetailsOmitted.innerText = '';

    // console.log('edgesByTarget', edgesByTarget);
    // console.log('distinctPathCountsByTarget', distinctPathCountsByTarget);
    showEdgesByTarget(shockPathDetails, shockDetailsOmitted, edgesByTarget, distinctPathCountsByTarget);

}