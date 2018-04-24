import EsriMap = require("esri/Map");
import MapView = require("esri/views/MapView");
import { Point } from "esri/geometry";
import WebMap = require("esri/WebMap");
import SceneView = require("esri/views/SceneView");
import WebScene = require("esri/WebScene");

/*
const webmap = new WebMap({
  portalItem: { // autocasts as new PortalItem()
    id: "eb51c465c0f74aeb9caeedb88a975b3e"
  }
});
*/

//d59dc427064a4ad4a98a8a20a927c33c
//e691172598f04ea8881cd2a4adaa45ba
//eb51c465c0f74aeb9caeedb88a975b3e -3D

const webmap = new WebScene({
  portalItem: { // autocasts as new PortalItem()
    id: "eb51c465c0f74aeb9caeedb88a975b3e"
  }
});

const view = new SceneView({
  map:webmap,
  container: "viewDiv"
})

/*var view = new MapView({
  map: webmap,  // The WebMap instance created above
  container: "viewDiv"
});*/

/*
const map = new EsriMap({
  basemap: "topo-vector"
});

const view = new MapView({
  map: map,
  container: "viewDiv",
  center: [-118.244, 34.052],
  zoom: 12
});*/

