function hasHead(head, array, comparator) {
    return head.reduce(function(acc, el, i) {
        return acc && array.length > i && comparator(el, array[i]);
    }, true);
}

function hasStackHead(head, stack) {
    return hasHead(head, stack, function(el1, el2) {
        return (el1.file == el2.file) && (el1.loc == el2.loc);
    });
}

function round(val, digits) {
    if (typeof val == "number") {
        let base = Math.pow(10, digits);
        val = Math.round(val*base)/base;
    }
    return val;
}

function getEdgeNodes(node, stack, edgeNodes) {
    if (node.children) {
        let lastInNode = null,
            lastOutNode = null;

        node.children.forEach(function(n) {
            if (!n.data.stack) return; // hack
            if (hasStackHead(stack, n.data.stack)) {
                if (lastOutNode) {
                    edgeNodes.push({node: lastOutNode, inside: false});
                }
                if (!lastInNode) {
                    edgeNodes.push({node: n, inside: true});
                }
                getEdgeNodes(n, stack, edgeNodes);
                lastInNode = n;
                lastOutNode = null;
            }
            else {
                if (lastInNode) {
                    lastOutNode = n;
                }
            }
        });
        if (lastInNode) {
            edgeNodes.push({node: lastInNode, inside: true});
        }
    }
}

function drawOutline(svg, edgeNodes, level, options) {

    options = Object.assign({}, options, {
      nodeHeight: 45,
      functionMargin: 4
    });

    var path = [];
    var previous, current, next, next2;
    var root = edgeNodes[0];

    level = level || 1;
    var margin = (level-1) * options.functionMargin + 2;

    var cpDistance = options.nodeHeight / 2;
    var radius = options.nodeHeight / 2 - margin;

    for (var i=0; i<edgeNodes.length; i++) {
        previous = edgeNodes[i-1] || null;
        current = edgeNodes[i];
        next = edgeNodes[i+1] || null;
        next2 = edgeNodes[i+2] || null;

        // drawing a single node tree is handled below in the first step, so ignore root node added twice to the outline
        if (!next && previous.node == root.node) continue;

        // draw smooth connection from PREVIOUS to CURRENT node in every iteration, providing correct tangent for NEXT
        // usually, down the tree is on top, back up is at bottom
        if (!previous) {
            // root node
            path.push("M" + [x(current.node.y),current.node.x+radius])
            path.push("A" + [                   // circular arc
                radius, radius,   // radius-x, radius-y
                0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                x(current.node.y), current.node.x-radius // dest x, y
            ]);
            // special case: only 1 node (=root)
            if (next.node == root.node) {
                path.push("A" + [                   // circular arc
                    radius, radius,   // radius-x, radius-y
                    0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                    x(current.node.y), current.node.x+radius // dest x, y
                ]);
            }
        }
        else {
            if (current.inside) {
                if (previous.node.depth < current.node.depth) {
                    path.push("C" + [                                                       // bezier curve
                        x(previous.node.y)-2*cpDistance, previous.node.x-radius,      // cp1 x, y
                        x(current.node.y)+2*cpDistance, current.node.x-radius,        // cp2 x, y
                        x(current.node.y), current.node.x-radius                     // dest x, y
                    ]);
                    if (next == null || current.node.depth == next.node.depth) {
                        if (next.inside) {
                            // TODO: provide from, to, previous, next above
                            if (next2 && (next2.node.depth > next.node.depth)) {
                                path.push("A" + [                   // circular arc
                                    radius, radius,   // radius-x, radius-y
                                    0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                                    x(current.node.y), current.node.x+radius // dest x, y
                                ]);
                            }
                            else {
                                path.push("A" + [                   // circular arc
                                    radius, radius,   // radius-x, radius-y
                                    0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                                    x(current.node.y)-radius, current.node.x // dest x, y
                                ]);
                            }
                        }
                        else {
                            path.push("A" + [                   // circular arc
                                radius, radius,   // radius-x, radius-y
                                0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                                x(current.node.y), current.node.x+radius // dest x, y
                            ]);
                        }
                    }
                }
                else if (previous.node.depth == current.node.depth) {
                    if (next && next.node.depth > current.node.depth) {
                        path.push("C" + [                                                       // bezier curve
                            x(previous.node.y)+cpDistance, previous.node.x+radius,        // cp1 x, y
                            x(previous.node.y)+cpDistance+margin, (previous.node.x+current.node.x)/2-cpDistance,        // cp2 x, y
                            x(previous.node.y)+cpDistance+margin, (previous.node.x+current.node.x)/2                     // dest x, y
                        ]);
                        path.push("C" + [                                                       // bezier curve
                            x(current.node.y)+cpDistance+margin, (previous.node.x+current.node.x)/2+cpDistance,        // cp1 x, y
                            x(current.node.y)+cpDistance, current.node.x-radius,        // cp2 x, y
                            x(current.node.y), current.node.x-radius                     // dest x, y
                        ]);
                    }
                    else {
                        path.push("L" + [x(current.node.y)-radius, current.node.x]);
                    }
                    if (next && (current.node.depth > next.node.depth || !next.inside)) {
                        path.push("A" + [                   // circular arc
                            radius, radius,   // radius-x, radius-y
                            0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                            x(current.node.y), current.node.x+radius // dest x, y
                        ]);
                    }
                }
                else if (previous.node.depth > current.node.depth) {
                    path.push("C" + [                                                       // bezier curve
                        x(previous.node.y)+2*cpDistance, previous.node.x+radius,      // cp1 x, y
                        x(current.node.y)-2*cpDistance, current.node.x+radius,        // cp2 x, y
                        x(current.node.y), current.node.x+radius                     // dest x, y
                    ]);

                    //}
                }
            }
        }
    }

    var d = path.join(" ");
    var path = svg.append("path")
        .attr("class","function level-"+level)
        .attr("d", d)
    ;

    var funcName = root.node.data.stack[level-1].name;
    if (funcName.startsWith("<function")) funcName = ""; //"<" + root.node.data.stack[level-1].loc.split(":")[0] + ">";

    svg.append("text")
        .datum(root.node)
        .attr("class", "funcName")
        .attr("transform", d => "translate(" + (x(d.y)+radius) + "," + (d.x+radius) + ")")
        .attr("dy", 2)
        .attr("x", 0)
        .attr("text-anchor", "end")
        .attr("font-size", 10)
        .attr("font-weight", "bold")
        .text(funcName);

}

