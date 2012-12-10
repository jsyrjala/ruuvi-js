'use strict';

var MapService = function(configuration, storageService, trackerService) {
    var mapView = undefined;
    var selfLocation = undefined;
    var selfMarker = undefined;

    var paths = {};

    // TODO use injecting
    //var storageService = new StorageService();
    //var configuration = new Configuration();

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
        var zoom = configuration.defaultZoom;
        // TODO error handling for corrupt data
        if(data) {
            console.log("found existing data", data);
            var now = new Date().getTime();
            if(data.timestamp && (now - (timeoutSeconds * 1000) < data.timestamp) ) { 
                location = new L.LatLng(data.lat, data.lng);
                zoom = data.zoom;
            }
        }
        map.setView(location, zoom || configuration.defaultZoom);
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
        var map = new L.Map(canvasId, {zoom: configuration.defaultZoom});
        map.addLayer(tiles);
        // TODO use geolocation api instead
        // leaflet api loses information
        map.on("locationfound", function(event) {
            console.log("location found", event);
            trackerService.sendEvent(event);
            updateSelfLocation(event.latlng, event.accuracy);
        });
        map.on("locationerror", function(event) {
            console.log("location error", event);
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
            mapView = create(canvasId, startLocation || configuration.defaultLocation);
        }
    };
    
    /* Center location of current map view */
    this.currentCenter = function() {
        return mapView.getCenter();
    }

    /* Center location of map around latest user position (if
       available) */
    this.centerOnSelf = function() {
        console.log("centerOnSelf:");
        if(selfLocation) {
            this.center(selfLocation, mapView.getZoom());
        }
    }

    /* Center map on given location */
    this.center = function(location, zoom) {
        console.log("center:" + location + "," + zoom);
        mapView.setView(location, zoom || configuration.defaultZoom);
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

    this.eventReceived = function(event) {
        if(!event.latlng) {
            // not every event has a location
            return;
        }
        var trackerId = event.tracker_id;
        var sessionId = event.event_session_id;
        if(!paths[trackerId]) {
            paths[trackerId] = {};
        }
        if(!paths[trackerId][sessionId]) {
            paths[trackerId][sessionId] = {};
        }
        var session = paths[trackerId][sessionId];
        if(!session.path) {
            console.log("Create new path");
            session.path = new L.Polyline([event.latlng]);
        } else {
            session.path.addLatLng(event.latlng);
        }

        if(mapView) {
            session.path.addTo(mapView);
        }
    }
};
MapService.$inject = ['configuration'];
