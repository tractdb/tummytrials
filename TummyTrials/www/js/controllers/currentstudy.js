(angular.module('tummytrials.currentstudy',['ionic'])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
	.state('no_study', {
      url: 'current/no_study',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/no_study.html',
          controller: 'setupcontroller'
        }
      }
    })    
  .state('during', {
      url: 'current/during',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/during.html',
          controller: 'setupcontroller'
        }
      }
    })     
  .state('post', {
      url: 'current/post',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/post.html',
          controller: 'setupcontroller'
        }
      }
    }) 
  .state('notes', {
      url: 'current/notes',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/notes.html',
          controller: 'setupcontroller'
        }
      }
    }) 
    .state('neg_compliance', {
      url: 'current/during/neg_compliance',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/neg_compliance.html',
          controller: 'setupcontroller'
        }
      }
    }) 
    .state('pos_compliance', {
      url: 'current/during/pos_compliance',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/pos_compliance.html',
          controller: 'setupcontroller'
        }
      }
    }) 

  })
);