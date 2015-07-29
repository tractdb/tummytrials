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
  .state('during', {
      url: '/during',
      views: {
        settings : {
          templateUrl: 'templates/currenttrial/during.html',
          controller: 'setupcontroller'
        }
      }
    })     
  .state('post', {
      url: '/post',
      views: {
        settings : {
          templateUrl: 'templates/currenttrial/post.html',
          controller: 'setupcontroller'
        }
      }
    }) 
  })

);