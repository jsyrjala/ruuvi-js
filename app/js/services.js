'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('ruuvitracker.services', []).
  value('version', '0.1').
  value('mapService', new MapService()).
  value('storageService', new StorageService());
