///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2017 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'jimu/BaseFeatureAction',
  'jimu/WidgetManager',
  "esri/tasks/query",
  "esri/layers/FeatureLayer",
  "esri/geometry/geometryEngine",
  "esri/symbols/SimpleLineSymbol",
  "esri/Color"
], function(declare, BaseFeatureAction, WidgetManager,
  Query, FeatureLayer, geometryEngine, SimpleLineSymbol,
  Color){
  var clazz = declare(BaseFeatureAction, {

    iconFormat: 'png',

    isFeatureSupported: function(featureSet){
      return featureSet.features.length > 0; // && featureSet.features[0].geometry.type !== 'point';
    },

    onExecute: function(featureSet){

      WidgetManager.getInstance().triggerWidgetOpen(this.attributeTableWidgetId)
      .then(function(myWidget) {
       
      });
      
      var polylines = [];
      featureSet.features.forEach(function(f){
        if (f && f.geometry && f.geometry.type === "polyline")
        {
          polylines.push(f.geometry);
        }
      });

      // Using Module to Union
      var union = geometryEngine.union(polylines);

      var query = new Query();
      //query.where = "1=1";
      query.geometry = union;
      var featureLayer = this.map.getLayer(this.map.graphicsLayerIds[5]);

      // Selection symbol used to draw the selected census block points within the buffer polygon
      var symbol = new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID, 
          new Color([0, 255, 255, 0.9]), 
          7
      );

      featureLayer.setSelectionSymbol(symbol);
      // Use an objectIds selection query (should not need to go to the server)
      featureLayer.selectFeatures(query, FeatureLayer.SELECTION_NEW, function(results){

      });

      return;

      WidgetManager.getInstance().triggerWidgetOpen("widgets_AttributeTable_Widget_27")
      .then(function(myWidget) {
        /*
        var vertexCount = 0;
        featureSet.features.forEach(function(f){
          f.geometry.rings.forEach(function(r){
            vertexCount += r.length;
          });
        });
        myWidget.showVertexCount(vertexCount);
        */
      });
    },

    onExecuteOLD: function(featureSet){
      WidgetManager.getInstance().triggerWidgetOpen(this.widgetId)
      .then(function(myWidget) {
        var vertexCount = 0;
        featureSet.features.forEach(function(f){
          f.geometry.rings.forEach(function(r){
            vertexCount += r.length;
          });
        });
        myWidget.showVertexCount(vertexCount);
      });
    }

  });
  return clazz;
});