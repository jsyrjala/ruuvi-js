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
        console.log("listTrackers:");
        ajaxGet(baseUrl + "trackers", {}, success, error);
    }

    this.getEvents = function(trackerId, sinceTimestamp, success, error) {
        console.log("getTrackers:");
        var resultsSince = "";
        if(sinceTimestamp) {
            resultsSince = "storeTimeStart=" + sinceTimestamp;
        }
        var url = baseUrl + "trackers/" + trackerId + "/events?" + resultsSince;
        ajaxGet(url, {}, success, error);
    };

    this.createTracker = function(name, code, sharedSecret, demoPassword, success, error) {
        console.log("createTracker:");
        var message = {tracker: {name: name, code: code, shared_secret: sharedSecret}};
        var url = baseUrl + "trackers";
        ajaxPost(url, message, success, error);
    };

};


