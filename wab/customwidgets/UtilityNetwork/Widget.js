define(['dojo/_base/declare', 'dijit/_WidgetsInTemplateMixin', 'jimu/BaseWidget', 'dojo/_base/lang',
  'esri/graphic', 'esri/symbols/CartographicLineSymbol',
  'esri/Color', 'esri/geometry/Polyline', 'dijit/ProgressBar',
  'jimu/dijit/LoadingShelter', 'dojo/_base/html','jimu/FeatureActionManager',
  "esri/tasks/FeatureSet", 'esri/geometry/Point', 'esri/symbols/SimpleMarkerSymbol',
  'dojo/on', 'jimu/dijit/FeatureActionPopupMenu', 'jimu/dijit/CheckBox',
  "jimu/dijit/TabContainer3", "dojo/aspect","esri/tasks/query", "esri/tasks/QueryTask",
  "esri/geometry/geometryEngine", "require", "esri/symbols/SimpleLineSymbol",
  "esri/layers/FeatureLayer",'jimu/WidgetManager','jimu/SelectionManager',
  'dojo/Deferred' /*"widgets/Demo/utilitynetwork.js"*/],


function(declare, _WidgetsInTemplateMixin, BaseWidget, lang, Graphic, 
  CartographicLineSymbol, Color, Polyline, ProgressBar, 
  LoadingShelter, html, FeatureActionManager, FeatureSet, Point, SimpleMarkerSymbol,
  on, PopupMenu, CheckBox, TabContainer3,aspect, Query, QueryTask,
  geometryEngine, require, SimpleLineSymbol, FeatureLayer, WidgetManager,
  SelectionManager, Deferred) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([ BaseWidget, _WidgetsInTemplateMixin], {
    // DemoWidget code goes here

    //please note that this property is be set by the framework when widget is loaded.
    //templateString: template,

    baseClass: 'jimu-widget-un',

    OID_PAGE: 100,

    postCreate: function() {
      this.inherited(arguments);
      console.log('postCreate');

      html.setStyle(this.progressBar.domNode, 'display', 'none');

      this.popupMenu = PopupMenu.getInstance();

      this.own(on(this.traceStatus, 'click', lang.hitch(this, function(event) {
        event.stopPropagation();
        var position = html.position(event.target);
        this.showPopup(position);
      })));

       //Set Cursors
      this.cursors = {
        start_pt_en: "url(" + this.folderUrl + "images/add_start_pt.cur),auto",
        start_pt_fr: "url(" + this.folderUrl + "images/Debut_start.cur),auto",
        end_pt_en: "url(" + this.folderUrl + "images/add_end_pt.cur),auto",
        end_pt_fr: "url(" + this.folderUrl + "images/Fin_end.cur),auto",
        sel_pt_en: "url(" + this.folderUrl + "images/select_point.cur),auto",
        sel_pt_fr: "url(" + this.folderUrl + "images/select_pt_fr.cur),auto"
      };

      //html.setStyle(this.toggleTraceResultsButton.domNode, 'display', 'none');
      //html.setStyle(this.clearTraceButton.domNode, 'display', 'none');
     

      /*
      html.setStyle(this.ckTraceVisibility.domNode, 'display', 'none');
      this.own(on(this.ckTraceVisibility.domNode, 'click', lang.hitch(this, function(event) {
        console.log(event);
        this.toggleTraceResults();
      })));
      */

      /*
      this.shelter = new LoadingShelter({
        hidden: true
      });
      this.shelter.placeAt(this.domNode);
      this.shelter.startup();
      //this.shelter.show();
      */
    },

    toggleTraceResults: function(){
      var opacity = (this.map.graphics.opacity == 1) ? 0 : 1;
      this.map.graphics.setOpacity(opacity);
    },
    openAttributeTable: function(){
      WidgetManager.getInstance().triggerWidgetOpen(this.config.attributeTableWidgetId)
      .then(function(myWidget) {
       
      });
    },
    showPopup: function(position) {
       var actions = [{
        iconClass: 'no-icon',
        label: this.nls._featureAction_ShowVertex,
        data: {},
        onExecute: lang.hitch(this, this.openAttributeTable)
      }/*,
      {
        iconClass: 'no-icon',
        label: "man",
        data: {},
        onExecute: lang.hitch(this, this.onTraceClear)
      }*/];
      this.popupMenu.setActions(actions);
      this.popupMenu.show(position);
    },
    _showPopup: function(position) {

      FeatureActionManager.getInstance().getSupportedActions(this.traceResultsFeatureSet).then(lang.hitch(this, function(actions){
        //create some DOMs to show the actions
         console.log(actions);
         var outActions = [];
         actions[6].attributeTableWidgetId = this.config.attributeTableWidgetId;
         actions[6].data = this.traceResultsFeatureSet; //.features;
         outActions.push(actions[6]);
         this.popupMenu.setActions(/*actions*/outActions);
         this.popupMenu.show(position);
      }));

      return;

      var actions = [{
        iconClass: 'no-icon',
        label: "dude",
        data: {},
        onExecute: lang.hitch(this, this.onTraceClear)
      },
      {
        iconClass: 'no-icon',
        label: "man",
        data: {},
        onExecute: lang.hitch(this, this.onTraceClear)
      }];
      this.popupMenu.setActions(actions);
      this.popupMenu.show(position);
    },
    startup: function() {
      this.inherited(arguments);
      this.mapIdNode.innerHTML = 'map id:' + this.map.id;
      console.log('startup');

      html.setStyle(this.toggleTraceResultsButton, 'display', 'none');
      html.setStyle(this.clearTraceButton, 'display', 'none');
      html.setStyle(this.traceButton, 'display', 'none');
     this._initTabs();
     /*
     this.map.infoWindow.on("set-features", lang.hitch (this,function(){
      console.log(this.map.infoWindow);
     }));*/

     this.map.on("click", lang.hitch (this,this._doId));
    },

    _doId: function(event)
    {
      console.log(event);
      if (this.state === "closed" || this.tabContainer.getSelectedTitle() === this.nls.tab1Label)
        return;
      //https://utilitynetwork.esriservices.ca/server/rest/services/Electric/FeatureServer/115
      
      html.setStyle(this.progressBar.domNode, 'display', 'block');
      

      var queryTask = new QueryTask(this.config.featureService.url);
      var queryParameters = new Query();
      queryParameters.returnGeometry = false;
      queryParameters.geometry = event.mapPoint;
      queryParameters.distance = 10;
      queryParameters.outFields = [this.config.featureService.attribute];
      queryTask.execute(queryParameters).then(lang.hitch(this, function (result) {
        if(result.features && result.features.length > 0)
        {
        var guid = result.features[0].attributes[this.config.featureService.attribute];
        console.log(guid);
          this.onTraceMapClick(guid);
        }
        else
          html.setStyle(this.progressBar.domNode, 'display', 'none');
      
      }), lang.hitch(this, function () {
        //deferred.resolve([]);
      }));

    },

    _initTabs: function(){
      var config = this.config, tabs = [];

      tabs.push({
        title: this.nls.tab1Label,
        content: this.tabContent1
      });

      
      tabs.push({
        title: this.nls.tab2Label,
        content: this.tabContent2
      });
      var self = this;
  
      this.tabContainer = new TabContainer3({
        average: true,
        tabs: tabs
      }, this.tabsNode);

       //this.own(on(window, 'resize', lang.hitch(this, this._onWindowResize)
      
      
     this.own(aspect.after(this.tabContainer,"selectTab", lang.hitch(this,function(title){
        console.warn("selectTab",title);

        if(this.tabContainer.getSelectedTitle() === this.nls.tab2Label)
        {
          html.setStyle(this.traceButton, 'display', 'none');
          if(this.map){
            this.map.setInfoWindowOnClick(false);
            this.map.setMapCursor(this.cursors["start_pt_en"/* + this.cursorSuffix*/]);
          }
        }
        else
        {
          html.setStyle(this.traceButton, 'display', 'block');
          if(this.map){
            this.map.setMapCursor("default");
            this.map.setInfoWindowOnClick(true);
          }
        }
        
      },true)));

     
    },

    onOpen: function(){
      console.log('onOpen');
      if (this.tabContainer.getSelectedTitle() === this.nls.tab2Label)
      {
        this.map.setMapCursor(this.cursors["start_pt_en"/* + this.cursorSuffix*/]);
        this.map.setInfoWindowOnClick(false);
      }
          
    },

    onNormalize: function(){
      console.log('onNormalize');
    },

    onActive: function(){
      // summary:
      //    this function will be called when widget is clicked.
      console.log('onActive');
    },

    onClose: function(){
      console.log('onClose');
      this.map.setMapCursor("default");
      this.map.setInfoWindowOnClick(true);
      this.onTraceClear();
    },

    onMinimize: function(){
      console.log('onMinimize');
      //this.map.setMapCursor("default");
      //this.map.setInfoWindowOnClick(true);
    },

    onMaximize: function(){
      console.log('onMaximize');
    },

    onSignIn: function(credential){
      /* jshint unused:false*/
      console.log('onSignIn');
      this.initUtilityNetwork(credential);
    },

    onSignOut: function(){
      console.log('onSignOut');
    },

    showVertexCount: function(count){
      this.vertexCount.innerHTML = 'The vertex count is: ' + count;
    },
    onTraceClear: function(){
      //this.map.graphics.clear();
      this.traceStatus.innerHTML = "";

      var selectionMgr = SelectionManager.getInstance();

      this.map.graphicsLayerIds.forEach (graphicLayerId=> {
        var layer = this.map.getLayer(graphicLayerId);

        //if (layer.url === this.config.unFeatureService + "/" + layerId)
        if(layer.url)
        {
          if(layer.getSelectedFeatures().length > 0) 
            selectionMgr.clearSelection(layer);
            //layer.clearSelection();
        }     
      });

      html.setStyle(this.toggleTraceResultsButton, 'display', 'none');
      html.setStyle(this.clearTraceButton, 'display', 'none');
     
    },
    _onTraceClear: function(){
      this.map.graphics.clear();
      this.traceStatus.innerHTML = "";

      html.setStyle(this.toggleTraceResultsButton, 'display', 'none');
      html.setStyle(this.clearTraceButton, 'display', 'none');
     
    },
    onTraceMapClick: function(guid){
      //_Connected
      var traceLocations = [
        {
          "globalId" : guid /*"{AFABE952-9324-4070-815E-CB6A66F561D6}"*/,
        }
      ];

      this.traceStart = new Date().getTime();

      var direction = document.getElementById('cmbTraceType').value;
      this.un.connectedTrace(traceLocations, null, direction)
      .then(lang.hitch(this, function(traceResults){
        //console.log(traceResults);
        //html.setStyle(this.ckTraceVisibility.domNode, 'display', 'block');
        
        //html.setStyle(this.toggleTraceResultsButton, 'display', 'block');
        html.setStyle(this.clearTraceButton, 'display', 'block');
     

        // this.map.graphics.setOpacity(1);
        var zoomTo = (direction === "upstream") ? true : false;
        this.drawTraceResults(traceResults, zoomTo);
        //this._zoomToTraceExtent(this.traceResultsFeatureSet.features);
        //this.shelter.hide();
        
      }))
      .catch(lang.hitch(this, function(err){
        console.log(err);
      }));

    },

    _zoomToTraceExtent: function(traceResults){
      var polylines = [];
      traceResults.forEach(function(f){
        if (f && f.geometry && f.geometry.type === "polyline")
        {
          polylines.push(f.geometry);
        }
      });

      console.log(polylines);

       // Using Module to Union
      var union = geometryEngine.union(polylines);
      this.map.setExtent(union.getExtent().expand(1.5));

    },
    onTraceClick: function() {
      //_SubNetwork
      //console.log(this.un);

      let domainNetworkName = cmbDomainNetworks.options[cmbDomainNetworks.selectedIndex].textContent;
      
      if(cmbTiers.selectedIndex === -1)
      {
        this.updateStatus("Please select a Tier.");
        return;
      }
      let tierName = cmbTiers.options[cmbTiers.selectedIndex].textContent;
      
      if(cmbSubnetworks.selectedIndex === -1)
      {
        this.updateStatus("Please select a Subnetwork.");
        return;
      }
      let subnetworkName = cmbSubnetworks.options[cmbSubnetworks.selectedIndex].textContent;
      this.traceStart = new Date().getTime();
      //this.shelter.show();
      html.setStyle(this.progressBar.domNode, 'display', 'block');
      
      this.updateStatus("");
      this.un.subnetworkTrace(domainNetworkName, tierName , subnetworkName)
      .then(lang.hitch(this, function(traceResults){
        //console.log(traceResults);
        //html.setStyle(this.ckTraceVisibility.domNode, 'display', 'block');
        
        //html.setStyle(this.toggleTraceResultsButton, 'display', 'block');
        html.setStyle(this.clearTraceButton, 'display', 'block');
     
        this.map.graphics.clear();
        //this.map.graphics.setOpacity(1);
        this.drawTraceResults(traceResults);
        //this.shelter.hide();
        
      }))
      .catch(lang.hitch(this, function(err){
        console.log(err);
      }));

      //updateStatus("Tracing...");
      //run subnetwork trace get the result and draw it
      //this.un.subnetworkTrace(domainNetworkName, tierName , subnetworkName)
      //.then(traceResults => this.drawTraceResults(traceResults))
      //.catch(err=> this.updateStatus(err));

    },

    selectTraceResultsonMap: function (layerId, objectIds)
    {
      var def = new Deferred();

      var featureLayer = null;
      this.map.graphicsLayerIds.forEach (graphicLayerId=> {
        var layer = this.map.getLayer(graphicLayerId);

        //if (layer.url === this.config.unFeatureService + "/" + layerId)
        if(layer.url)
        {
          if(layer.url.split("/")[layer.url.split("/").length - 1] === layerId) 
            featureLayer = layer; 
        }     
      });

      if (featureLayer)
      {
        var symbol = null;
        if(featureLayer.geometryType === "esriGeometryPolyline")
        {
          // Selection symbol used to draw the selected census block points within the buffer polygon
          symbol = new SimpleLineSymbol(
              SimpleLineSymbol.STYLE_SOLID, 
              new Color([255, 0, 0, 1]),  //0, 255, 255, 0.9
              5
          );
          
        }
        else if(featureLayer.geometryType === "esriGeometryPoint")
        {  
          symbol = new SimpleMarkerSymbol();
          symbol.color = null;
          symbol.outline.color = new Color([204,0,0]);
        }
        
        featureLayer.setSelectionSymbol(symbol);

        var query = new Query();
        query.objectIds = objectIds;

        // Use an objectIds selection query (should not need to go to the server)
        console.log(featureLayer.name);
        featureLayer.selectFeatures(query, FeatureLayer.SELECTION_NEW, lang.hitch(this, function(results){
          //console.log(results);
          def.resolve(results);
          //this.traceResultsFeatureSet.features.push(results);
        }));
      }
      else
        def.resolve(null);

      return def;
    },
    drawTraceResults:function(traceResults, zoomTo){
      let traceTime = (new Date().getTime() - this.traceStart);
      let drawingTime;
      let drawingStartTime = new Date().getTime();
      
      this.traceResultsFeatureSet = new FeatureSet();
      //this.traceResultsFeatureSet.features = graphics;

      let promises = [];
      for (let layerId in traceResults.layers)
      {
          let layerObj = traceResults.layers[layerId];
          promises.push(this.selectTraceResultsonMap(layerId, layerObj.objectIds));
          
      }
      
      if (zoomTo)
      {
       Promise.all(promises)
        .then(rows => 
          {   
            //console.log(rows);
            rows.forEach(lang.hitch(this, function(features){
              if(features.length > 0)
              {
                if(features[0].geometry.type === "polyline")
                {
                  //console.log("polyline");
                  this._zoomToTraceExtent(features);
                }
              }
            }));
        });
      }

        drawingTime = (new Date().getTime() - drawingStartTime);

        this.updateStatus("Trace completed successfully. Click here for details.");//" Trace time: " + traceTime + " ms, Drawing Time: " + drawingTime+ " ms");
        html.setStyle(this.progressBar.domNode, 'display', 'none');
         

    },
    _drawTraceResults:function(traceResults, zoomTo){
      console.log(traceResults);
       let traceTime = (new Date().getTime() - this.traceStart);
       let drawingTime;
            //record trace time
        console.log ("Trace time: " + traceTime + " ms");
        let drawingStartTime = new Date().getTime();
        let promises = [];
        for (let layerId in traceResults.layers)
        {
            let layerObj = traceResults.layers[layerId];
            //this.selectTraceResultsonMap(layerId, layerObj.objectIds);
            
            let subOids = this.createGroupedArray(layerObj.objectIds, this.OID_PAGE);
            subOids.forEach(oidGroup =>  promises.push(this.un.query(layerId, "1=1", layerObj, oidGroup.join(","))));            
        }
          //query all layers at once and wait until all results come in at
        Promise.all(promises)
        .then(rows => 
            {   
                //mapView.graphics = [];
                this.map.graphics.clear();
                let graphics = [];
                let geometries = [];
                //let featureLayer = mapView.byId(rows.layerId);
                for (let featureSet of rows)
                {
                    let layerObj = featureSet.obj;
                    if (featureSet.features != undefined)
                    featureSet.features.forEach(g => graphics.push( this.getGraphic(layerObj.type, g.geometry)) )                    
                
                    
                }

                
                this.traceResultsFeatureSet = new FeatureSet();
                this.traceResultsFeatureSet.features = graphics;

                if(zoomTo)
                  this._zoomToTraceExtent(this.traceResultsFeatureSet.features);
        

                //FeatureActionManager.getInstance().getSupportedActions(this.traceResultsFeatureSet).then(lang.hitch(this, function(actions){
                  //create some DOMs to show the actions
                //   console.log(actions);
                //}));
                
                
                drawingTime = (new Date().getTime() - drawingStartTime)
                console.log ("Drawing time: " + drawingTime + " ms");
                                 
                 //mapView.graphics.addMany(graphics);

                graphics.forEach(graphic => 
                  {
                  if (graphic != undefined)
                    this.map.graphics.add(graphic)
                  }
                );            
     
                this.updateStatus("Trace completed successfully. Trace time: " + traceTime + " ms, Drawing Time: " + drawingTime + " ms");
                //this.shelter.hide(); 
                html.setStyle(this.progressBar.domNode, 'display', 'none');
            })
        .catch(err => this.updateStatus("Error while parsing trace results"))
    },

    //break array into manageable pieces 
    createGroupedArray: function(arr, chunkSize){
        let groups = [], i;
        for (let i = 0; i < arr.length; i += chunkSize) {
            groups.push(arr.slice(i, i + chunkSize));
        }
        return groups;
    },
    updateStatus: function(status){
      console.log(status);
      this.traceStatus.innerHTML = status;
    },

    initUtilityNetwork: async function(credential){
     
     require([this.folderUrl + "utilitynetwork.js"],
       lang.hitch(this, function(){
          // further processing actions
          //let serviceUrl = "https://utilitynetwork.esriservices.ca/server/rest/services/Electric/FeatureServer"
          //let un = new UtilityNetwork(credential.token, serviceUrl );
          this._initUtilityNetwork(credential);
       }));
    },
 
    _initUtilityNetwork: async function(credential){
      //let serviceUrl = this.map.getLayer(this.map.graphicsLayerIds[2]).url;
      let serviceUrl = this.config.unFeatureService; // "https://utilitynetwork.esriservices.ca/server/rest/services/Electric/FeatureServer"
      let un = new UtilityNetwork(credential.token, serviceUrl );
      let serviceJson = un.featureServiceJson;

      //load utility network in memory
      await un.load();

      this.un = un;
      let cmbDomainNetworks = document.getElementById('cmbDomainNetworks');
      let cmbTiers = document.getElementById('cmbTiers');
      let cmbSubnetworks = document.getElementById('cmbSubnetworks');
      //when a user selects a domain network
      //cmbDomainNetworks.onchange = e => {  
      //  console.log(e.target);
      //}

      cmbDomainNetworks.onchange = lang.hitch(this, function(e){
         console.log(e.target);

         //clear tiers, subnetworks
        while(cmbTiers.firstChild)cmbTiers.removeChild(cmbTiers.firstChild);
        while(cmbSubnetworks.firstChild)cmbSubnetworks.removeChild(cmbSubnetworks.firstChild); 
        let selectedDomainNetwork = e.target.options[e.target.selectedIndex].textContent;

        let domainNetwork = this.un.getDomainNetwork(selectedDomainNetwork);

        domainNetwork.tiers.forEach(tier => { 
            let tn = document.createElement("option");
            tn.textContent  = tier.name;
            cmbTiers.appendChild(tn);
        })
        cmbTiers.selectedIndex=-1;

      });

      cmbTiers.onchange = lang.hitch(this, function(e){
          while(cmbSubnetworks.firstChild)cmbSubnetworks.removeChild(cmbSubnetworks.firstChild);
          let selectedDomainNetwork = cmbDomainNetworks.options[cmbDomainNetworks.selectedIndex].textContent;
          let selectedTier = cmbTiers.options[cmbTiers.selectedIndex].textContent;

          //updateStatus("Querying subnetworks ...")
          this.un.getSubnetworks(selectedDomainNetwork,selectedTier)
          .then(results=>{
          //updateStatus("Done")
          results.features.forEach(feature=> {
              let sn = document.createElement("option");
              for (let propt in feature.attributes)
                  if (propt.toUpperCase() === "SUBNETWORKNAME")
                  sn.textContent  = feature.attributes[propt];
              
              cmbSubnetworks.appendChild(sn);
          })
          cmbSubnetworks.selectedIndex=-1;
          })
      });

      cmbSubnetworks.onchange = lang.hitch(this, function(e){
        let subnetworkName = cmbSubnetworks.options[cmbSubnetworks.selectedIndex].textContent;
        this.highlightSubnetwork(subnetworkName);
        html.setStyle(this.traceButton, 'display', 'block');
      });

      un.dataElement.domainNetworks.forEach(lang.hitch(this, function(domainNetwork){
        console.log(domainNetwork.domainNetworkName);
        let dn = document.createElement("option");
        dn.textContent  = domainNetwork.domainNetworkName;
        cmbDomainNetworks.appendChild(dn);
      }));

      /*
      var self = this;
      un.dataElement.domainNetworks.forEach(lang.hitch(this, domainNetwork => { 
        console.log(domainNetwork.domainNetworkName);
        let dn = document.createElement("option");
        dn.textContent  = domainNetwork.domainNetworkName;
        cmbDomainNetworks.appendChild(dn);
      }));
      */ 

    },
    highlightSubnetwork: function (subnetworkName){
      this.un.query(this.un.subnetLineLayerId, "SUBNETWORKNAME = '" + subnetworkName + "'")
        .then (lang.hitch (this, function (rowsJson){
          console.log(rowsJson);

          var polylineJson = {
            "paths": rowsJson.features[0].geometry.paths,
            "spatialReference":{"wkid":this.map.spatialReference.wkid}
          };

          var polyline = new Polyline(polylineJson);

          var lineSymbol = new CartographicLineSymbol(
              CartographicLineSymbol.STYLE_SOLID,
              new Color([0,0,255]), 5, 
              CartographicLineSymbol.CAP_ROUND,
              CartographicLineSymbol.JOIN_MITER, 5
          );
                     
          var graphic = new Graphic(polyline, lineSymbol);
          this.map.graphics.clear();
          this.map.graphics.add(graphic);

          this.map.setExtent(graphic.geometry.getExtent()/*.expand(1.5)*/);

        }));
    },
    highlightSubnetworkOLD: function (subnetworkName){

      this.un.query(this.un.subnetLineLayerId, "SUBNETWORKNAME = '" + subnetworkName + "'")
        .then (lang.hitch (this, rowsJson => {
          console.log(rowsJson);
            //let featureLayer = mapView.byId(un.subnetLineLayerId);       
            
            var graphic = new Graphic(rowsJson.features[0].geometry);

            var polylineGraphic = this.getGraphic("line", rowsJson.features[0].geometry);        
            this.map.graphics.add(polylineGraphic);
            //mapView.graphics.add(polylineGraphic);
            //mapView.then(e=>mapView.goTo(polylineGraphic.geometry));
            }))
        .catch(err=> console.log(err) /*updateStatus("Failed to highlight subnetwork. Make sure you run update subnetworks to create the subnetlines.  ")*/)

    },
    getGraphic: function(type, geometry){
      var graphic;
      switch (type){
        case "point" :
                   
          var sms = new SimpleMarkerSymbol();

          var point = new Point( {"x": geometry.x, "y": geometry.y, "spatialReference": {"wkid": this.map.spatialReference.wkid } });
          graphic = new Graphic(point, sms);

          break;

        case "line":
          var polylineJson = {
            "paths": geometry.paths,
            "spatialReference":{"wkid":this.map.spatialReference.wkid}
          };

          var polyline = new Polyline(polylineJson);

          var lineSymbol = new CartographicLineSymbol(
              CartographicLineSymbol.STYLE_SOLID,
              new Color([255,0,0]), 5, 
              CartographicLineSymbol.CAP_ROUND,
              CartographicLineSymbol.JOIN_MITER, 5
          );
          graphic = new Graphic(polyline, lineSymbol);
          break;
        default:
      }
      
      //geometry.spatialReference = this.map.spatialReference;
      //var graphic = new Graphic(geometry, lineSymbol);
      return graphic;
      //return new Graphic(geometry, lineSymbol);

    }
  });
});