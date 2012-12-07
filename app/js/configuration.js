'use strict';

var Configuration = function() {
    this.google = {};
    this.google.analyticsId = 'UA-3439345-5'; 
    this.ruuvitracker = {};
    this.ruuvitracker.url = 'http://198.61.201.6:8000/api/v1-dev/'
    // center of Helsinki
    this.defaultLocation = new L.LatLng(60.168564, 24.941111);
    this.defaultZoom = 13;
};
