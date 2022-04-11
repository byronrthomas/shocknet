import * as d3 from 'd3';
import { distinctColor } from './colors';

function linkArc(circleRadius, idToLocation, e) {
    const sourceLoc = idToLocation[e.source.id];
    const targetLoc = idToLocation[e.target.id];
    return `
      M${sourceLoc.x},${sourceLoc.y - circleRadius}
      L${targetLoc.x},${targetLoc.y + circleRadius}
    `;
}

export function annotateNodesFromPaths(paths) {
    const annotatedPaths = paths.map(x => Array.from(x));
    const nodePaths = [];
    for (const annoPath of annotatedPaths) {
        annoPath.reverse();
        const initialNode = {...annoPath[0].target};
        let index = 0;
        initialNode.distFromEndpoint = index++;
        let nodes = [initialNode];
        for (const edge of annoPath) {
            const sourceNode = {...edge.source};
            sourceNode.distFromEndpoint = index++;
            sourceNode.changesGroup = sourceNode.group != edge.target.group;
            nodes.push(sourceNode);
        }
        nodePaths.push(nodes);
    }
    return nodePaths;
}

export function makeLevels(paths) {
    const annotateNodePaths = annotateNodesFromPaths(paths);
    console.log('Annotated node paths', annotateNodePaths);
    const seenNodeIds = new Set();
    const lengthPerPath = annotateNodePaths.map(p => p.length);
    const numLevels = Math.max(...lengthPerPath);
    console.log('Lengths per path = ', lengthPerPath);
    console.log('numLevels', numLevels);
    const levels = [];
    for (let lvl = 0; lvl < numLevels; ++lvl) {
        const nodesInLevel = [];
        for (const i in annotateNodePaths) {
            // Check if finished
            if (lvl >= lengthPerPath[i]) continue;

            // Else add node to level if not yet seen in a different path
            const nextNode = annotateNodePaths[i][lvl];
            if (!seenNodeIds.has(nextNode.id)) {
                seenNodeIds.add(nextNode.id);
                nodesInLevel.push(nextNode);
            }
        }
        levels.push(nodesInLevel);
    }

    return levels;
}

export function makeLayout(paths) {
    const levels = makeLevels(paths);
    console.log('Levels = ', levels);
    const minXSeparation = 300;
    const minYSeparation = 150;
    const padding = 150;
    const widestLevelCount = Math.max(...levels.map(l => l.length));
    const widestLevelWidth = minXSeparation * widestLevelCount;
    let nextY = padding;
    const allNodes = [];
    console.log('widestLevelWidth', widestLevelWidth);
    const idToLocation = {};
    for (const levelNodes of levels) {
        let nextX, xInc;
        console.log('Processing level of length', levelNodes.length);
        if (levelNodes.length == widestLevelCount) {
            nextX = padding;
            xInc = minXSeparation;
        } else {
            // NOTE: we are having equal spacing throughout the width
            // Hence we figure out the spread between nodes
            xInc = widestLevelWidth / (levelNodes.length + 1);
            // And then the first node sets off half of this spacing
            // (leaving half spacing on the right to keep centered)
            nextX = padding + (xInc / 2);
        }
        console.log(`xInc = ${xInc}, nextX = ${nextX}`);
        for (const node of levelNodes) {
            node.x = nextX;
            node.y = nextY;
            allNodes.push(node);
            nextX += xInc;
            idToLocation[node.id] = {x: node.x, y: node.y};
        }
        nextY += minYSeparation;
    }
    return {
        canvasHeight: padding * 2 + minYSeparation * levels.length,
        canvasWidth: padding * 2 + widestLevelWidth,
        nodes: allNodes,
        idToLocation
    };
}

// export function makeGraph({nodes, links}, {nodeLabel, width, height}) {
//     const groupLbls = [...new Set(nodes.map(d => d.group))];
//     // Colour nodes by their group label
//     const color = (node) => distinctColor(groupLbls.indexOf(node.group), groupLbls.length);
//     // For now, leave all edges the same colour
//     const linkColor = () => 'black';
//     const sim = 
//         d3.forceSimulation(nodes)
//             .force("link", d3.forceLink(links).id(d => d.id))
//             .force("charge", d3.forceManyBody().strength(-400))
//             .force("x", d3.forceX())
//             .force("y", d3.forceY());
    
