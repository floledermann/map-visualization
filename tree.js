const DEFAULT_OPTIONS = {
  nodeHeight: 45,
  nodeWidth: 70,
  functionMargin: 4,
  nodeX: node => -node.y,
  nodeY: node => node.x,
  delay: 0,
  delayPerLevel: 0,
  delayFunctions: 0,
  drawOutlines: true,
  getStack: node => node.data.stack,
  stackComparator: function(el1, el2) {
      return el1.name == el2.name;
  },
  stackLabel: stack => {
    var label = stack.name;
    if (label.startsWith("<function")) label = ""; //"<" + root.node.data.stack[level-1].loc.split(":")[0] + ">";
    return label;
  }
}

function hasHead(head, array, comparator) {
    return head.reduce(function(acc, el, i) {
        return acc && array.length > i && comparator(el, array[i]);
    }, true);
}

function round(val, digits) {
    if (typeof val == "number") {
        let base = Math.pow(10, digits);
        rounded = Math.round(val*base)/base;

        // increase precision for very small values
        if (rounded == 0 && val != 0) {
          rounded = round(val, digits+2);
        }

        val = rounded;
    }
    return val;
}

function smartRound(val) {
  var len = Math.round(val).toString().length;
  var numDigits = Math.max(5-len, 1);
  var rounded = round(val, numDigits);
  if (rounded != val) {
    if (rounded == Math.round(val)) {
      // .0
      rounded = rounded + '.0'
    }
    rounded += '…';
  }
  return rounded;
}

