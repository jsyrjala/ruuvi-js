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


var TrackerService = function() {
    // TODO configure
    var baseUrl = 'http://198.61.201.6:8000/api/v1-dev/';

    this.listTrackers = function(success, error) {
        ajaxGet(baseUrl + "trackers", {}, success, error);
    }

    this.getEvents = function(trackerId, sinceTimestamp, success, error) {
        var resultsSince = "";
        if(sinceTimestamp) {
            resultsSince = "storeTimeStart=" + Math.round(sinceTimestamp.getTime() / 1000);
        }
        var url = baseUrl + "trackers/" + trackerId + "/events?" + resultsSince;
        ajaxGet(url, {}, success, error);
    };

    this.createTracker = function(name, code, sharedSecret, demoPassword, success, error) {
        var message = {tracker: {name: name, code: code, shared_secret: sharedSecret}};
        var url = baseUrl + "trackers";
        ajaxPost(url, message, success, error);
    };

};


var TrackerStorage = function() {

    var trackers = {};
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

    var convertEvent = function(event) {
        if(event.event_time) {
            event.event_time = new Date(event.event_time);
        }
        if(event.store_time) {
            event.store_time = new Date(event.store_time);
        }
    };

    var addEvent = function(event) {
        convertEvent(event);
        var trackerId = event.tracker_id;
        var sessionId = event.event_session_id;
        var eventId = event.id;
        ensureStructure(trackerId, sessionId);
        trackers[trackerId].sessions[sessionId].events.push(event);
        var storeTime = event.store_time;
        
        if(!trackers[trackerId].latestStoreTime || storeTime > trackers[trackerId].latestStoreTime) {
            trackers[trackerId].latestStoreTime = storeTime;
        }
    }

    var dedup = function(session) {
        var tmp = _.uniq(session.events, false, function(x) { return x.id });
        tmp.sort(function(a, b) {
            return a.event_time < b.event_time;
        });
    }

    var updateTracker = function(trackerId, callback) {
        // TODO use injecting
        var service = new TrackerService();
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
        service.getEvents(trackerId, trackers[trackerId].latestStoreTime, success);            
    };

    this.fetchTracker = function(trackerId, state) {
        ensureStructure(trackerId);
        trackers[trackerId].fetch = state;
        if(state) {
            this.pollTrackerEvents(trackerId);
        } else {
            window.clearTimeout(trackers[trackerId].poller);
            trackers[trackerId].poller = undefined;
        }
    };

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

    this.pollTrackersAutomatically = function() {
        var trackerIds = Object.keys(trackers);
        var self = this;
        _.each(trackerIds, function(trackerId) {
            if(trackers[trackerId].fetch) {
                console.log("Start fetching data for tracker " + trackerId);
                self.pollTrackerEvents(trackerId);
            }
        });
    }
};