//         const svg = d3.create("svg")
//             .attr("viewBox", [-width / 2, -height / 2, width, height])
//             .style("font", "10px sans-serif");
      
//         // Use a triangular marker for the end point
//         svg.append("defs").selectAll("marker")
//             .data([0])
//             .join("marker")
//             .attr("id", d => `arrow-${d}`)
//             .attr("viewBox", "0 -5 10 10")
//             .attr("refX", 15)
//             .attr("refY", -0.5)
//             .attr("markerWidth", 6)
//             .attr("markerHeight", 6)
//             .attr("orient", "auto")
//             .append("path")
//                 .attr("d", "M0,-5L10,0L0,5");
      
//         const link = 
//             svg.append("g")
//             .attr("fill", "none")
//             .attr("stroke-width", 1.5)
//             .selectAll("path")
//             .data(links)
//             .join("path")
//             .attr("stroke", linkColor)
//             .attr("d", linkArc)
//             .attr("marker-end", () => `url(${new URL(`#arrow-0`, location)})`);
      
//         const node = svg.append("g")
//             .attr("fill", "currentColor")
//             .attr("stroke-linecap", "round")
//             .attr("stroke-linejoin", "round")
//             .selectAll("g")
//             .data(nodes)
//             .join("g");
      
//         node.append("circle")
//             .attr("stroke", "white")
//             .attr("fill", color)
//             .attr("stroke-width", 1.5)
//             .attr("r", 15);
      
//         node.append("text")
//             .attr("x", 8)
//             .attr("y", "0.31em")
//             // .select("text")
//             .selectAll("tspan")
//             .data(nodeLabel)
//             .join("tspan")
//             .attr("x", "0")
//             .attr("dy", "1.2em")
//             .text(x => x);
//             // .data(nodeLabel)
//             // .join("text")
//             // .text(x => nodeLabel(x)[0]);
      
//         sim.on("tick", () => {
//           link.attr("d", linkArc);
//           node.attr("transform", d => `translate(${d.x},${d.y})`);
//         });
      
//         return svg.node();

// }

export function makeGraph({paths}, {nodeLabel}) {
    const layout = makeLayout(paths);
    const links = paths.flat(1);
    console.log('Layout =', layout);
    const nodes = layout.nodes;
    const groupLbls = [...new Set(nodes.map(d => d.group))];
    // Colour nodes by their group label
    const color = (node) => distinctColor(groupLbls.indexOf(node.group), groupLbls.length);
    // For now, leave all edges the same colour
    const linkColor = () => 'black';
    const circleRadius = 15;
    const svg = d3.create("svg")
        .attr("viewBox", [0, 0, layout.canvasWidth, layout.canvasHeight])
        .style("font", "10px sans-serif");
      
        // Use a triangular marker for the end point
        svg.append("defs").selectAll("marker")
            .data([0])
            .join("marker")
            .attr("id", d => `arrow-${d}`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 7.5)
            // .attr("refY", -0.5)
            .attr("markerWidth", 3)
            .attr("markerHeight", 3)
            .attr("orient", "auto")
            .append("path")
                .attr("d", "M0,-5L10,0L0,5");
        
        const node = svg.append("g")
            .attr("fill", "currentColor")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("transform", d => `translate(${d.x},${d.y})`);
      
        svg.append("g")
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("stroke", linkColor)
            .attr("d", (e) => linkArc(circleRadius, layout.idToLocation, e))
            .attr("marker-end", () => `url(${new URL(`#arrow-0`, location)})`);
      
        node.append("circle")
            .attr("stroke", "black")
            .attr("fill", color)
            .attr("stroke-width", 1.5)
            .attr("r", circleRadius);
      
        node.append("text")
            .attr("y", "0.31em")
            // .select("text")
            .selectAll("tspan")
            .data(nodeLabel)
            .join("tspan")
            .attr("x", circleRadius)
            .attr("dy", "1.2em")
            .text(x => x);
            // .data(nodeLabel)
            // .join("text")
            // .text(x => nodeLabel(x)[0]);
      
      
        return svg.node();

}