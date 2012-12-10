'use strict';

var ajaxGet = function(url, data, success, error) {
    jQuery.getJSON(url, data, success).fail(error);
}

var ajaxPost = function(url, data, success, error) {
    var params = {type: "POST",
                  data: JSON.stringify(data),
                  processData: false,
                  contentType: "application/json",
                  success: success,
                  error: error
                 };
    jQuery.ajax(url, params).done(success).fail(error);
}

var GeoCodingService = function() {
    var addressUrl = 'http://nominatim.openstreetmap.org/search';
    var locationUrl = 'http://nominatim.openstreetmap.org/reverse';

    /* reverse geocode: address -> {display_name: "", icon: "",
    location: LatLng} */
    this.searchLocation = function(address, success, error) {
        var params = {q: address, format: "json"};
        ajaxGet(addressUrl, params, success, error);
    }

    this.searchAddress = function(location, success, error) {
        var params = {lat: location.lat, lon: location.lng, format: "json"};
        ajaxGet(locationUrl, params, success, error);
    }
};

// TODO inject jquery/ajax thingy
var TrackerService = function(configuration) {
    this.listTrackers = function(success, error) {
        ajaxGet(configuration.ruuvitracker.url + "trackers", {}, success, error);
    }

    this.getEvents = function(trackerId, sinceTimestamp, success, error) {
        var resultsSince = "";
        if(sinceTimestamp) {
            // TODO should use decimals for millisecs and round up
            resultsSince = "storeTimeStart=" + Math.ceil(sinceTimestamp.getTime() / 1000);
        }
        var url = configuration.ruuvitracker.url + "trackers/" + trackerId + "/events?" + resultsSince;
        ajaxGet(url, {}, success, error);
    };

    this.createTracker = function(name, code, sharedSecret, demoPassword, success, error) {
        var message = {tracker: {name: name, code: code, shared_secret: sharedSecret}};
        var url = configuration.ruuvitracker.url + "trackers";
        ajaxPost(url, message, success, error);
    };

    function generateMACBaseString(message) {
        var keys = [];
        for(var key in message) {
	    keys.push(key);
        }
        keys.sort();
        var base = "";
        for(var i = 0; i < keys.length; i ++) {
	    var key = keys[i];
	    base += key + ":" + message[key] +"|"
        }
        return base;
    }
 
    function generateMAC(message, sharedSecret) {
        var messageBase = generateMACBaseString(message);
        var hash = CryptoJS.HmacSHA1(messageBase, sharedSecret);
        return hash.toString(CryptoJS.enc.Hex);
    }

    function generateJsonMessage(trackerCode, sharedSecret, session, position, message) {
        // generate on first request, and keep it same for rest of the
        // session
        var timestamp = position.timestamp ? new Date(position.timestamp) : new Date();
        var trackerMessage = {
	    version: 1,
	    tracker_code: trackerCode,
	    time: timestamp.toISOString(),
	    session_code: session
        };
        if(message) {
	    trackerMessage["X-message"] = message;
        }
        
        function addField(srcObject, destObject, srcField, destField) {
	    if(srcObject[srcField]) {
	        destObject[destField] = "" + srcObject[srcField];
	    }
        }
        if(position && position.coords) {
            // Geolocation API
	    var c = position.coords;
	    addField(c, trackerMessage, "latitude", "latitude");
	    addField(c, trackerMessage, "longitude", "longitude");
	    // TODO wrong format, decimal expected in server
            //addField(c, trackerMessage, "altitude", "altitude");
	    addField(c, trackerMessage, "accuracy", "accuracy");
	    addField(c, trackerMessage, "heading", "heading");
	    addField(c, trackerMessage, "speed", "speed");
	    addField(c, trackerMessage, "altitudeAccuracy", "altitudeAccuracy");
        } else if(position.latlng) {
            // leaflet api
	    addField(position.latlng, trackerMessage, "lat", "latitude");
	    addField(position.latlng, trackerMessage, "lng", "longitude");
	    addField(position.accuracy, trackerMessage, "accuracy", "accuracy");
        }
        trackerMessage.mac = generateMAC(trackerMessage, sharedSecret);
        return trackerMessage;
    }

    var session = "" + new Date().getTime();
    this.sendEvent = function(event) {
        var trackerCode = "foobar";
        var sharedSecret = "foobar";

        var message = generateJsonMessage(trackerCode, sharedSecret, session, event);
        var url = configuration.ruuvitracker.url + "events";
        ajaxPost(url, message, function(e) {
            console.log("Sent message to tracker server");
        });
    }
};