function getStacks(current, context) {
    // make a copy of our stacks;
    current = current.slice(0);
    context = context.slice(0);

    var common = [];
    var extension = [];
    var stacks = [];

    function compare(el1, el2) {
        return (el1.file == el2.file) && (el1.loc == el2.loc);
    }

    // save & skip common heads
    for (var i=0; i<current.length; i++) {
        if (i>=context.length) break;
        if (!compare(current[i], context[i])) break;
        common.push(current[i]);
    }
    for (; i<current.length; i++) {
        extension.push(current[i]);
        stacks.push(common.concat(extension));
    }
    return stacks;

}

function drawOutlines(svg, node, lastStack, options) {

    if (lastStack && !Array.isArray(lastStack)) {
        options = lastStack;
        lastStack = [];
    }

    options = Object.assign({}, options, {
      nodeHeight: 45,
      functionMargin: 4
    });

    lastStack = lastStack || [];
    var currentStack = node.data.stack || [];

    var newStack = getStacks(currentStack, lastStack);

    newStack.forEach(function(stack) {
        var edgeNodes = [{node: node, inside: true}];
        getEdgeNodes(node, stack, edgeNodes);
        edgeNodes.push({node: node, inside: true});

        drawOutline(svg, edgeNodes, stack.length, options);
    });

    if (node.children) {
        node.children.forEach(n => drawOutlines(svg, n, node.data.stack, options));
    }
}

function drawTree(svg, data, options) {

    options = Object.assign({}, options, {
      nodeHeight: 45,
      nodeWidth: 70,
      functionMargin: 4
    });

    // ATTENTION width and height are swapped because we have a horizontal tree layout!
    //var tree = d3.cluster().nodeSize([NODE_HEIGHT,1/MAX_DEPTH]);
    var tree = d3.tree().nodeSize([options.nodeHeight, options.nodeWidth]);

    var root = d3.hierarchy(data, node => node.inputs);
    tree(root);

    root.minY = 0;
    root.maxY = 0;

    // walk through tree to find highest/lowest node
    root.each(node => {
      if (node.x < root.minY) root.minY = node.x;
      if (node.x > root.maxY) root.maxY = node.x;
    })

    //console.log("HEIGHT " + root.height);

    drawOutlines(svg, root, options);

    // draw links

    var link = svg.selectAll(".link")
      .data(root.descendants().slice(1))
    .enter().append("path")
      .attr("class", "link")
      .attr("d", function(d) {
        return "M" + x(d.y) + "," + d.x
            + "C" + (x(d.y) + options.nodeHeight) + "," + d.x
            + " " + (x(d.parent.y) - options.nodeHeight) + "," + d.parent.x
            + " " + x(d.parent.y) + "," + d.parent.x;
      });

    // draw nodes

    var node = svg.selectAll(".node")
      .data(root.descendants())
    .enter().append("g")
      .attr("class", function(d) { return "node" + (d.children ? " node-internal" : " node-leaf"); })
      .attr("transform", function(d) {
        return "translate(" + x(d.y) + "," + d.x + ")";
      })

    node.append("circle")
      .attr("r", d => d.data.op ? 9 : 5);

    node.append("text")
        .attr("dy", 4)
        .attr("x", d => d.height ? 15 : -9)
        .attr("font-size", 10)
        .attr("text-anchor", d => d.height ? "start" : "end")
        .text(d => {
            if (d.height == 0 && d.data.label) return d.data.label;
            var val = d.data.val;
            if (d.data.valuetype == "string") return '"'+val+'"';
            if (d.height == 0 && Math.abs(val-Math.PI)<0.0000000001) return "π";
            return round(d.data.val,4);
        });

    node.append("text")
      .attr("dy", 4)
      .attr("x", 0)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .text(d => (d.height == 0) ? "" : (d.data.label || d.data.op || ""));


    return root;
}
