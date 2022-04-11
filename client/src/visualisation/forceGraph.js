import * as d3 from 'd3';
import { distinctColor } from './colors';

function linkArc(d) {
    const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
    return `
      M${d.source.x},${d.source.y}
      A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
    `;
}

export function makeGraph({nodes, links}, {nodeLabel, width, height}) {
    const groupLbls = [...new Set(nodes.map(d => d.group))];
    // Colour nodes by their group label
    const color = (node) => distinctColor(groupLbls.indexOf(node.group), groupLbls.length);
    // For now, leave all edges the same colour
    const linkColor = () => 'black';
    const sim = 
        d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("x", d3.forceX())
            .force("y", d3.forceY());
    
        const svg = d3.create("svg")
            .attr("viewBox", [-width / 2, -height / 2, width, height])
            .style("font", "12px sans-serif");
      
        // Use a triangular marker for the end point
        svg.append("defs").selectAll("marker")
            .data([0])
            .join("marker")
            .attr("id", d => `arrow-${d}`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", -0.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
                .attr("d", "M0,-5L10,0L0,5");
      
        const link = svg.append("g")
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("stroke", linkColor)
            .attr("marker-end", () => `url(${new URL(`#arrow-0`, location)})`);
      
        const node = svg.append("g")
            .attr("fill", "currentColor")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(nodes)
            .join("g");
      
        node.append("circle")
            .attr("stroke", "white")
            .attr("fill", color)
            .attr("stroke-width", 1.5)
            .attr("r", 4);
      
        node.append("text")
            .attr("x", 8)
            .attr("y", "0.31em")
            .text(nodeLabel);
      
        sim.on("tick", () => {
          link.attr("d", linkArc);
          node.attr("transform", d => `translate(${d.x},${d.y})`);
        });
      
        return svg.node();

}