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

function MapCtrl($scope, $location, mapService, geoCodingService, soundService) {
    updateNavi($location, 'page-link-map');

    mapService.open("map-canvas");
    $scope.locate = function(address) {
        console.log("locate:", address);
        if(!address) {
            return;
        }
        // show result closest to current map location
        // TODO improve, finds funny results
        var showClosest = function(data) {
            var currentLocation = mapService.currentCenter();
            console.log("locate found " + data.length + " results");
            if(!data || !data.length) {
                return;
            }
            var sorted = _.sortBy(data, function(item) {
                return currentLocation.distanceTo(new L.LatLng(item.lat, item.lon));
            })
            var closest = sorted[0];
            var closestLoc = new L.LatLng(closest.lat, closest.lon);
            console.log("Show " + closest.display_name + " (" + closestLoc + ")");
            soundService.playPing();
            if(closest.boundingbox) {
                var sw = new L.LatLng(closest.boundingbox[0], closest.boundingbox[2])
                var ne = new L.LatLng(closest.boundingbox[1], closest.boundingbox[3])
                var bounds = new L.LatLngBounds(sw, ne);
                mapService.centerBounds(bounds);
            } else {
                mapService.center(closestLoc);
            }
        };
        
        geoCodingService.searchLocation(address, showClosest);
    };
}
MapCtrl.$inject = ['$scope', '$location', 'mapService', 'geoCodingService', 'soundService'];

function TrackersListCtrl($scope, $location, soundService) {
    updateNavi($location, 'page-link-trackers');
}
TrackersListCtrl.$inject = ['$scope', '$location', 'soundService'];

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

