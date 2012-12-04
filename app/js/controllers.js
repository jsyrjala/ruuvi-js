'use strict';

function updateNavi($location, pageClass) {
    $('ul.nav li').removeClass('active')
    var curr = $('.' + pageClass);
    curr.addClass("active");
}

/* Controllers */
function DefaultCtrl($scope, $log, $location) {
    updateNavi($location, 'page-link-help');
}
DefaultCtrl.$inject = ['$scope', '$log', '$location'];

function FrontCtrl($location) {
    updateNavi($location, 'page-link-index');
}
FrontCtrl.$inject = ['$location'];

function MapCtrl($location) {
    updateNavi($location, 'page-link-map');
}
MapCtrl.$inject = ['$location'];

function TrackersListCtrl($location) {
    updateNavi($location, 'page-link-trackers');
}
TrackersListCtrl.$inject = ['$location'];

function CreateTrackerCtrl($location) {
    updateNavi($location, 'page-link-trackers');
}
CreateTrackerCtrl.$inject = ['$location'];

function ErrorCtrl($scope) {}
ErrorCtrl.$inject = [];

function DebugCtrl($location) {
    updateNavi($location, 'page-link-trackers');
}
DebugCtrl.$inject = ['$location'];