function getEdgeNodes(node, stack, edgeNodes, options) {
    if (node.children) {
        let lastInNode = null,
            lastOutNode = null;

        node.children.forEach(function(n) {
            if (!options.getStack(n)) return; // hack
			// break outline for guard nodes
			if (n.parent.data.type == "guard" && (n.parent.children.indexOf(n) > 1)) return;
            if (hasHead(stack, options.getStack(n), options.stackComparator)) {
                if (lastOutNode) {
                    edgeNodes.push({node: lastOutNode, inside: false});
                }
                if (!lastInNode) {
                    edgeNodes.push({node: n, inside: true});
                }
                getEdgeNodes(n, stack, edgeNodes, options);
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

    options = Object.assign({}, DEFAULT_OPTIONS, options);

    var path = [];
    var previous, current, next, next2;
    var root = edgeNodes[0];

    var x = options.nodeX,
        y = options.nodeY;

    level = level || 1;
    var margin = (level-1) * options.functionMargin + 2;

    var maxDepth = 0;

    var cpDistance = options.nodeHeight / 2;
    var radius = options.nodeHeight / 2 - margin;

    for (var i=0; i<edgeNodes.length; i++) {
        previous = edgeNodes[i-1] || null;
        current = edgeNodes[i];
        next = edgeNodes[i+1] || null;
        next2 = edgeNodes[i+2] || null;

        if (current.node.depth > maxDepth) maxDepth = current.node.depth;

        // drawing a single node tree is handled below in the first step, so ignore root node added twice to the outline
        if (!next && previous.node == root.node) continue;

        // draw smooth connection from PREVIOUS to CURRENT node in every iteration, providing correct tangent for NEXT
        // usually, down the tree is on top, back up is at bottom
        if (!previous) {
            // root node
            path.push("M" + [x(current.node),y(current.node)+radius])
            path.push("A" + [                   // circular arc
                radius, radius,   // radius-x, radius-y
                0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                x(current.node), y(current.node)-radius // dest x, y
            ]);
            // special case: only 1 node (=root)
            if (next.node == root.node) {
                path.push("A" + [                   // circular arc
                    radius, radius,   // radius-x, radius-y
                    0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                    x(current.node), y(current.node)+radius // dest x, y
                ]);
            }
        }
        else {
            if (current.inside) {
                if (previous.node.depth < current.node.depth) {
                    path.push("C" + [                                                       // bezier curve
                        x(previous.node)-2*cpDistance, y(previous.node)-radius,      // cp1 x, y
                        x(current.node)+2*cpDistance, y(current.node)-radius,        // cp2 x, y
                        x(current.node), y(current.node)-radius                     // dest x, y
                    ]);
                    if (next == null || current.node.depth == next.node.depth) {
                        if (next.inside) {
                            // TODO: provide from, to, previous, next above
                            if (next2 && (next2.node.depth > next.node.depth)) {
                                path.push("A" + [                   // circular arc
                                    radius, radius,   // radius-x, radius-y
                                    0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                                    x(current.node), y(current.node)+radius // dest x, y
                                ]);
                            }
                            else {
                                path.push("A" + [                   // circular arc
                                    radius, radius,   // radius-x, radius-y
                                    0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                                    x(current.node)-radius, y(current.node) // dest x, y
                                ]);
                            }
                        }
                        else {
                            path.push("A" + [                   // circular arc
                                radius, radius,   // radius-x, radius-y
                                0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                                x(current.node), y(current.node)+radius // dest x, y
                            ]);
                        }
                    }
                }
                else if (previous.node.depth == current.node.depth) {
                    if (next && next.node.depth > current.node.depth) {
                        path.push("C" + [                                                       // bezier curve
                            x(previous.node)+cpDistance, y(previous.node)+radius,        // cp1 x, y
                            x(previous.node)+cpDistance+margin, (y(previous.node)+y(current.node))/2-cpDistance,        // cp2 x, y
                            x(previous.node)+cpDistance+margin, (y(previous.node)+y(current.node))/2                     // dest x, y
                        ]);
                        path.push("C" + [                                                       // bezier curve
                            x(current.node)+cpDistance+margin, (y(previous.node)+y(current.node))/2+cpDistance,        // cp1 x, y
                            x(current.node)+cpDistance, y(current.node)-radius,        // cp2 x, y
                            x(current.node), y(current.node)-radius                     // dest x, y
                        ]);
                    }
                    else {
                        path.push("L" + [x(current.node)-radius, y(current.node)]);
                    }
                    if (next && (current.node.depth > next.node.depth || !next.inside)) {
                        path.push("A" + [                   // circular arc
                            radius, radius,   // radius-x, radius-y
                            0, 0, 0,                        // x-axis-rotation large-arc-flag sweep-flag
                            x(current.node), y(current.node)+radius // dest x, y
                        ]);
                    }
                }
                else if (previous.node.depth > current.node.depth) {
                    path.push("C" + [                                                       // bezier curve
                        x(previous.node)+2*cpDistance, y(previous.node)+radius,      // cp1 x, y
                        x(current.node)-2*cpDistance, y(current.node)+radius,        // cp2 x, y
                        x(current.node), y(current.node)+radius                     // dest x, y
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
        .attrs({
            'fill': '#000000',
            'fill-opacity': 0.05,
            'stroke': '#000000',
            'stroke-width': 0.9,
            'stroke-dasharray': '5 5'
        })
    ;

    var delayDuration = options.delay + options.delayFunctions + maxDepth * options.delayPerLevel;
    if (options.delayPerLevel) {
      delay(path, delayDuration, 1500);
    }

    var label = options.stackLabel(options.getStack(root.node)[level-1]);

    var label = svg.append("text")
        .datum(root.node)
        .attr("class", "funcName")
        .attr("transform", d => "translate(" + (x(d)+radius) + "," + (y(d)+radius) + ")")
        .attr("dy", 2)
        .attr("x", 0)
        .attrs({
            'font-family': 'sans-serif',
            'font-size': 10,
            'text-anchor': 'end',
            'font-weight': 'bold',
            'cursor': 'default',
            'pointer-events': 'none',
            'text-shadow': '0 1px 0 #fff, 0 -1px 0 #fff, 1px 0 0 #fff, -1px 0 0 #fff'
        })
        .text(label);

    if (options.delayPerLevel) {
      delay(label, delayDuration, 1500);
    }
}

function getStacks(current, context, options) {
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
        if (!options.stackComparator(current[i], context[i])) break;
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

    options = Object.assign({}, DEFAULT_OPTIONS, options);

    lastStack = lastStack || [];
    var currentStack = options.getStack(node) || [];

	// break stack for "guard" type nodes
	if (node.parent && node.parent.data.type == "guard" && (node.parent.children.indexOf(node) > 1)) {
		lastStack = [];
	}

    var newStack = getStacks(currentStack, lastStack, options);

    newStack.forEach(function(stack) {
        var edgeNodes = [{node: node, inside: true}];
        getEdgeNodes(node, stack, edgeNodes, options);
        edgeNodes.push({node: node, inside: true});

        drawOutline(svg, edgeNodes, stack.length, options);
    });

    if (node.children) {
        node.children.forEach(n => drawOutlines(svg, n, options.getStack(node), options));
    }
}

function delay(sel, delay, duration) {
  duration = duration || 300;
  sel.attr('opacity', 0);
  sel.transition()
    .delay(delay)
    .duration(duration)
    .attr('opacity', 1)
  ;
}

function drawTree(svg, data, options) {

    options = Object.assign({}, DEFAULT_OPTIONS, options);

    var x = options.nodeX,
        y = options.nodeY;

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

    if (options.drawOutlines) {
      drawOutlines(svg, root, options);
    }

    // draw links

    var link = svg.selectAll(".link")
      .data(root.descendants().slice(1))
    .enter().append("path")
      .attr("class", "link")
      .attrs({
        'fill': 'none',
        'stroke': '#555',
        'stroke-opacity': 0.4,
        'stroke-width': 1.5,
        'pointer-events': 'none'
      })
      .attr("d", function(d) {
		if (d.data.type == "dummy") return "";
		// This draws an "orthogonal" connection for guards

		if (d.parent.data.type == "guard" && (d.parent.children.indexOf(d) > 1)) return "M" + x(d) + "," + y(d)
            + "C" + (x(d) + options.nodeHeight) + "," + y(d)
            + " " + (x(d.parent)) + "," + (y(d.parent) + options.nodeHeight)
            + " " + x(d.parent) + "," + y(d.parent);
        return "M" + x(d) + "," + y(d)
            + "C" + (x(d) + options.nodeHeight) + "," + y(d)
            + " " + (x(d.parent) - options.nodeHeight) + "," + y(d.parent)
            + " " + x(d.parent) + "," + y(d.parent);
      });

    if (options.delayPerLevel) {
      delay(link, d => options.delay + (d.depth-1) * options.delayPerLevel);
    }

    // draw nodes

    var node = svg.selectAll(".node")
      .data(root.descendants().filter(d => d.data.type != "dummy"))
    .enter().append("g")
      .attr("class", function(d) { return "node" + (d.children ? " node-internal" : " node-leaf"); })
      .attr("transform", function(d) {
        return "translate(" + x(d) + "," + y(d) + ")";
      })
    ;

    if (options.delayPerLevel) {
      delay(node, d => options.delay + d.depth * options.delayPerLevel);
    }

    if (options.nodeClick) {
      node.style('cursor','pointer');
      node.on('click', options.nodeClick);
    }

    node.append("circle")
      .attr("r", d => d.data.op ? 9 : 5)
      .attrs(d => d.children ? {
        'fill': '#fff',
        'stroke':' #555',
        'stroke-width': 1
      } : {
        'fill': '#999'
      });

    node.append("text")
        .attr("dy", 4)
        .attr("x", d => d.height ? 15 : -9)
        .attr("text-anchor", d => d.height ? "start" : "end")
        .attrs({
            'class':'node-value',
            'font-family': 'sans-serif',
            'font-size': 10,
            'cursor': 'inherit',
            'pointer-events': 'none',
            'text-shadow': '0 1px 0 #fff, 0 -1px 0 #fff, 1px 0 0 #fff, -1px 0 0 #fff'
        })
        .text(d => {
            if (d.height == 0 && d.data.label) return d.data.label;
            var val = d.data.val;
            if (d.data.valuetype == "string") return '"'+val+'"';
            if (d.height == 0 && Math.abs(val-Math.PI)<0.0000000001) return "π";
            var rounded = smartRound(d.data.val,4);
            return rounded;
        });

    node.append("text")
      .attr("dy", 4)
      .attr("x", 0)
      .attrs({
          'class':'node-op-label',
          'font-family': 'sans-serif',
          'font-size': 12,
          'cursor': 'inherit',
          'pointer-events': 'none',
          'text-shadow': '0 1px 0 #fff, 0 -1px 0 #fff, 1px 0 0 #fff, -1px 0 0 #fff'
      })
      .attr('text-anchor', 'middle')
      .text(d => (d.height == 0) ? "" : (d.data.label || d.data.op || ""));


    return root;
}

function compactDistance(tree1, tree2) {
  var maxX = [];

  tree1.each(node => {
    if (maxX[node.depth] === undefined || maxX[node.depth] < node.x) maxX[node.depth] = node.x;
  });

  var maxDist = 0;

  tree2.each(node => {
    var dist = maxX[node.depth] - node.x;
    if (dist > maxDist) maxDist = dist;
  })

  return maxDist;
}