// TODO most of this belongs probably to $rootScope
var TrackerStorage = function(storageService, trackerService, mapService) {

    var trackers = {};
    //trackers.lastTrackerQuery = undefined;

    // TODO used to convert several object types
    var convertData = function(obj) {
        if(obj.created_on) {
            obj.created_on = new Date(obj.created_on);
        }
        if(obj.event_time) {
            obj.event_time = new Date(obj.event_time);
        }
        if(obj.store_time) {
            obj.store_time = new Date(obj.store_time);
        }
        if(obj.latest_activity) {
            obj.latest_activity = new Date(obj.latest_activity);
        }
        var location = obj.location;
        if(location && location.latitude && location.longitude) {
            obj.latlng = new L.LatLng(location.latitude, location.longitude);
            delete obj.location.latitude;
            delete obj.location.longitude;
        }
    };

    var ensureStructure = function(trackerId, sessionId) {
        if(!trackerId) {
            return;
        }
        if(!trackers[trackerId]) {
            trackers[trackerId] = {};
            trackers[trackerId].sessions = {};
            trackers[trackerId].fetch = false;
            trackers[trackerId].poller = undefined;
        }
        if(!sessionId) {
            return;
        }
        if(!trackers[trackerId].sessions[sessionId]) {
            trackers[trackerId].sessions[sessionId] = {};
            trackers[trackerId].sessions[sessionId].events = [];
        }
    }

    var addTracker = function(tracker) {
        convertData(tracker);
        var trackerId = tracker.id;
        ensureStructure(trackerId);
        trackers[trackerId].tracker = tracker;
    }

    var addSession = function(session) {
        var trackerId = session.tracker_id;
        var sessionId = session.id;
        ensureStructure(trackerId, sessionId);
        trackers[trackerId].sessions[sessionId].session = session;
    }

    var addEvent = function(event) {
        convertData(event);
        var trackerId = event.tracker_id;
        var sessionId = event.event_session_id;
        var eventId = event.id;
        ensureStructure(trackerId, sessionId);
        trackers[trackerId].sessions[sessionId].events.push(event);
        var storeTime = event.store_time;
        
        if(!trackers[trackerId].latestStoreTime || storeTime > trackers[trackerId].latestStoreTime) {
            trackers[trackerId].latestStoreTime = storeTime;
        }

        mapService.eventReceived(event);
    }

    var dedup = function(session) {
        var tmp = _.uniq(session.events, false, function(x) { return x.id });
        tmp.sort(function(a, b) {
            return a.event_time < b.event_time;
        });
    }

    var updateTracker = function(trackerId, callback) {
        var success = function(data) {
            var sessionIdMap = {};
            var dataReceived = false;
            for(var k = 0; k < data.events.length; k ++) {
                var event = data.events[k];
                addEvent(event);
                sessionIdMap[event.event_session_id] = 1;
                dataReceived = true;
            }
            
            var sessionIds = Object.keys(sessionIdMap);
            
            _.each(sessionIds, function(sessionId) {
                dedup(trackers[trackerId].sessions[sessionId]);
            });

            callback(trackerId, dataReceived);
        }
        ensureStructure(trackerId);
        trackerService.getEvents(trackerId, trackers[trackerId].latestStoreTime, success);            
    };

    /** Fetch trackers, store them to memory and return reference to memory */
    this.listTrackers = function(dataFetchedCallback) {
        // TODO check how recent data is
        function callback(data) {
            console.log("Found " + data.trackers.length + " trackers");
            _.each(data.trackers, addTracker);
            dataFetchedCallback();
        };
        trackerService.listTrackers(callback);
        return trackers;
    }

    this.fetchTrackerEvents = function(trackerId, state) {
        ensureStructure(trackerId);
        trackers[trackerId].fetch = state;
        if(state) {
            this.pollTrackerEvents(trackerId);
        } else {
            window.clearTimeout(trackers[trackerId].poller);
            trackers[trackerId].poller = undefined;
        }
        this.backupSelectedTrackers();
    };

    this.backupSelectedTrackers = function() {
        var selected = {};
        for(var trackerId in trackers) {
            if(trackers[trackerId].fetch) {
                selected[trackerId] = 1;
            }
        }
        storageService.store('selected-trackers', selected);
    }

    this.restoreSelectedTrackers = function() {
        var selectedTrackers = storageService.fetch('selected-trackers', {});
        for(var trackerId in selectedTrackers) {
            ensureStructure(trackerId);
            trackers[trackerId].fetch = true;
            this.pollTrackerEvents(trackerId);
        }
    }

    this.pollTrackerEvents = function(trackerId) {
        if(trackers[trackerId].poller) {
            // already polling this tracker
            return;
        }
        // Polling frequency is slower when there was no data
        // received
        function callback(trackerId, dataReceived) {
            if(!trackers[trackerId].fetch){
                return;
            }
            if(dataReceived) {
                console.log("Data was received for tracker " + trackerId);
                trackers[trackerId].poller = setTimeout(function() {
                    updateTracker(trackerId, callback);
                }, 400);
            } else {
                console.log("No data was received for tracker " + trackerId);
                trackers[trackerId].poller = setTimeout(function() {
                    updateTracker(trackerId, callback);
                }, 10000);
            }
        };
        updateTracker(trackerId, callback);
    };

}
