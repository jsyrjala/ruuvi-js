'use strict';

/* Services */

// service => new instance will be created (stateless service)

angular.module('ruuvitracker.services', []).
    constant('version', '0.1').
    constant('configuration', new Configuration()).
    factory('mapService', ['configuration', 'storageService', 
                           function(configuration, storageService) {  
                               return new MapService(configuration, storageService); 
                           }] ).
    factory('trackerStorage', ['storageService', 'trackerService', 'mapService',
                               function(storageService, trackerService, mapService) {
                                   return new TrackerStorage(storageService, trackerService, mapService);
                              }] ).
    factory('trackerService', ['configuration', 
                               function(configuration) {
                                   return new TrackerService(configuration);
                               }] ).
    service('soundService', SoundService).
    service('storageService', StorageService).
    service('geoCodingService', GeoCodingService)
;
