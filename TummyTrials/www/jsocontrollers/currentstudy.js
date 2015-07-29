(angular.module('tummytrials.currentstudy',['ionic'])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
	.state('no_study', {
      url: '/no_study',
      views: {
        settings : {
          templateUrl: 'templates/currenttrial/no_study.html',
          controller: 'setupcontroller'
        }
      }
    })    
    

  })

);