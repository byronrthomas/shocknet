import * as d3 from 'd3';
import { distinctColor } from './colors';

const MIN_X_SEPARATION = 150;
const MIN_Y_SEPARATION = 75;
const NODE_PADDING = 75;
const CIRCLE_RADIUS = 15;

function linkArc(circleRadius, idToLocation, e) {
    const sourceLoc = idToLocation[e.source.id];
    const targetLoc = idToLocation[e.target.id];
    return `
      M${sourceLoc.x},${sourceLoc.y - circleRadius - 1}
      L${targetLoc.x},${targetLoc.y + circleRadius + 1}
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
    const widestLevelCount = Math.max(...levels.map(l => l.length));
    const widestLevelWidth = MIN_X_SEPARATION * widestLevelCount;
    let nextY = NODE_PADDING;
    const allNodes = [];
    const idToLocation = {};
    for (const levelNodes of levels) {
        let nextX, xInc;
        if (levelNodes.length == widestLevelCount) {
            nextX = NODE_PADDING;
            xInc = MIN_X_SEPARATION;
        } else {
            // NOTE: we are having equal spacing throughout the width
            // Hence we figure out the spread between nodes
            xInc = widestLevelWidth / (levelNodes.length + 1);
            // And then the first node sets off half of this spacing
            // (leaving half spacing on the right to keep centered)
            nextX = NODE_PADDING + (xInc / 2);
        }
        for (const node of levelNodes) {
            node.x = nextX;
            node.y = nextY;
            allNodes.push(node);
            nextX += xInc;
            idToLocation[node.id] = {x: node.x, y: node.y};
        }
        nextY += MIN_Y_SEPARATION;
    }
    return {
        canvasHeight: NODE_PADDING * 2 + MIN_Y_SEPARATION * levels.length,
        canvasWidth: NODE_PADDING * 2 + widestLevelWidth,
        nodes: allNodes,
        idToLocation
    };
}

const HOVER_CLASS = 'shock-network-hoverover';

function updatePopup(containerDivElem, evt, datum, popupTemplate) {
    const element = d3.select(evt.currentTarget);
    element.on('mousemove', null);
    element.on('mousemove', function() {
      var position = d3.pointer(evt);
      d3.select(containerDivElem).select("." + HOVER_CLASS)
        .style('top', ( (position[1] + 30)) + "px")
        .html(function() {
          try {
            return popupTemplate(datum);
          } catch (e) {
            return "";
          }
        })
        .style('left', ( position[0]) + "px");
    });

    d3.select(containerDivElem).select("." + HOVER_CLASS).style('display', 'block');
}

export function makeGraph({paths}, {
        nodeLabel, 
        labelIsMultiline, 
        clientWidth, 
        parentElem,
        nodeHoverTemplate
    }) {
    const layout = makeLayout(paths);
    const links = paths.flat(1);
    console.log('Layout =', layout);
    const nodes = layout.nodes;
    const groupLbls = [...new Set(nodes.map(d => d.group))];
    // Colour nodes by their group label
    const color = (node) => distinctColor(groupLbls.indexOf(node.group), groupLbls.length);
    // For now, leave all edges the same colour
    const linkColor = () => 'black';
    const svg = d3.create("svg")
        //.attr('height', layout.canvasHeight * 1.5)
        .attr('width', Math.min(layout.canvasWidth * 1.5, clientWidth))
        .attr('class', 'center-block')
        .attr("viewBox", [0, 0, layout.canvasWidth, layout.canvasHeight])
        .style("font", "10px sans-serif");
      
        // Use a triangular marker for the end point
        svg.append("defs").append("marker")
            .attr("id", `arrow-0`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 10)
            //.attr("refY", -1)
            .attr("markerWidth", 10)
            .attr("markerHeight", 10)
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
            .attr("stroke-width", 0.5)
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("stroke", linkColor)
            .attr("d", (e) => linkArc(CIRCLE_RADIUS, layout.idToLocation, e))
            .attr("marker-end", () => `url(${new URL(`#arrow-0`, location)})`);
      
        node.append("circle")
            .attr("stroke", "black")
            .attr("fill", color)
            .attr("stroke-width", 1.5)
            .attr("r", CIRCLE_RADIUS)
            .on('mouseover', function ( evt, d ) {
                updatePopup(parentElem, evt, d, nodeHoverTemplate);
                d3.select(evt.currentTarget).attr("fill", "white");
            })
            .on('mouseout', function ( evt ) {
                d3.select(parentElem).select("." + HOVER_CLASS).style('display', 'none');
                d3.select(evt.currentTarget).attr("fill", color)
            });
      
        if (labelIsMultiline) {
            node.append("text")
            .attr("y", "0.31em")
            .selectAll("tspan")
            .data(nodeLabel)
            .join("tspan")
            .attr("x", CIRCLE_RADIUS)
            .attr("dy", "1.2em")
            .text(x => x);
        } else {
            node.append("text")
            .attr("x", CIRCLE_RADIUS)
            .text(nodeLabel);
        }
        

        d3.select( parentElem ).append('div')
            .attr('class', HOVER_CLASS)
            .style('z-index', 10001)
            .style('position', 'absolute')
            .style('padding', '4px')
            .style('border-radius', '1px')
            .style('background-color', '#FFF')
            .style('box-shadow', '1px 1px 5px #CCC')
            .style('font-size', '12px')
            .style('font-family', '"Helvetica Neue", Helvetica, Arial, sans-serif');
      
      
        return svg.node();

}