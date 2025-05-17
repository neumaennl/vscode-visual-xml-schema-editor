import * as d3 from "d3";
import { XsdSchema } from "../model/xsd";
import { VisualXsdComponent } from "../model/base";

const vscode = acquireVsCodeApi();

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "init": {
      const model = XsdSchema.fromJSON(message.model);
      renderTree(model);
      break;
    }
  }
});

// function to display the XML schema with D3.js
function renderTree(model: XsdSchema) {
  // Remove any existing SVG
  d3.select("#tree").selectAll("*").remove();

  // Get container dimensions
  const container = document.getElementById("tree")!;
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  // Create SVG with dynamic dimensions
  const svg = d3
    .select("#tree")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .append("g")
    .attr("transform", `translate(${width * 0.1}, ${height * 0.1})`); // 10% margin

  // Create hierarchy and layout with dynamic sizing
  const root = d3.hierarchy(model as VisualXsdComponent, (node) => node?.getChildren());
  const treeLayout = d3.tree<VisualXsdComponent>()
    .size([height * 0.8, width * 0.8]); // 80% of space for content

  treeLayout(root);

  // create link generator
  const linkGenerator = d3
    .linkHorizontal()
    .x((d: any) => d.y)
    .y((d: any) => d.x);

  // draw edges
  svg
    .selectAll(".link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("d", (d: any) => linkGenerator(d));

  // draw nodes
  const nodes = svg
    .selectAll(".node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.y},${d.x})`);

  nodes.each(function (d) {
    d.data?.render(d3.select(this));
  });

  nodes
    .append("text")
    .attr("dy", "0.31em")
    .attr("x", (d) => (d.children ? -8 : 8))
    .style("text-anchor", (d) => (d.children ? "end" : "start"))
    .text((d) => d.data?.getName());

  nodes.on("click", function (event, d) {
    console.log("Selected:", d.data.getName());
    d3.select(this).attr("class", "node selected");
    //TODO: Add logic to handle node selection
  });
}

function updateModel(newModel: any) {
  vscode.postMessage({ command: "update", model: newModel });
}
