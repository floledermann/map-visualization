
function degRad(ang) {
  return ang * (Math.PI/180.0);
}

// simple spherical mercator proj.: [lat,lng]->[[0..1],[0..1]]
function projectMercator(latlng) {
  var lat = degRad(latlng[0]);
  var lng = degRad(latlng[1]);
  var x = lng / 2.0 / Math.PI + 0.5;
  var y = 0.5 - Math.log((Math.sin(lat) + 1.0) / Math.cos(lat)) / 2.0 / Math.PI;
  return [x, y];
}


var pt = projectMercator([48.21, 16.37]);

//console.log(pt[0] + "," + pt[1]);

console.log(pt.map(function(v){ return v*1000}));
