
var canvas = document.getElementById("map");
var WIDTH = +canvas.getAttribute("width"),
    HEIGHT = +canvas.getAttribute("height");

// GeoJSON coordinate order is longitude, latitude
var geom = {
    type: "LineString",
    coordinates: [[16.4, 48.2],[-74, 40.7]]
};

var drawingContext = canvas.getContext("2d");

// hack
//window.logAll(drawingContext, NAMES.canvasContext2dMethods, "HTMLCanvasElement.CanvasRenderingContext2D.");

var xy1 = canvas_coords(project_mercator(geom.coordinates[0]));
var xy2 = canvas_coords(project_mercator(geom.coordinates[1]));

// canvas origin is top-left, projection origin is bottom-left
drawingContext.beginPath();
drawingContext.moveTo(xy1[0] * WIDTH, xy1[1] * HEIGHT);
drawingContext.lineTo(xy2[0] * WIDTH, xy2[1] * HEIGHT);
drawingContext.stroke();

// convert degrees to radians
function deg_rad(ang) {
  return ang * (Math.PI/180.0);
}

// simple spherical mercator proj.: [lon, lat]->[[0..1],[0..1]]
function project_mercator(lonlat) {
  var lat = deg_rad(lonlat[1]);
  var lon = deg_rad(lonlat[0]);
  var x = lon / 2.0 / Math.PI + 0.5;
  var y = Math.log((Math.sin(lat) + 1.0) /
          Math.cos(lat)) / 2.0 / Math.PI + 0.5;
  return [x, y];
}

// canvas origin is top-left, projection origin is bottom-left,
// so flip y coordinate to match canvas
function canvas_coords(xy) {
    return [xy[0], 1-xy[1]];
}
