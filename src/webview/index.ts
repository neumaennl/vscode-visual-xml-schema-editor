import * as d3 from "d3";
import { XsdSchema } from "../model/xsd";
import { VisualXsdComponent } from "../model/base";

// @ts-ignore VS Code API is provided by the host
const vscode = acquireVsCodeApi();

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "init":
      const model = XsdSchema.fromJSON(message.model);
      renderTree(model);
      break;
  }
});

// function to display the XML schema with D3.js
function renderTree(model: XsdSchema) {
  const width = 800,
    height = 600;

  // create hierarchy from the model
  const root = d3.hierarchy(model as VisualXsdComponent, (node) => node?.getChildren());
  const treeLayout = d3.tree<VisualXsdComponent>().size([width, height]);
  treeLayout(root);

  // create SVG element
  const svg = d3
    .select("#tree")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(40, 0)");

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

  nodes.each(function(d) {
        (d.data as VisualXsdComponent).render(d3.select(this));
    });

  nodes
    .append("text")
    .attr("dy", "0.31em")
    .attr("x", (d) => (d.children ? -8 : 8))
    .style("text-anchor", (d) => (d.children ? "end" : "start"))
    .text((d) => d.data.getName());

  nodes.on("click", function (event, d) {
    console.log("Selected:", d.data.getName());
    d3.select(this).attr("class", "node selected");
    //TODO: Add logic to handle node selection
  });
}

// @ts-ignore TODO: unused function
function updateModel(newModel: any) {
  vscode.postMessage({ command: "update", model: newModel });
}
