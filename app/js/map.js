'use strict';

var MapService = function() {
    // center of Helsinki
    var defaultLocation = new L.LatLng(60.168564, 24.941111);
    var defaultZoom = 13;
    var mapView = undefined;
    var selfLocation = undefined;
    var selfMarker = undefined;

    // TODO use injecting
    var storageService = new StorageService();

    var createOsmTiles = function() {
        console.log("createTiles:");
        var url = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        var opts = {attribution: "Map data &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors, <a href='http://creativecommons.org/licenses/by-sa/2.0/'>CC-BY-SA</a>",
                    maxZoom: 18};
        return new L.TileLayer(url, opts);
    };

    var storeMapState = function() {
        console.log("storeMapState:");
        var zoom = mapView.getZoom();
        var location = mapView.getCenter();
        var data = {zoom: zoom, 
                    lat: location.lat,
                    lng: location.lng,
                    timestamp: new Date().getTime()};
        storageService.store("map-location", data);
    };

    var updateMarker = function(marker, newLocation, options) {
        if(!newLocation) {
            return marker;
        }
        if(!marker) {
            var newMarker = new L.Marker(newLocation, options);
            newMarker.addTo(mapView);
            return newMarker;
        }
        marker.setLatLng(newLocation);
        marker.update();
        return marker;
    };

    /* Use stored location if it is newer than timeoutSeconds, otherwise use
       default location. */
    var loadInitialLocation = function(map, location, timeoutSeconds) {
        console.log("loadInitialLocation:", location);
        var data = storageService.fetch("map-location");
        var zoom = defaultZoom;
        // TODO error handling for corrupt data
        if(data) {
            console.log("found existing data", data);
            var now = new Date().getTime();
            if(data.timestamp && (now - (timeoutSeconds * 1000) < data.timestamp) ) { 
                location = new L.LatLng(data.lat, data.lng);
                zoom = data.zoom;
            }
        }
        map.setView(location, zoom || defaultZoom);
    }

    var updateSelfLocation = function(newLocation, accuracy) {
        // accuracy in meters. 
        // TODO draw accuracy circle?
        console.log("updateSelfLocation:", newLocation);
        selfLocation = newLocation;
        selfMarker = updateMarker(selfMarker, newLocation);
    };

    var startLocating_internal = function(map) {
        console.log("startLocating:");
        var opts = {timeout: 10000,
                    maximumAge: 10000,
                    enableHighAccuracy: true,
                    watch: true};
        map.locate(opts);
    };

    var create = function(canvasId, startLocation) {
        console.log("create:" + canvasId);
        var tiles = createOsmTiles();
        var map = new L.Map(canvasId, {zoom: defaultZoom});
        map.addLayer(tiles);

        map.on("locationfound", function(event) {
            updateSelfLocation(event.latlng, event.accuracy);
        });
        map.on("locationerror", function(event) {
            console.log("location error", e);
        });
        var hour = 60 * 60;
        loadInitialLocation(map, startLocation, hour);
        map.on("zoomend", storeMapState);
        map.on("moveend", storeMapState);

        startLocating_internal(map);
        return map;
    };

    var redisplay = function(canvasId) {
        console.log("redisplay:" + canvasId);
        var oldContainer = mapView.getContainer();
        var newContainer = $('#' + canvasId);
        newContainer.replaceWith(oldContainer);
    };

    /* Open existing map or create new */
    this.open = function(canvasId, startLocation) {
        console.log("open:" + canvasId);
        if(mapView) {
            redisplay(canvasId);
        } else {
            mapView = create(canvasId, startLocation || defaultLocation);
        }
    };
    
    /* Center location of current map view */
    this.currentCenter = function() {
        return mapView.getCenter();
    }

    /* Center map on given location */
    this.center = function(location, zoom) {
        console.log("center:" + location + "," + zoom);
        mapView.setView(location, zoom || defaultZoom);
    };

    /* Center map on give LatLngBounds object */
    this.centerBounds = function(bounds) {
        console.log("centerBounds:" + bounds);
        mapView.fitBounds(bounds);
    }

    /* Center map on current self location */
    this.locate = function() {
        console.log("locate:");
        if(selfLocation) {
            this.center(selfLocation, 18);
        }
    };

    /* Start tracking current location */
    this.startLocating = function() {
        return startLocating_internal(this.mapView);
    };
    
    /* Stop tracking current location */
    this.stopLocating = function() {
        console.log("stopLocating:");
        mapView.stopLocate();
    };

};
