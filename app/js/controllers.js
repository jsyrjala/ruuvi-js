'use strict';

function updateNavi($location, pageClass) {
    $('ul.nav li').removeClass('active')
    var curr = $('.' + pageClass);
    curr.addClass("active");
}

/* Controllers */
function DefaultCtrl($scope, $location) {
    updateNavi($location, 'page-link-help');
}
DefaultCtrl.$inject = ['$scope', '$location'];

function FrontCtrl($scope, $location) {
    updateNavi($location, 'page-link-index');
}
FrontCtrl.$inject = ['$scope', '$location'];

function MapCtrl($scope, $location, mapService) {
    updateNavi($location, 'page-link-map');
    mapService.open("map-canvas");
}
MapCtrl.$inject = ['$scope', '$location', 'mapService'];

function TrackersListCtrl($scope, $location) {
    updateNavi($location, 'page-link-trackers');
}
TrackersListCtrl.$inject = ['$scope', '$location'];

function CreateTrackerCtrl($scope, $location) {
    updateNavi($location, 'page-link-trackers');
}
CreateTrackerCtrl.$inject = ['$scope', '$location'];

function ErrorCtrl($scope) {}
ErrorCtrl.$inject = [];

function DebugCtrl($scope, $location) {
    updateNavi($location, 'page-link-trackers');
}
DebugCtrl.$inject = ['$scope', '$location'];

