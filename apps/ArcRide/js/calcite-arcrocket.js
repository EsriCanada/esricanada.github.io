define([ 
  "dojo/_base/declare",
  "dojo/_base/connect",
  "dojo/query",
  "dojo/dom-construct",
  "esri/arcgis/utils",
  "dijit/layout/ContentPane",
  "dojo/dom-class",
  "dojo/dom",
  "esri/domUtils",
  "esri/request",
  "esri/config",
  "dojo/_base/array",
  "esri/dijit/BasemapToggle",
  "esri/geometry/Extent",
  "dojo/on",
  "esri/dijit/LocateButton",
  "esri/graphic",
  "dojo/promise/all",
  "esri/geometry/webMercatorUtils",
  "dojo/cookie",
  "esri/tasks/query", "esri/tasks/QueryTask",
  "esri/layers/FeatureLayer",
  "esri/geometry/Point"

], 
function(declare, connect, query, domConstruct, arcgisUtils, ContentPane,
				 domClass, dom, domUtils, esriRequest, esriConfig, array, BasemapToggle,
				 Extent,on,LocateButton,Graphic, all, webMercatorUtils,
         cookie, Query, QueryTask, FeatureLayer, Point) {
  
  var AGENCY = "ttc"
	var RESTBUS_API = "https://koop.esri.ca/restbus/"
  
  var ArcRocket = declare(null, {

		_this: null,
    _useLocalStorage: null,
    _storageName: 'stop_favorites',

		constructor: function (options) {

      
			//console.log(options);
			esriConfig.defaults.io.corsEnabledServers.push("koop.esri.ca"); //restbus.info
			_this = this;
      //_this.selectedRouteId = "all";
      _this.agency = AGENCY;
      _this.restbusUrl = RESTBUS_API + "/agencies/" + AGENCY;
      _this.restbusBaseUrl = RESTBUS_API;

      //if(_this.findBootstrapEnvironment() !== "xs")
      //  $('.panel-body').niceScroll({/*cursoropacitymin:0.5,*/horizrailenabled:false});

			//_this.map = options.app.map;
			//_this._init();
			_this.j = 0;
      _this.webmapId = options;
      _this.mapDiv = options.div;

			_this.queryObject = getQueryObject();

      
      function getQueryObject(){
        var query = window.location.search;
        if (query.indexOf('?') > -1) {
          query = query.substr(1);
        }
        var pairs = query.split('&');
        var queryObject = {};
        for(var i = 0; i < pairs.length; i++){
          var splits = decodeURIComponent(pairs[i]).split('=');
          queryObject[splits[0]] = splits[1];
        }
        return queryObject;


      }
			//esriConfig.defaults.io.proxyUrl = "http://localhost/proxy_dotnet/proxy.ashx";

			esriRequest.setRequestPreCallback(_this._myCallbackFunction);

      if (_this.queryObject && _this.queryObject.route){
        _this._handleQueryString(_this.queryObject.route, options);
      }
      else{
        arcgisUtils.createMap(options.webmapId, options.div).then(function(response){
          _this.map = response.map;
          _this._init();
        });
      }

      _this._useLocalStorage = supports_local_storage();
      // source for supports_local_storage function:
      // http://diveintohtml5.org/detect.html
      function supports_local_storage() {
        try {
          return 'localStorage' in window && window['localStorage'] !== null;
        } catch( e ){
          return false;
        }
      }

      /*
      if(_this.queryObject.routeId)
      {
          _this.stopsId = _this.queryObject.routeId;
          _this.selectedRouteId = _this.queryObject.routeId;

          setTimeout(function(){

            console.log("asdadsf");
            _this._swizzleLabelExpression(_this.queryObject.routeId, true);
            _this.retrieveNextbusRouteConfig(_this.queryObject.routeId);
            _this.map.getLayer(_this.map.graphicsLayerIds[0]).refresh();
          }
          , 100);

          //_this._swizzleLabelExpression(_this.queryObject.routeId, true);
          //_this.retrieveNextbusRouteConfig(_this.queryObject.routeId);
          //_this.map.getLayer(_this.map.graphicsLayerIds[0]).refresh();
      }*/



		},
    _handleQueryString: function(routeId, options){
      //"http://restbus.info/api/agencies/ttc/routes/"
      
      //get the route extent from restbus
      var routeConfig = esriRequest({
        "url": _this.restbusUrl + "/routes/" + routeId
      });
      //get the webmap json from AGOL
      var webmapInfo = arcgisUtils.getItem(options.webmapId);

      //wait for the 2 requests to finish
      all([routeConfig, webmapInfo]).then(function(results){
        console.log(results);
        //swizzle urls to featurelayers in the webmap json
        var parts = results[1].itemData.operationalLayers[1].url.split('/');
        var routePart = parts[5];
        results[1].itemData.operationalLayers[1].url = results[1].itemData.operationalLayers[1].url.replace(routePart, queryObject.route + "_vehicles");

        parts = results[1].itemData.operationalLayers[0].url.split('/');
        routePart = parts[5];

        results[1].itemData.operationalLayers[0].url = results[1].itemData.operationalLayers[0].url.replace(routePart, queryObject.route + "_stops");

        //get the extent from restbus response
        var xmin = results[0].bounds.sw.lon;
        var ymin = results[0].bounds.sw.lat;
        var xmax = results[0].bounds.ne.lon;
        var ymax= results[0].bounds.ne.lat;

        //swizzle extent in the webmap json to the restbus extent
        results[1].item.extent[0][0] = results[0].bounds.sw.lon;
        results[1].item.extent[0][1] = results[0].bounds.sw.lat;
        results[1].item.extent[1][0] = results[0].bounds.ne.lon;
        results[1].item.extent[1][1] = results[0].bounds.ne.lat;

        //modify label expression in the webmap json
        if(_this.queryObject.route.length === 2)
          results[1].itemData.operationalLayers[1].layerDefinition.drawingInfo.labelingInfo[0].labelExpressionInfo.expression = "Mid($feature.dirTag,5,3)"
        else if (_this.queryObject.route.length  === 3)
          results[1].itemData.operationalLayers[1].layerDefinition.drawingInfo.labelingInfo[0].labelExpressionInfo.expression = "Mid($feature.dirTag,6,4)"

        arcgisUtils.createMap(results[1], _this.mapDiv).then(function(response){
          _this.map = response.map;
          _this._init();
        });;

      });

    },

    findBootstrapEnvironment: function() {
      var envs = ['xs', 'sm', 'md', 'lg'];

      var $el = $('<div>');
      $el.appendTo($('body'));

      for (var i = envs.length - 1; i >= 0; i--) {
          var env = envs[i];

          $el.addClass('hidden-'+env);
          if ($el.is(':hidden')) {
              $el.remove();
              return env;
          }
      }
  },
		_init: function() {

			_this.cp = new ContentPane();
      _this.cp.startup();

      domConstruct.place(_this.cp.domNode, query("#popup")[0], "after");
      //$('html').niceScroll();
      //$('.calcite-panels').niceScroll({cursoropacitymin:0 /*.5*/,horizrailenabled:false});

			_this.map.infoWindow.set("popupWindow", false);

			var popup = _this.map.infoWindow;

      //when the selection changes update the side panel to display the popup info for the 
      //currently selected feature. 
      connect.connect(popup, "onSelectionChange", function(){
          var feature = popup.getSelectedFeature();
          if (feature === undefined) 
              return;
          
          
          _this.displayPopupContent(feature);
          domUtils.hide(dom.byId("logo"));
          
          if(feature.attributes["stopId"])
          {
              _this.retrieveNextbusVehiclePrediction(feature.attributes["stopId"]);
          }

      });

      //when the selection is cleared remove the popup content from the side panel. 
      connect.connect(popup, "onClearFeatures", function(){
         _this.clearContent();
      });

      //When features are associated with the  map's info window update the sidebar with the new content. 
      connect.connect(popup, "onSetFeatures", function(){
          //displayPopupContent(popup.getSelectedFeature());
          dom.byId("featureCount").innerHTML = popup.features.length + " stop(s) selected";

          if (popup.features.length === 1)
            $('#featureCount').css("display", "none");
          else
            $('#featureCount').css("display", "block");
          //enable navigation if more than one feature is selected 
          popup.features.length > 1 ? domUtils.show(dom.byId("pager")) : domUtils.hide(dom.byId("pager"));
      });

      connect.connect(_this.map, "onClick", function(e){
        if (_this.map.infoWindow.features === null)
         {
          console.log(e);
          var point = webMercatorUtils.webMercatorToGeographic(e.mapPoint);

          _this._requestNextbusPredictions(point.y, point.x);

         }
      });

      $('.list-group-item').on('click', function() {
        console.log($(this));
      });
      query(".list-group-item").on("click", function(e){
        //console.log(e);
        var routeId = $(this)[0].attributes["data-routeid"].value;
        $("#mySelect" ).val(routeId);

        var stopId = $(this)[0].attributes["data-stopid"].value;
        
        _this.stopsId = routeId;
        _this.selectedRouteId = routeId;
        //_this.retrieveNextbusRouteConfig(routeId);
        _this._swizzleLabelExpression(routeId, false);
        //_this.map.getLayer(_this.map.graphicsLayerIds[0]).refresh();
        _this.clearContent();

        var queryTask = new QueryTask("https://koop.esri.ca/ttc/featureserver/501_stops");

        var query = new Query();
        query.where = "stopId='" + stopId + "'";
        query.returnGeometry = true;

        queryTask.execute(query, function(response){
          console.log(response);
          _this.map.centerAndZoom(response.features[0].geometry,15).then(
            function(){

              var currentMapCenter = _this.map.extent.getCenter();
              //Emulate a click on the map center point
              //_this.map.emit("click", { mapPoint: currentMapCenter });
              setTimeout(function(){
                _this.map.emit("click", { bubbles: true, cancelable: true, screenPoint: _this.map.toScreen(_this.map.extent.getCenter())});
              }, 2000);
              //_this.displayPopupContent(response.features[0]);
              //_this.retrieveNextbusVehiclePrediction(stopId);
        
              /*
              setTimeout(function(){
                var fLayer =_this.map.getLayer(_this.map.graphicsLayerIds[0]);
                fLayer.selectFeatures(query, FeatureLayer.SELECTION_NEW);
              }, 2000);*/
            });
          
          
          //_this.displayPopupContent(response.features[0]);
          //_this.retrieveNextbusVehiclePrediction(stopId);
        },function(error){});



        //_this.map.getLayer(_this.map.graphicsLayerIds[0]).refresh();
        //_this.map.getLayer(_this.map.graphicsLayerIds[1]).refresh();
          /*
           setTimeout(function(){
            _this.map.getLayer(_this.map.graphicsLayerIds[0]).refresh();
            _this.map.getLayer(_this.map.graphicsLayerIds[1]).refresh();
             }
          , 500);*/
          /*
        var stopsLayer = _this.map.getLayer(_this.map.graphicsLayerIds[0]);
        setTimeout(function(){
          var geometry;
          array.some(stopsLayer.graphics, function(graphic){
            if(graphic.attributes["stopId"] == stopId){
              geometry = graphic.geometry;
              return false;
            }
          });
        }, 1000);
        */

        //console.log(geometry);
        //_this.map.infoWindow.selectPrevious();
      });

      query("#logo").on("click", function(e){
        _this.openPanel("#panelFavorites");
      });

      query("#previousButton").on("click", function(e){
        _this.map.infoWindow.selectPrevious();
      });

      query("#nextButton").on("click", function(e){
        _this.map.infoWindow.selectNext();
      });
      query("#favoriteButton").on("click", function(e){
        
        var feature =_this.map.infoWindow.getSelectedFeature();

        if (feature !== undefined)
        {
          if(feature.attributes["stopId"])
          {
            //console.log(feature.attributes);

            if (!_this._isFavoriteStored(feature.attributes["stopId"]))
            {
              var favorite = {"stopId": feature.attributes["stopId"],
                "title":feature.attributes["title"]
              };
              //_this._refreshFavorites(favorite);
              _this._updateFavorites(favorite);
              $('.esri-icon-favorites').css('color', 'yellow');
  
            }
            else
            {
              _this._removeFavorite(feature.attributes["stopId"]);
               $('.esri-icon-favorites').css('color', 'rgb(63, 166, 255)');
            }


            
          }
        }
       
        //console.log($('.esri-icon-favorites').css('color'));
      });
      query("#refreshButton").on("click", function(e){
        console.log("refresh");
        var feature =_this.map.infoWindow.getSelectedFeature();

        if (feature !== undefined)
        {
          if(feature.attributes["stopId"])
          {
            //_this.clearContent();
            var content = feature.getContent();
            var height = $('div#collapseInfo').css("height");
            
            $('div#collapseInfo').css("height", height);
            _this.cp.set("content", content);
            //$('div#collapseInfo').css("height", "auto");
            _this.retrieveNextbusVehiclePrediction(feature.attributes["stopId"]);
            //$('div#collapseInfo').css("height", height);  
          }
        }
        else if (_this.closestStopId !== undefined) //from hitting the LocateButton
        {
          _this.clearContent();
          _this.retrieveNextbusVehiclePrediction(_this.closestStopId);
          //console.log(_this.closestStopId);
        }

       


      });

     	_this._initBasemapToggle();

     	_this.retrieveRestbusRoutes();

     	$("#mySelect" ).change(_this.routeSelectChanged);

      //$("#ex1").slider({ reversed : true});

      var RGBChange = function() {
        //console.log(r.getValue());
        var opacity = 1 - (r.getValue() / 100);
        //var opacity = 1 - (r.getValue() / 100);
        //console.log(opacity);
        _this.map.getLayer(_this.map.layerIds[0]).setOpacity(opacity);
      };

      var r = $('#ex1').slider().on('slide', RGBChange).data('slider');

      _this._initLocateButton();

      _this.populateFavoritesWidget();
      /*
      if (_this.queryObject.routeId)
      {
          _this._swizzleLabelExpression(_this.queryObject.routeId, false);
          _this.retrieveNextbusRouteConfig(_this.queryObject.routeId);
      }*/

		},

    populateFavoritesWidget: function(){
      
      if ($('.list-group').length > 0)
        $('.list-group')[0].innerHTML = "";

      var stopFaves;
      if ( _this._useLocalStorage ) {
        stopFaves = window.localStorage.getItem(_this._storageName);
      } else {
        stopFaves = cookie(_this._storageName);
      }

      var favArray = [];
      if(stopFaves !== null)
      {
        var stopFavesJSON = JSON.parse(stopFaves);
        var j = -1;
        for (var i = 0; i < stopFavesJSON.length; i++)
        {

          var str1 = '<a href="javascript:void(0)" class="list-group-item" data-routeid="' + stopFavesJSON[i].routeId + '" data-stopid="' + stopFavesJSON[i].stopId + '" data-stopLocation="' + stopFavesJSON[i].stopLocation + '">';
          var str2 = '<div class="flex-container" >';
          var str3 = '<div style="flex-grow: 1"><div class="route-number">' + stopFavesJSON[i].routeId + '</div></div>';
          var str4 = '<div style="flex-grow: 6"><div style="flex-direction: column;"">';
          var str5 = '<h4>'+ stopFavesJSON[i].stopTitle/*stopFavesJSON[i].routeTitle*/ +'</h4>';
          var str6 = '<div>' + stopFavesJSON[i].direction  + '</div>';
          var str7='</div></div></div></a>';
          
          var res = str1.concat(str2,str3,str4,str5,str6,str7);
          
          $('.list-group').append(res);

        }
      }

      $('.list-group-item').on('click', function() {
        console.log($(this));
        var routeId = $(this)[0].attributes["data-routeid"].value;
        var stopId = $(this)[0].attributes["data-stopid"].value;
        var stopLoc = $(this)[0].attributes["data-stopLocation"].value;
        var lon = parseFloat(stopLoc.split(",")[0]);
        var lat = parseFloat(stopLoc.split(",")[1]);

        _this._highlightStop(routeId, stopId, lon, lat);
      
      });

      //$('.list-group').append("<a href='#' class='list-group-item'><h4 class='list-group-item-heading'>Dude</h4><p class='list-group-item-text'>Man</p></a>");
    


    },

    _highlightStop: function(routeId, stopId, lon, lat)
    {
      $("#mySelect" ).val(routeId);
     
      _this.stopsId = routeId;
      _this.selectedRouteId = routeId;
      //_this.retrieveNextbusRouteConfig(routeId);
      _this._swizzleLabelExpression(routeId, false);
      //_this.map.getLayer(_this.map.graphicsLayerIds[0]).refresh();
      _this.clearContent();

      var point = new Point( {"x": lon, "y": lat, "spatialReference": {"wkid": 4326 } })

      on.once(_this.map.getLayer(_this.map.graphicsLayerIds[0]),"update-end", function(){
        //console.log("dude");
        _this.map.emit("click", { bubbles: true, cancelable: true, screenPoint: _this.map.toScreen(_this.map.extent.getCenter())});
           
      });

      _this.map.centerAndZoom(point,15).then(
          function(){

            //_this.map.emit("click", { bubbles: true, cancelable: true, screenPoint: _this.map.toScreen(point)});
           

            var currentMapCenter = point; // _this.map.extent.getCenter();
            //Emulate a click on the map center point
            //_this.map.emit("click", { mapPoint: currentMapCenter });
            //setTimeout(function(){
            //  _this.map.emit("click", { bubbles: true, cancelable: true, screenPoint: _this.map.toScreen(_this.map.extent.getCenter())});
            //}, 500);

            setTimeout(function(){
              require(["dojo/window"], function(win){
                //var routeId = JSON.parse(window.localStorage["stop_favorites"])[0].routeId
                var routeId = _this.selectedRouteId;
                //var node =$('[class^="timer185"]')[1];
                var node =$('[class^="timer' + routeId+ '"]')[1];
                if (node !== undefined)
                {
                //console.log(node);
                //if there's more than 2 predictions, and the selected stop
                //appears below the first 2 predictions in the widget, then scroll down
                  if ($('[class^="timer"]').length > 2)
                  {
                    for (var i = 0; i < $('[class^="timer"]').length; i++)
                    {
                      console.log($('[class^="timer"]')[i].attributes["class"].value);
                      if ($('[class^="timer"]')[i].attributes["class"].value.indexOf(routeId) != -1 && i > 1)
                      {
                        win.scrollIntoView(node);
                        break;
                      }
                    }
                    
                    //win.scrollIntoView(node);
                  }
                }
              });

            }, 1000);
           
      });
        
      return;

      

      var queryTask = new QueryTask("https://koop.esri.ca/ttc/featureserver/"+ routeId +"_stops");

      var query = new Query();
      query.where = "stopId='" + stopId + "'";
      query.returnGeometry = true;

      queryTask.execute(query, function(response){
        console.log(response);
        _this.map.centerAndZoom(response.features[0].geometry,15).then(
          function(){

            var currentMapCenter = _this.map.extent.getCenter();
            //Emulate a click on the map center point
            //_this.map.emit("click", { mapPoint: currentMapCenter });
            setTimeout(function(){
              _this.map.emit("click", { bubbles: true, cancelable: true, screenPoint: _this.map.toScreen(_this.map.extent.getCenter())});
            }, 1000);
            //_this.displayPopupContent(response.features[0]);
            //_this.retrieveNextbusVehiclePrediction(stopId);
      
            /*
            setTimeout(function(){
              var fLayer =_this.map.getLayer(_this.map.graphicsLayerIds[0]);
              fLayer.selectFeatures(query, FeatureLayer.SELECTION_NEW);
            }, 2000);*/
          });
        
        
        //_this.displayPopupContent(response.features[0]);
        //_this.retrieveNextbusVehiclePrediction(stopId);
      },function(error){});
    },
    _isFavoriteStored: function(stopId)
    {
      var isStored = false;

      if ( _this._useLocalStorage ) {
        stopFaves = window.localStorage.getItem(_this._storageName);
      } else {
        stopFaves = cookie(_this._storageName);
      }

      if (stopFaves != null)
      {

        if(stopFaves.indexOf(stopId) != -1)
          isStored = true
      }

      return isStored;

    },
    _removeFavorite: function(stopId){
      var stopFaves;
      if ( _this._useLocalStorage ) {
        stopFaves = window.localStorage.getItem(_this._storageName);
      } else {
        stopFaves = cookie(_this._storageName);
      }

      var favArray = [];
      if(stopFaves !== null)
      {
        var stopFavesJSON = JSON.parse(stopFaves);
        var j = -1;
        for (var i = 0; i < stopFavesJSON.length; i++) { 
          var stop = stopFavesJSON[i];
          if (stop.stopId === stopId)
            j = i;
        }
        console.log(j);
        if (j > -1)
        {
          delete stopFavesJSON[j];
          stopFavesJSON.splice(j, 1);
          if ( _this._useLocalStorage ) {
            window.localStorage.setItem(_this._storageName, JSON.stringify(stopFavesJSON));
          } else {
            var exp = 7; // number of days to persist the cookie
            cookie(_this._storageName, JSON.stringify(stopFavesJSON), { 
              expires: exp
            });
          }
        }
      }
    },
    _updateFavorites: function(favorite){

      // Look for stored bookmarks
      var stopFaves;
      if ( _this._useLocalStorage ) {
        stopFaves = window.localStorage.getItem(_this._storageName);
      } else {
        stopFaves = cookie(_this._storageName);
      }

      var favArray = [];
      if(stopFaves === null)
      {
        favArray.push(favorite);
        //var stopFavesJSON = JSON.parse(stopFaves);
      }
      else
      {
        favArray = JSON.parse(stopFaves);
        favArray.push(favorite);
      }

      if ( _this._useLocalStorage ) {
        window.localStorage.setItem(_this._storageName, JSON.stringify(favArray));
      } else {
        var exp = 7; // number of days to persist the cookie
        cookie(_this._storageName, JSON.stringify(favArray), { 
          expires: exp
        });
      }

    },
    _handleFavorites: function(){
      // Look for stored bookmarks
      var bmJSON;
      if ( _this._useLocalStorage ) {
        bmJSON = window.localStorage.getItem(_this._storageName);
      } else {
        bmJSON = cookie(_this._storageName);
      }

      return bmJSON;
    },

    _refreshFavorites: function (favorite) {
      if ( _this._useLocalStorage ) {
        window.localStorage.setItem(_this._storageName, JSON.stringify(favorite));
      } else {
        var exp = 7; // number of days to persist the cookie
        cookie(_this._storageName, dojo.toJson(favorite), { 
          expires: exp
        });
      }
    },

    _initLocateButton: function(){
      var geoLocate = new LocateButton({
        map: _this.map
      }, "LocateButton");
      geoLocate.startup();

      geoLocate.scale = 4500;

      geoLocate.on("locate", function(e){
        console.log(e.position.coords);
        //TEST
        //e.position.coords.latitude = 52;
        //e.position.coords.longitude = -73;
        //http://restbus.info/api/locations/37.784825,-122.395592/predictions
        //http://restbus.info/api/locations/
         
        /*
         var requestHandle = esriRequest({
    "url":  _this.restbusBaseUrl + "/locations/"+ e.position.coords.latitude + "," + e.position.coords.longitude + "/predictions"
        });
        requestHandle.then(_this._requestPredictionsAtLocationSucceeded, _this.requestFailed);
        */

        _this._requestNextbusPredictions(e.position.coords.latitude, e.position.coords.longitude);

      });

    },

    _requestNextbusPredictions: function (latitude, longitude){
      var requestHandle = esriRequest({
    "url":  _this.restbusBaseUrl + "/locations/"+ latitude + "," + longitude + "/predictions"
        });
        requestHandle.then(_this._requestPredictionsAtLocationSucceeded, _this.requestFailed);

    },
    _requestPredictionsAtLocationSucceeded: function(response, io){
      //console.log(response);
      //domUtils.hide(dom.byId("refresh"));

      if (response && response.length > 0)
      {
        var agency = response[0].agency.id;
        if (agency == _this.agency)
        {
          var routeId = response[0].route.id;
          console.log("closest stop: " + routeId);
          $("#mySelect" ).val(routeId);

          _this.closestStopId = response[0].stop.id;

          _this.stopsId = routeId;
          _this.selectedRouteId = routeId;

          _this._swizzleLabelExpression(routeId, true);

          //return;
          setTimeout(function(){
            _this.map.getLayer(_this.map.graphicsLayerIds[0]).refresh();
            _this.map.getLayer(_this.map.graphicsLayerIds[1]).refresh();
             }
          , 500);

          /*
          domUtils.hide(dom.byId("logo"));
          _this.clearContent();
          _this.openPanel();
          _this.displayVehiclePredictions(response, true, false);
          */
          
         
        }
      }
    },

		_initBasemapToggle: function(){
			_this.map.basemapLayerIds = [];
      _this.map.basemapLayerIds.push("VectorTile_2249");

			_this.map.setBasemap("streets-night-vector");

     var toggle = new BasemapToggle({
        map: _this.map,
        /*basemaps: basemaps,*/
        basemap: "streets-navigation-vector"
      }, "BasemapToggle");
      toggle.startup();

      toggle.basemaps["streets-navigation-vector"].title = "Day";
      toggle.basemaps["streets-night-vector"].title = "Night";

      var mapExtentChange = toggle.on("toggle", function(e){
      	//console.log("due");
        $('#ex1').slider('setValue', 0, true);
      	if (e.currentBasemap === "streets-navigation-vector")
      	{
      		$('.navbar').removeClass("calcite-bg-dark");
      		$('.navbar').addClass("calcite-bg-light");

      		$('.navbar').removeClass("calcite-text-light");
      		$('.navbar').addClass("calcite-text-dark");

      		$('.calcite-panels').removeClass("calcite-bg-dark");
      		$('.calcite-panels').addClass("calcite-bg-light");

      		$('.calcite-panels').removeClass("calcite-text-light");
      		$('.calcite-panels').addClass("calcite-text-dark");

          $('.slider-track-high').css("background", "palegoldenrod");
          //$('.list-group-item').css("background-color", "#fff");
          //$('.esri-icon-favorites').css('color', 'orange')
          //$('a.list-group-item:hover').css("background-color", "blue");
      	}
      	else {
      		$('.navbar').removeClass("calcite-bg-light");
      		$('.navbar').addClass("calcite-bg-dark");

      		$('.navbar').removeClass("calcite-text-dark");
      		$('.navbar').addClass("calcite-text-light");

      		$('.calcite-panels').removeClass("calcite-bg-light");
      		$('.calcite-panels').addClass("calcite-bg-dark");

      		$('.calcite-panels').removeClass("calcite-text-dark");
      		$('.calcite-panels').addClass("calcite-text-light");

          $('.slider-track-high').css("background", "dodgerblue");

          //$('.list-group-item').css("background-color", "rgb(51, 51, 51)");
          //$('a.list-group-item:hover').css("background-color", "red");
          //$('.esri-icon-favorites').css('color', 'rgb(63, 166, 255)')
      	}
      });

      //calcite-text-light 	
      connect.connect(toggle, "toggle", function(){
      	console.log("due");
      	
      });
		},

		routeSelectChanged: function(){
        //console.log(document.getElementById("mySelect").value);

      var routeId = document.getElementById("mySelect").value;
      if (routeId === undefined) return;

      if (routeId !== "intro")
      {
          _this.stopsId = routeId;
          _this.selectedRouteId = routeId;
          _this.retrieveNextbusRouteConfig(routeId);
          _this._swizzleLabelExpression(routeId, true);
          //_this.map.getLayer(_this.map.graphicsLayerIds[0]).refresh();
          _this.clearContent();
      }

    },

    retrieveNextbusRouteConfig: function(routeId){
        //console.log(stopId);
        //http://restbus.info/api/agencies/ttc/routes/
         var requestHandle = esriRequest({
    "url": _this.restbusUrl + "/routes/"+ routeId
        });
        requestHandle.then(_this._requestRouteConfigSucceeded, _this.requestFailed);
    },

    _requestRouteConfigSucceeded: function(response, io){
        //console.log(response);

        var xmin = response.bounds.sw.lon;
        var ymin = response.bounds.sw.lat;
        var xmax = response.bounds.ne.lon;
        var ymax= response.bounds.ne.lat;

        var extent = new esri.geometry.Extent({"xmin":xmin,"ymin":ymin,"xmax":xmax,"ymax":ymax,"spatialReference":{"wkid":4326}});

        _this.map.setExtent(extent.expand(1.5));

    },


		retrieveRestbusRoutes: function(){
        //console.log(stopId);
        //"http://restbus.info/api/agencies/ttc/routes/"
         var requestHandle = esriRequest({
    "url": _this.restbusUrl + "/routes/"
        });
        requestHandle.then(_this._requestRoutesSucceeded, _this.requestFailed);
    },

    _requestRoutesSucceeded: function(response, io){
       
        var routeSelect = document.getElementById("mySelect");
        var routeArray;
        for (i = 0; i < response.length; i++) { 
          //console.log(response[i].id);

           var opt = document.createElement("option");
           opt.value= response[i].id;
           opt.innerHTML = response[i].id; // whatever property it has
           routeArray += response[i].id + ",";
           // then append it to the select element
           routeSelect.appendChild(opt);

           //_this.retrieveNextbusRouteExtent(response[i].id);

        }
        //console.log("route count: " + i);
        //console.log(routeArray);
        if (_this.queryObject && _this.queryObject.route){
          $("#mySelect" ).val(_this.queryObject.route);
        }
        //else
        //  $("#mySelect" ).val(100);

        /*
        array.forEach(_this.routeExtents, function(graphic) {
          _this.retrieveNextbusRouteExtent(graphic);
        });*/
        //if (queryObject.stopsId)
        //    routeSelect.value = queryObject.stopsId;
       
    },

    retrieveNextbusRouteExtent: function(routeId){

         var requestHandle = esriRequest({
    "url": "http://restbus.info/api/agencies/ttc/routes/"+ routeId
        });
        requestHandle.then(function(response, io){
          console.log(response);

          //var attr = {"routeId":response[i].id};
          //var graphic = new Graphic(null,null,attr);

        }, _this.requestFailed);
    },


		retrieveNextbusVehiclePrediction: function(stopId){
      console.log(stopId);
      //http://restbus.info/api/agencies/ttc/stops/
      var requestHandle = esriRequest({
  "url": _this.restbusUrl + "/stops/"+ stopId + "/predictions"
      });
      requestHandle.then(_this.requestSucceeded, _this.requestFailed);
    },

    requestSucceeded: function(response, io){
      console.log(response);

      _this.displayVehiclePredictions(response, false, true);
     
      //jQueryCountdownTimer(0);
      //jQueryCountdownTimer(1);
      //countdown();
      //registry.byId("leftPane").innerHTML += JSON.stringify(response);
      //registry.byId("predictionsPane").set("content", JSON.stringify(response));
  	},
    displayVehiclePredictions: function(response, includeStopId, showRefresh){
      
      if (showRefresh)
        domUtils.show(dom.byId("refresh")); 

      domUtils.show(dom.byId("favorite"));

      var content = _this.cp.get("content");
      
      //var content = registry.byId("leftPane").get("content");
      var updatedContent = content += _this.formatNextbusPredictions(response, includeStopId);
      _this.cp.set("content", updatedContent);
      //registry.byId("leftPane").set("content", updatedContent);

      for (i = 0; i < $('[class^="timer"]').length; i++) { 
          var dude = $($('[class^="timer"]')[i]).attr('class');
          //console.log(dude);
          _this._jQueryCountdownTimer(dude);
      }

      for (i = 0; i < $('[id^="route"]').length; i++) {
          //console.log(i);
          $($('[id^="route"]')[i]).click(_this.displayVehiclesForRoute);
          //$('#myLink').click(function(){ MyFunction(); return false; });
          //on(dom.byId("25"), "click", displayVehiclesForRoute);
      }

      for (i = 0; i < $('[id^="prediction"]').length; i++) {
          //console.log(i);
          $($('[id^="prediction"]')[i]).click(_this.handleFavorite);
          //$('#myLink').click(function(){ MyFunction(); return false; });
          //on(dom.byId("25"), "click", displayVehiclesForRoute);
      }
    },
    handleFavorite: function(e){
      console.log(e);

      var point = webMercatorUtils.webMercatorToGeographic(_this.map.infoWindow.getSelectedFeature().geometry);

      var favorite = {"stopId": e.target.attributes["data-stop-id"].value,
        "stopTitle": e.target.attributes["data-stop-title"].value,
        "stopLocation": point.x + "," + point.y,
        "routeId": e.target.attributes["data-route-id"].value,
        "routeTitle": e.target.attributes["data-route-title"].value,
        "direction": e.target.attributes["data-prediction-direction"].value
      }

      console.log(favorite);

      if (!_this._isFavoriteStored_NEW(favorite.stopId, favorite.routeId))
      {
        //_this._refreshFavorites(favorite);
        _this._updateFavorites(favorite);
        //$('.esri-icon-favorites').css('color', 'yellow');
        //$(e.target).css('color', 'yellow');

        //$('.calcite-panels').removeClass("calcite-text-light");
        $(e.target).addClass("selected");
      
      }
      else
      {
        _this._removeFavorite(favorite.stopId);
         //$('.esri-icon-favorites').css('color', 'rgb(63, 166, 255)');
        //$(e.target).css('color', 'rgb(63, 166, 255)');
        $(e.target).removeClass("selected")
      }
      _this.populateFavoritesWidget();

    },
    _isFavoriteStored_NEW: function(stopId, routeId)
    {
      var isStored = false;

      if ( _this._useLocalStorage ) {
        stopFaves = window.localStorage.getItem(_this._storageName);
      } else {
        stopFaves = cookie(_this._storageName);
      }

      if (stopFaves != null)
      {
        var stopFavesJSON = JSON.parse(stopFaves);

        array.forEach(stopFavesJSON, function(favorite) {
          if (favorite.stopId === stopId && favorite.routeId === routeId)
          {
            isStored = true;
            //break;
          }
        });

        //if(stopFaves.indexOf(stopId) != -1)
        //  isStored = true
      }

      return isStored;

    },
  	displayVehiclesForRoute: function(e)
    {
      //console.log(e.target.id);
      var routeId = e.target.id.split('_')[1];
      console.log(routeId);
      _this.selectedRouteId = routeId;
      _this.stopsId = routeId;

      _this._swizzleLabelExpression(routeId, true);

      _this.map.getLayer(_this.map.graphicsLayerIds[0]).refresh();

      /*
      setTimeout(function(){
        _this.map.getLayer(_this.map.graphicsLayerIds[0]).refresh();
        _this.map.getLayer(_this.map.graphicsLayerIds[1]).refresh();
         }
      , 500);*/

    },
    _swizzleLabelExpression: function(routeId, refresh)
    {
        if (routeId === undefined) return;

        var vehicleLayer = _this.map.getLayer(_this.map.graphicsLayerIds[1]);
        
        if(routeId.length === 2)
            vehicleLayer.labelingInfo[0].labelExpressionInfo.expression = "Mid($feature.dirTag,5,3)"
        else if (routeId.length === 3)
            vehicleLayer.labelingInfo[0].labelExpressionInfo.expression = "Mid($feature.dirTag,6,4)"

        //map.getLayer(map.graphicsLayerIds[1]).labelingInfo[0].labelExpressionInfo.expression = "Mid($feature.dirTag,5,3)"
        if (refresh)
            vehicleLayer.refresh();
        //window.map.getLayer(window.map.graphicsLayerIds[1]).refresh();
    },
  	_jQueryCountdownTimer: function(index){
      var timer2 = $('.' + index).html();// "5:01";

      
      if(timer2 === undefined) return;

      var arrivalIndex = index.substring(5);

      var interval = setInterval(function() {


        var timer = timer2.split(':');
        //by parsing integer, I avoid all extra string processing
        var minutes = parseInt(timer[0], 10);
        var seconds = parseInt(timer[1], 10);
        --seconds;
        minutes = (seconds < 0) ? --minutes : minutes;
        if (minutes < 0)
        { 
          clearInterval(interval);
          $('.' + index).css("color", "red");
          $('.arrival' + arrivalIndex).css("color", "red");
        }
        else
        {
            if (minutes < 2)
            {
              $('.' + index).css("color", "orange");
              //$('.arrival' + arrivalIndex).css("color", "orange");
            }
            else
            {
              $('.' + index).css("color", "green");
              //$('.arrival' + arrivalIndex).css("color", "green");

            }

            seconds = (seconds < 0) ? 59 : seconds;
            seconds = (seconds < 10) ? '0' + seconds : seconds;
            //minutes = (minutes < 10) ?  minutes : minutes;
            $('.' + index).html(minutes + ':' + seconds);
            timer2 = minutes + ':' + seconds;
        }
      }, 1000);
    },
  	formatNextbusPredictions: function(predictions, includeStopTitle)
    {
      var content = "";
      //var j = 0;

      //content +="<br><a href='javascript:void(0);' id='refresh' class='nav' style='text-decoration:none;'>Refresh</a><br>";
      var closestStopId = predictions[0].stop.id;

      if (includeStopTitle === true)
        content += "<span class='header'>" + predictions[0].stop.title + "</span>";

      array.forEach(predictions, function(prediction) {
         
         console.log(prediction.stop.id + "," + prediction.route.title);
         if (prediction.stop.id === closestStopId)
         {
           //content +="<br><a href='javascript:void(0);' id='route_" + prediction.route.id + "' class='nav' style='text-decoration:none;'>Map It</a>&nbsp;<b><span style='font-size:large'>" + prediction.route.title + "</span></b>";
           //<span class="esri-icon-left-triangle-arrow" aria-hidden="true"></span>
           //var isFavoriteStore = _this._isFavoriteStored_NEW(prediction.stop.id, prediction.route.id)
           var color = (_this._isFavoriteStored_NEW(prediction.stop.id, prediction.route.id)) ? " selected": ""; //"yellow": "rgb(63, 166, 255)"
           
           content +="<hr><a href='javascript:void(0);'><span class='esri-icon-favorites" + color + "' data-stop-id='" + prediction.stop.id +"' data-stop-title='" + prediction.stop.title +"' data-route-id='" + prediction.route.id +"' data-route-title='" + prediction.route.title +"' title='favorite'  id='prediction_" + prediction.route.id + "'></span></a><a href='javascript:void(0);'><span class='esri-icon-applications' data-toggle='tooltip' title='Show on map' style='font-size:x-large;text-decoration:none;' id='route_" + prediction.route.id + "'></span></a>&nbsp;<span style='font-size:large'>" + prediction.route.title + "</span>";
           var i = 0;
           array.forEach(prediction.values, function(value) {
            
            //console.log(Date(value.epochTime));
            if(i < 2)
            {
                
                var pos = content.lastIndexOf("data-route-id");
                content = [content.slice(0, pos), "data-prediction-direction='" + value.direction.title + "'", content.slice(pos)].join('');
                 //var output
                //content += "<br>" + value.direction.title;
                content += "<div>" + value.direction.title + "</div>" ;
                var t = new Date(value.epochTime);
                //t.setSeconds(t.getSeconds() + value.seconds);

                //var minutes = Math.floor(value.seconds / 60);
                //var seconds = value.seconds - minutes * 60;
                var nextArrival = _this._secondsToHms(value.seconds);

                if(value.epochTime !== null)
                  content += "<span class='arrival" + _this.j + "'>" + t.toLocaleTimeString() + "</span>"; 
                content += "<div style='font-size:xx-large' class='timer" + value.branch + "_" + _this.j + "'>" + nextArrival + "</div>";
                //countdown(j, value.minutes, value.seconds);
                //jQueryCountdownTimer(j);
                _this.j++;


                //value.seconds; 
            }
            i++;
            //content += "<br>" + Date(value.epochTime).toLocaleString().split(' ')[4];
           });
           //content += "<hr>";
         }

      });

      return content;
      //return JSON.stringify(predictions);
    },

    _secondsToHms: function(d) {
        d = Number(d);

        //var h = Math.floor(d / 3600);
        var m = Math.floor(d % 3600 / 60);
        var s = Math.floor(d % 3600 % 60);

        return `00${m}`.slice(-2) + ":" + `00${s}`.slice(-2);
    },

  	requestFailed: function(error, io){
        console.log(error);
    },



		displayPopupContent: function (feature){
      if(feature){
      	_this.openPanel("#panelInfo");
        var content = feature.getContent();
        _this.cp.set("content", content);

        if (_this._isFavoriteStored(feature.attributes["stopId"]))
        {
          $('.esri-icon-favorites').css('color', 'yellow');
        }
        else
        {
          $('.esri-icon-favorites').css('color', 'rgb(63, 166, 255)');
        }  
          //registry.byId("leftPane").set("content", content);
          
      }
    },
    clearContent: function(){
       //dom.byId replaces dojo.byId
      dom.byId("featureCount").innerHTML = "Click on map to select stops(s)";
      //registry.byId replaces dijit.byId
      _this.cp.set("content", "");
      domUtils.hide(dom.byId("pager"));
      domUtils.hide(dom.byId("refresh"));
    },
    openPanel: function(panelName){
      var panel = query(panelName);
      panelBody = query(panel).query(".panel-collapse");
      
      if (!domClass.contains(panel[0], "in")) {
        // Close panels
        panels = query(panel).parent().query(".panel.in");
        panels.collapse("hide");
        // Close bodies
        query(panels).query(".panel-collapse").collapse("hide");
        // Show panel
        panel.collapse("show");
        // Show body
        query(panelBody[0]).collapse("show");
      } 

    },
    _openPanel: function(){
    	
    	query(".calcite-panels >").removeClass("in"); 
      query("#panelInfo").addClass("collapse in");
      query("#collapseInfo").addClass("collapse in");
      query("#panelInfo").style("height", "auto");
      query("#collapseInfo").style("height", "auto");


      $($('.panel-label')[0]).removeClass("visible-mobile-only");
			$($('.panel-close')[0]).removeClass("visible-mobile-only");

			/*
      var panel = query("#panelInfo");
      panelBody = query(panel).query(".panel-collapse");
      
	     if (!domClass.contains(panel[0], "in")) {
	        // Close panels
	        panels = query(panel).parent().query(".panel.in");
	        panels.collapse("hide");
	        // Close bodies
	        query(panels).query(".panel-collapse").collapse("hide");
	        // Show panel
	        panel.collapse("show");
	        // Show body
	        query(panelBody[0]).collapse("show");
	      } 
	      */

    },
   _myCallbackFunction: function(ioArgs) {
		// inspect ioArgs
	    if (ioArgs.url.indexOf("vehicles/query") > -1)
	    {
	        
	        if (_this.selectedRouteId !== undefined)
	        {
	            var parts = ioArgs.url.split('/');
	            var routePart = parts[5];
	            ioArgs.url = ioArgs.url.replace(routePart, _this.selectedRouteId + "_vehicles");
	        }
	        
	        //console.log(ioArgs.url, ioArgs.content);
	        //ioArgs.url = "http://localhost:8080/ttc/FeatureServer/25_vehicles/query"

	    }

	    if (ioArgs.url.indexOf("stops/query") > -1)
	    {
	        
	        if (_this.stopsId !== undefined)
	        {
	            var parts = ioArgs.url.split('/');
	            var routePart = parts[5];
	            ioArgs.url = ioArgs.url.replace(routePart, _this.stopsId + "_stops");
	        }
	        
	        //console.log(ioArgs.url, ioArgs.content);
	        //ioArgs.url = "http://localhost:8080/ttc/FeatureServer/25_vehicles/query"

	    }

	    // or, change some query parameters if necessary
	    //ioArgs.content = ioArgs.content || {};
	    //ioArgs.content.token = "ABCDEF123456";

	    // don't forget to return ioArgs.
	    return ioArgs;
	  }

	});

	return ArcRocket;

});
